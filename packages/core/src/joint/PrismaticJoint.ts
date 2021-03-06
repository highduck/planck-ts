import {Joint, JointDef} from "../Joint";
import {Rot} from "../common/Rot";
import {Vec2} from "../common/Vec2";
import {Settings} from "../Settings";
import {MathUtil} from "../common/Math";
import {Mat22} from "../common/Mat22";
import {Mat33} from "../common/Mat33";
import {Vec3} from "../common/Vec3";
import {assert} from "../util/common";
import {TimeStep} from "../TimeStep";

const inactiveLimit = 0;
const atLowerLimit = 1;
const atUpperLimit = 2;
const equalLimits = 3;

/**
 * @typedef {Object} PrismaticJointDef
 *
 * Prismatic joint definition. This requires defining a line of motion using an
 * axis and an anchor point. The definition uses local anchor points and a local
 * axis so that the initial configuration can violate the constraint slightly.
 * The joint translation is zero when the local anchor points coincide in world
 * space. Using local anchors and a local axis helps when saving and loading a
 * game.
 *
 * @prop {boolean} enableLimit Enable/disable the joint limit.
 * @prop {float} lowerTranslation The lower translation limit, usually in
 *       meters.
 * @prop {float} upperTranslation The upper translation limit, usually in
 *       meters.
 * @prop {boolean} enableMotor Enable/disable the joint motor.
 * @prop {float} maxMotorForce The maximum motor torque, usually in N-m.
 * @prop {float} motorSpeed The desired motor speed in radians per second.
 *
 * @prop {Vec2} localAnchorA The local anchor point relative to bodyA's origin.
 * @prop {Vec2} localAnchorB The local anchor point relative to bodyB's origin.
 * @prop {Vec2} localAxisA The local translation unit axis in bodyA.
 * @prop {float} referenceAngle The constrained angle between the bodies:
 *       bodyB_angle - bodyA_angle.
 */
export interface PrismaticJointDef extends JointDef {
    enableLimit?: boolean;// false,
    lowerTranslation?: number;// 0.0,
    upperTranslation?: number;// 0.0,
    enableMotor?: boolean;// false,
    maxMotorForce?: number;// 0.0,
    motorSpeed?: number;// 0.0

    localAnchorA?: Vec2;
    localAnchorB?: Vec2;
    anchor?: Vec2;
    localAxisA?: Vec2;
    axis?: Vec2;
    referenceAngle?: number;
}

/**
 * A prismatic joint. This joint provides one degree of freedom: translation
 * along an axis fixed in bodyA. Relative rotation is prevented. You can use a
 * joint limit to restrict the range of motion and a joint motor to drive the
 * motion or to model joint friction.
 *
 * @param {PrismaticJointDef} def
 * @param {Body} bodyA
 * @param {Body} bodyB
 */
export class PrismaticJoint extends Joint {
    static readonly TYPE = 'prismatic-joint';

    m_localAnchorA: Vec2;
    m_localAnchorB: Vec2;
    m_localXAxisA: Vec2;
    m_localYAxisA: Vec2;
    m_referenceAngle: number;
    m_lowerTranslation: number;
    m_upperTranslation: number;
    m_maxMotorForce: number;
    m_motorSpeed: number;
    m_enableLimit: boolean;
    m_enableMotor: boolean
    m_limitState = inactiveLimit;

    m_impulse = new Vec3(0, 0, 0);
    m_motorImpulse = 0.0;
    m_axis = Vec2.zero();
    m_perp = Vec2.zero();
    m_motorMass = 0;

    // Solver temp
    m_localCenterA = Vec2.zero();
    m_localCenterB = Vec2.zero();
    m_invMassA = 0;
    m_invMassB = 0;
    m_invIA = 0;
    m_invIB = 0;
    m_s1 = 0;
    m_s2 = 0;
    m_a1 = 0;
    m_a2 = 0;
    m_K = Mat33.zero();

    constructor(def: PrismaticJointDef) {
        super(def, PrismaticJoint.TYPE);

        this.m_localAnchorA = def.anchor ? def.bodyA.getLocalPoint(def.anchor) : def.localAnchorA || Vec2.zero();
        this.m_localAnchorB = def.anchor ? def.bodyB.getLocalPoint(def.anchor) : def.localAnchorB || Vec2.zero();
        this.m_localXAxisA = def.axis ? def.bodyA.getLocalVector(def.axis) : def.localAxisA || new Vec2(1, 0);
        this.m_localXAxisA.normalize();
        this.m_localYAxisA = Vec2.crossSV(1.0, this.m_localXAxisA);
        this.m_referenceAngle = def.referenceAngle !== undefined ? def.referenceAngle : def.bodyB.getAngle() - def.bodyA.getAngle();

        this.m_lowerTranslation = def.lowerTranslation ?? 0;
        this.m_upperTranslation = def.upperTranslation ?? 0;
        this.m_maxMotorForce = def.maxMotorForce ?? 0;
        this.m_motorSpeed = def.motorSpeed ?? 0;
        this.m_enableLimit = !!def.enableLimit;
        this.m_enableMotor = !!def.enableMotor;
        this.m_limitState = inactiveLimit;

        // Linear constraint (point-to-line)
        // d = p2 - p1 = x2 + r2 - x1 - r1
        // C = dot(perp, d)
        // Cdot = dot(d, cross(w1, perp)) + dot(perp, v2 + cross(w2, r2) - v1 -
        // cross(w1, r1))
        // = -dot(perp, v1) - dot(cross(d + r1, perp), w1) + dot(perp, v2) +
        // dot(cross(r2, perp), v2)
        // J = [-perp, -cross(d + r1, perp), perp, cross(r2,perp)]
        //
        // Angular constraint
        // C = a2 - a1 + a_initial
        // Cdot = w2 - w1
        // J = [0 0 -1 0 0 1]
        //
        // K = J * invM * JT
        //
        // J = [-a -s1 a s2]
        // [0 -1 0 1]
        // a = perp
        // s1 = cross(d + r1, a) = cross(p2 - x1, a)
        // s2 = cross(r2, a) = cross(p2 - x2, a)

        // Motor/Limit linear constraint
        // C = dot(ax1, d)
        // Cdot = = -dot(ax1, v1) - dot(cross(d + r1, ax1), w1) + dot(ax1, v2) +
        // dot(cross(r2, ax1), v2)
        // J = [-ax1 -cross(d+r1,ax1) ax1 cross(r2,ax1)]

        // Block Solver
        // We develop a block solver that includes the joint limit. This makes the
        // limit stiff (inelastic) even
        // when the mass has poor distribution (leading to large torques about the
        // joint anchor points).
        //
        // The Jacobian has 3 rows:
        // J = [-uT -s1 uT s2] // linear
        // [0 -1 0 1] // angular
        // [-vT -a1 vT a2] // limit
        //
        // u = perp
        // v = axis
        // s1 = cross(d + r1, u), s2 = cross(r2, u)
        // a1 = cross(d + r1, v), a2 = cross(r2, v)

        // M * (v2 - v1) = JT * df
        // J * v2 = bias
        //
        // v2 = v1 + invM * JT * df
        // J * (v1 + invM * JT * df) = bias
        // K * df = bias - J * v1 = -Cdot
        // K = J * invM * JT
        // Cdot = J * v1 - bias
        //
        // Now solve for f2.
        // df = f2 - f1
        // K * (f2 - f1) = -Cdot
        // f2 = invK * (-Cdot) + f1
        //
        // Clamp accumulated limit impulse.
        // lower: f2(3) = max(f2(3), 0)
        // upper: f2(3) = min(f2(3), 0)
        //
        // Solve for correct f2(1:2)
        // K(1:2, 1:2) * f2(1:2) = -Cdot(1:2) - K(1:2,3) * f2(3) + K(1:2,1:3) * f1
        // = -Cdot(1:2) - K(1:2,3) * f2(3) + K(1:2,1:2) * f1(1:2) + K(1:2,3) * f1(3)
        // K(1:2, 1:2) * f2(1:2) = -Cdot(1:2) - K(1:2,3) * (f2(3) - f1(3)) +
        // K(1:2,1:2) * f1(1:2)
        // f2(1:2) = invK(1:2,1:2) * (-Cdot(1:2) - K(1:2,3) * (f2(3) - f1(3))) +
        // f1(1:2)
        //
        // Now compute impulse to be applied:
        // df = f2 - f1
    }


    /**
     * The local anchor point relative to bodyA's origin.
     */
    getLocalAnchorA() {
        return this.m_localAnchorA;
    }

    /**
     * The local anchor point relative to bodyB's origin.
     */
    getLocalAnchorB() {
        return this.m_localAnchorB;
    }

    /**
     * The local joint axis relative to bodyA.
     */
    getLocalAxisA() {
        return this.m_localXAxisA;
    }

    /**
     * Get the reference angle.
     */
    getReferenceAngle() {
        return this.m_referenceAngle;
    }

    /**
     * Get the current joint translation, usually in meters.
     */
    getJointTranslation() {
        const pA = this.m_bodyA.getWorldPoint(this.m_localAnchorA);
        const pB = this.m_bodyB.getWorldPoint(this.m_localAnchorB);
        const d = Vec2.sub(pB, pA);
        const axis = this.m_bodyA.getWorldVector(this.m_localXAxisA);

        const translation = Vec2.dot(d, axis);
        return translation;
    }

    /**
     * Get the current joint translation speed, usually in meters per second.
     */
    getJointSpeed() {
        const bA = this.m_bodyA;
        const bB = this.m_bodyB;

        const rA = Rot.mulVec2(bA.m_xf, Vec2.sub(this.m_localAnchorA, bA.m_sweep.localCenter)); // Vec2
        const rB = Rot.mulVec2(bB.m_xf, Vec2.sub(this.m_localAnchorB, bB.m_sweep.localCenter)); // Vec2
        const p1 = Vec2.add(bA.m_sweep.c, rA); // Vec2
        const p2 = Vec2.add(bB.m_sweep.c, rB); // Vec2
        const d = Vec2.sub(p2, p1); // Vec2
        const axis = Rot.mulVec2(bA.m_xf, this.m_localXAxisA); // Vec2

        const vA = bA.m_linearVelocity;
        const vB = bB.m_linearVelocity;
        const wA = bA.m_angularVelocity;
        const wB = bB.m_angularVelocity;

        const speed = Vec2.dot(d, Vec2.crossSV(wA, axis))
            + Vec2.dot(axis, Vec2.sub(Vec2.addCrossSV(vB, wB, rB), Vec2.addCrossSV(vA, wA, rA)));
        return speed;
    }

    /**
     * Is the joint limit enabled?
     */
    isLimitEnabled() {
        return this.m_enableLimit;
    }

    /**
     * Enable/disable the joint limit.
     */
    enableLimit(flag: boolean) {
        if (flag !== this.m_enableLimit) {
            this.m_bodyA.setAwake(true);
            this.m_bodyB.setAwake(true);
            this.m_enableLimit = flag;
            this.m_impulse.z = 0.0;
        }
    }

    /**
     * Get the lower joint limit, usually in meters.
     */
    getLowerLimit() {
        return this.m_lowerTranslation;
    }

    /**
     * Get the upper joint limit, usually in meters.
     */
    getUpperLimit() {
        return this.m_upperTranslation;
    }

    /**
     * Set the joint limits, usually in meters.
     */
    setLimits(lower: number, upper: number) {
        PLANCK_ASSERT && assert(lower <= upper);
        if (lower !== this.m_lowerTranslation || upper !== this.m_upperTranslation) {
            this.m_bodyA.setAwake(true);
            this.m_bodyB.setAwake(true);
            this.m_lowerTranslation = lower;
            this.m_upperTranslation = upper;
            this.m_impulse.z = 0.0;
        }
    }

    /**
     * Is the joint motor enabled?
     */
    isMotorEnabled() {
        return this.m_enableMotor;
    }

    /**
     * Enable/disable the joint motor.
     */
    enableMotor(flag: boolean) {
        this.m_bodyA.setAwake(true);
        this.m_bodyB.setAwake(true);
        this.m_enableMotor = flag;
    }

    /**
     * Set the motor speed, usually in meters per second.
     */
    setMotorSpeed(speed: number) {
        this.m_bodyA.setAwake(true);
        this.m_bodyB.setAwake(true);
        this.m_motorSpeed = speed;
    }

    /**
     * Set the maximum motor force, usually in N.
     */
    setMaxMotorForce(force: number) {
        this.m_bodyA.setAwake(true);
        this.m_bodyB.setAwake(true);
        this.m_maxMotorForce = force;
    }

    /**
     * Get the motor speed, usually in meters per second.
     */
    getMotorSpeed() {
        return this.m_motorSpeed;
    }

    /**
     * Get the current motor force given the inverse time step, usually in N.
     */
    getMotorForce(inv_dt: number) {
        return inv_dt * this.m_motorImpulse;
    }

    getAnchorA() {
        return this.m_bodyA.getWorldPoint(this.m_localAnchorA);
    }

    getAnchorB() {
        return this.m_bodyB.getWorldPoint(this.m_localAnchorB);
    }

    getReactionForce(inv_dt: number): Vec2 {
        return Vec2.combine(this.m_impulse.x, this.m_perp, this.m_motorImpulse + this.m_impulse.z, this.m_axis).mul(inv_dt);
    }

    getReactionTorque(inv_dt: number) {
        return inv_dt * this.m_impulse.y;
    }

    initVelocityConstraints(step: TimeStep) {
        this.m_localCenterA = this.m_bodyA.m_sweep.localCenter;
        this.m_localCenterB = this.m_bodyB.m_sweep.localCenter;
        this.m_invMassA = this.m_bodyA.m_invMass;
        this.m_invMassB = this.m_bodyB.m_invMass;
        this.m_invIA = this.m_bodyA.m_invI;
        this.m_invIB = this.m_bodyB.m_invI;

        const cA = this.m_bodyA.c_pos;
        const aA = this.m_bodyA.c_a;
        const vA = this.m_bodyA.c_vel;
        let wA = this.m_bodyA.c_w;

        const cB = this.m_bodyB.c_pos;
        const aB = this.m_bodyB.c_a;
        const vB = this.m_bodyB.c_vel;
        let wB = this.m_bodyB.c_w;

        const qA = Rot.forAngle(aA);
        const qB = Rot.forAngle(aB);

        // Compute the effective masses.
        // const rA = Rot.mulVec2(qA, Vec2.sub(this.m_localAnchorA, this.m_localCenterA));
        // const rB = Rot.mulVec2(qB, Vec2.sub(this.m_localAnchorB, this.m_localCenterB));
        const rA = Vec2.sub(this.m_localAnchorA, this.m_localCenterA);
        const rB = Vec2.sub(this.m_localAnchorB, this.m_localCenterB);
        Rot._mulVec2(qA, rA, rA);
        Rot._mulVec2(qB, rB, rB);

        // const d = Vec2.zero();
        // d.addCombine(1, cB, 1, rB);
        // d.subCombine(1, cA, 1, rA);
        const d = new Vec2(
            cB.x + rB.x - cA.x - rA.x,
            cB.y + rB.y - cA.y - rA.y,
        );

        const mA = this.m_invMassA;
        const mB = this.m_invMassB;
        const iA = this.m_invIA;
        const iB = this.m_invIB;

        // Compute motor Jacobian and effective mass.
        {
            Rot._mulVec2(qA, this.m_localXAxisA, this.m_axis);
            this.m_a1 = Vec2.cross(Vec2.add(d, rA), this.m_axis);
            this.m_a2 = Vec2.cross(rB, this.m_axis);

            this.m_motorMass = mA + mB + iA * this.m_a1 * this.m_a1 + iB * this.m_a2 * this.m_a2;
            if (this.m_motorMass > 0.0) {
                this.m_motorMass = 1.0 / this.m_motorMass;
            }
        }

        // Prismatic constraint.
        {
            Rot._mulVec2(qA, this.m_localYAxisA, this.m_perp);
            this.m_s1 = Vec2.cross(Vec2.add(d, rA), this.m_perp);
            this.m_s2 = Vec2.cross(rB, this.m_perp);

            // const s1test = Vec2.cross(rA, this.m_perp);

            const k11 = mA + mB + iA * this.m_s1 * this.m_s1 + iB * this.m_s2 * this.m_s2;
            const k12 = iA * this.m_s1 + iB * this.m_s2;
            const k13 = iA * this.m_s1 * this.m_a1 + iB * this.m_s2 * this.m_a2;
            let k22 = iA + iB;
            if (k22 === 0.0) {
                // For bodies with fixed rotation.
                k22 = 1.0;
            }
            const k23 = iA * this.m_a1 + iB * this.m_a2;
            const k33 = mA + mB + iA * this.m_a1 * this.m_a1 + iB * this.m_a2 * this.m_a2;

            this.m_K.ex.set(k11, k12, k13);
            this.m_K.ey.set(k12, k22, k23);
            this.m_K.ez.set(k13, k23, k33);
        }

        // Compute motor and limit terms.
        if (this.m_enableLimit) {

            const jointTranslation = Vec2.dot(this.m_axis, d); // float
            if (Math.abs(this.m_upperTranslation - this.m_lowerTranslation) < 2.0 * Settings.linearSlop) {
                this.m_limitState = equalLimits;

            } else if (jointTranslation <= this.m_lowerTranslation) {
                if (this.m_limitState != atLowerLimit) {
                    this.m_limitState = atLowerLimit;
                    this.m_impulse.z = 0.0;
                }

            } else if (jointTranslation >= this.m_upperTranslation) {
                if (this.m_limitState != atUpperLimit) {
                    this.m_limitState = atUpperLimit;
                    this.m_impulse.z = 0.0;
                }

            } else {
                this.m_limitState = inactiveLimit;
                this.m_impulse.z = 0.0;
            }

        } else {
            this.m_limitState = inactiveLimit;
            this.m_impulse.z = 0.0;
        }

        if (!this.m_enableMotor) {
            this.m_motorImpulse = 0.0;
        }

        if (step.warmStarting) {
            // Account for variable time step.
            this.m_impulse.mul(step.dtRatio);
            this.m_motorImpulse *= step.dtRatio;

            // const P = Vec2.combine(this.m_impulse.x, this.m_perp, this.m_motorImpulse + this.m_impulse.z, this.m_axis);
            const s = this.m_motorImpulse + this.m_impulse.z;
            const Px = this.m_impulse.x * this.m_perp.x + s * this.m_axis.x;
            const Py = this.m_impulse.x * this.m_perp.y + s * this.m_axis.y;

            // vA.subMul(mA, P);
            vA.x -= mA * Px;
            vA.y -= mA * Py;
            // vB.addMul(mB, P);
            vB.x += mB * Px;
            vB.y += mB * Py;

            const LA = this.m_impulse.x * this.m_s1 + this.m_impulse.y + s * this.m_a1;
            const LB = this.m_impulse.x * this.m_s2 + this.m_impulse.y + s * this.m_a2;
            wA -= iA * LA;
            wB += iB * LB;
        } else {
            this.m_impulse.setZero();
            this.m_motorImpulse = 0.0;
        }

        // this.m_bodyA.c_velocity.v.set(vA);
        this.m_bodyA.c_w = wA;
        // this.m_bodyB.c_velocity.v.set(vB);
        this.m_bodyB.c_w = wB;
    }

    solveVelocityConstraints(step: TimeStep) {
        const vA = this.m_bodyA.c_vel;
        let wA = this.m_bodyA.c_w;
        const vB = this.m_bodyB.c_vel;
        let wB = this.m_bodyB.c_w;

        const mA = this.m_invMassA;
        const mB = this.m_invMassB;
        const iA = this.m_invIA;
        const iB = this.m_invIB;

        // Solve linear motor constraint.
        if (this.m_enableMotor && this.m_limitState != equalLimits) {
            const Cdot = Vec2.dot(this.m_axis, Vec2.sub(vB, vA)) + this.m_a2 * wB
                - this.m_a1 * wA;
            let impulse = this.m_motorMass * (this.m_motorSpeed - Cdot);
            const oldImpulse = this.m_motorImpulse;
            const maxImpulse = step.dt * this.m_maxMotorForce;
            this.m_motorImpulse = MathUtil.clamp(this.m_motorImpulse + impulse,
                -maxImpulse, maxImpulse);
            impulse = this.m_motorImpulse - oldImpulse;

            const P = Vec2.mul(impulse, this.m_axis);
            const LA = impulse * this.m_a1;
            const LB = impulse * this.m_a2;

            vA.subMul(mA, P);
            wA -= iA * LA;

            vB.addMul(mB, P);
            wB += iB * LB;
        }

        const Cdot1 = new Vec2(
            +Vec2.dot(this.m_perp, vB) + this.m_s2 * wB
            - Vec2.dot(this.m_perp, vA) + this.m_s1 * wA,
            wB - wA
        );

        if (this.m_enableLimit && this.m_limitState != inactiveLimit) {
            // Solve prismatic and limit constraint in block form.
            const Cdot2 =
                +Vec2.dot(this.m_axis, vB) + this.m_a2 * wB
                - Vec2.dot(this.m_axis, vA) + this.m_a1 * wA;

            const Cdot = new Vec3(Cdot1.x, Cdot1.y, Cdot2);

            const f1 = Vec3.clone(this.m_impulse);
            let df = this.m_K.solve33(Vec3.neg(Cdot)); // Vec3
            this.m_impulse.add(df);

            if (this.m_limitState == atLowerLimit) {
                this.m_impulse.z = Math.max(this.m_impulse.z, 0.0);
            } else if (this.m_limitState == atUpperLimit) {
                this.m_impulse.z = Math.min(this.m_impulse.z, 0.0);
            }

            // f2(1:2) = invK(1:2,1:2) * (-Cdot(1:2) - K(1:2,3) * (f2(3) - f1(3))) +
            // f1(1:2)
            const b = Vec2.combine(-1, Cdot1, -(this.m_impulse.z - f1.z), new Vec2(this.m_K.ez.x, this.m_K.ez.y)); // Vec2
            const f2r = Vec2.add(this.m_K.solve22(b), new Vec2(f1.x, f1.y)); // Vec2
            this.m_impulse.x = f2r.x;
            this.m_impulse.y = f2r.y;

            df = Vec3.sub(this.m_impulse, f1);

            const P = Vec2.combine(df.x, this.m_perp, df.z, this.m_axis); // Vec2
            const LA = df.x * this.m_s1 + df.y + df.z * this.m_a1; // float
            const LB = df.x * this.m_s2 + df.y + df.z * this.m_a2; // float

            vA.subMul(mA, P);
            wA -= iA * LA;

            vB.addMul(mB, P);
            wB += iB * LB;
        } else {
            // Limit is inactive, just solve the prismatic constraint in block form.
            const df = this.m_K.solve22(Vec2.neg(Cdot1)); // Vec2
            this.m_impulse.x += df.x;
            this.m_impulse.y += df.y;

            const P = Vec2.mul(df.x, this.m_perp); // Vec2
            const LA = df.x * this.m_s1 + df.y; // float
            const LB = df.x * this.m_s2 + df.y; // float

            vA.subMul(mA, P);
            wA -= iA * LA;

            vB.addMul(mB, P);
            wB += iB * LB;
        }

        // this.m_bodyA.c_velocity.v = vA;
        this.m_bodyA.c_w = wA;
        // this.m_bodyB.c_velocity.v = vB;
        this.m_bodyB.c_w = wB;
    }

    solvePositionConstraints(step: TimeStep) {
        const cA = this.m_bodyA.c_pos;
        let aA = this.m_bodyA.c_a;
        const cB = this.m_bodyB.c_pos;
        let aB = this.m_bodyB.c_a;

        const qA = Rot.forAngle(aA);
        const qB = Rot.forAngle(aB);

        const mA = this.m_invMassA;
        const mB = this.m_invMassB;
        const iA = this.m_invIA;
        const iB = this.m_invIB;

        // Compute fresh Jacobians
        const rA = Rot.mulVec2(qA, Vec2.sub(this.m_localAnchorA, this.m_localCenterA)); // Vec2
        const rB = Rot.mulVec2(qB, Vec2.sub(this.m_localAnchorB, this.m_localCenterB)); // Vec2
        const d = Vec2.sub(Vec2.add(cB, rB), Vec2.add(cA, rA)); // Vec2

        const axis = Rot.mulVec2(qA, this.m_localXAxisA); // Vec2
        const a1 = Vec2.cross(Vec2.add(d, rA), axis); // float
        const a2 = Vec2.cross(rB, axis); // float
        const perp = Rot.mulVec2(qA, this.m_localYAxisA); // Vec2

        const s1 = Vec2.cross(Vec2.add(d, rA), perp); // float
        const s2 = Vec2.cross(rB, perp); // float

        let impulse = new Vec3(0, 0, 0);
        const C1 = Vec2.zero(); // Vec2
        C1.x = Vec2.dot(perp, d);
        C1.y = aB - aA - this.m_referenceAngle;

        let linearError = Math.abs(C1.x); // float
        const angularError = Math.abs(C1.y); // float

        const linearSlop = Settings.linearSlop;
        const maxLinearCorrection = Settings.maxLinearCorrection;

        let active = false;
        let C2 = 0.0;
        if (this.m_enableLimit) {

            const translation = Vec2.dot(axis, d); // float
            if (Math.abs(this.m_upperTranslation - this.m_lowerTranslation) < 2.0 * linearSlop) {
                // Prevent large angular corrections
                C2 = MathUtil.clamp(translation, -maxLinearCorrection, maxLinearCorrection);
                linearError = Math.max(linearError, Math.abs(translation));
                active = true;

            } else if (translation <= this.m_lowerTranslation) {
                // Prevent large linear corrections and allow some slop.
                C2 = MathUtil.clamp(translation - this.m_lowerTranslation + linearSlop,
                    -maxLinearCorrection, 0.0);
                linearError = Math
                    .max(linearError, this.m_lowerTranslation - translation);
                active = true;

            } else if (translation >= this.m_upperTranslation) {
                // Prevent large linear corrections and allow some slop.
                C2 = MathUtil.clamp(translation - this.m_upperTranslation - linearSlop, 0.0,
                    maxLinearCorrection);
                linearError = Math
                    .max(linearError, translation - this.m_upperTranslation);
                active = true;
            }
        }

        if (active) {
            const k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2; // float
            const k12 = iA * s1 + iB * s2; // float
            const k13 = iA * s1 * a1 + iB * s2 * a2; // float
            let k22 = iA + iB; // float
            if (k22 === 0.0) {
                // For fixed rotation
                k22 = 1.0;
            }
            const k23 = iA * a1 + iB * a2; // float
            const k33 = mA + mB + iA * a1 * a1 + iB * a2 * a2; // float

            const K = Mat33.zero();
            K.ex.set(k11, k12, k13);
            K.ey.set(k12, k22, k23);
            K.ez.set(k13, k23, k33);

            const C = new Vec3(C1.x, C1.y, C2);
            impulse = K.solve33(Vec3.neg(C));
        } else {
            const k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2; // float
            const k12 = iA * s1 + iB * s2; // float
            let k22 = iA + iB; // float
            if (k22 === 0.0) {
                k22 = 1.0;
            }

            const K = new Mat22(k11, k12, k12, k22);
            const impulse1 = K.solve(Vec2.neg(C1)); // Vec2
            impulse.x = impulse1.x;
            impulse.y = impulse1.y;
            impulse.z = 0.0;
        }

        const P = Vec2.combine(impulse.x, perp, impulse.z, axis); // Vec2
        const LA = impulse.x * s1 + impulse.y + impulse.z * a1; // float
        const LB = impulse.x * s2 + impulse.y + impulse.z * a2; // float

        cA.subMul(mA, P);
        aA -= iA * LA;
        cB.addMul(mB, P);
        aB += iB * LB;

        // this.m_bodyA.c_position.c = cA;
        this.m_bodyA.c_a = aA;
        // this.m_bodyB.c_position.c = cB;
        this.m_bodyB.c_a = aB;

        return linearError <= Settings.linearSlop
            && angularError <= Settings.angularSlop;
    }

}
