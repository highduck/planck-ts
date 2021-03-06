import {Vec2} from "./common/Vec2";
import {Mat22} from "./common/Mat22";
import {assert} from "./util/common";
import {MathUtil} from "./common/Math";
import {Settings} from "./Settings";
import {Rot} from "./common/Rot";
import {Transform} from "./common/Transform";
import {testOverlap} from "./collision/Distance";
import {ShapeType} from "./Shape";
import {Body} from './Body';
import {Fixture} from "./Fixture";
import {Manifold, ManifoldType, WorldManifold} from "./Manifold";
import {TimeStep} from "./TimeStep";

const DEBUG_SOLVER = false;

interface ContactListener {
    beginContact(contact: Contact): void;

    endContact(contact: Contact): void;

    preSolve(contact: Contact, oldManifold: Manifold): void;
}

/**
 * Friction mixing law. The idea is to allow either fixture to drive the
 * restitution to zero. For example, anything slides on ice.
 */
function mixFriction(friction1: number, friction2: number): number {
    return Math.sqrt(friction1 * friction2);
}

/**
 * Restitution mixing law. The idea is allow for anything to bounce off an
 * inelastic surface. For example, a superball bounces on anything.
 */
function mixRestitution(restitution1: number, restitution2: number): number {
    return restitution1 > restitution2 ? restitution1 : restitution2;
}

const s_vec2_0 = new Vec2(0, 0);
const s_worldManifold = new WorldManifold();
const s_registers = new Map<number, EvaluateFunction>();

/**
 * A contact edge is used to connect bodies and contacts together in a contact
 * graph where each body is a node and each contact is an edge. A contact edge
 * belongs to a doubly linked list maintained in each attached body. Each
 * contact has two contact nodes, one for each attached body.
 *
 * @prop {Contact} contact The contact
 * @prop {ContactEdge} prev The previous contact edge in the body's contact list
 * @prop {ContactEdge} next The next contact edge in the body's contact list
 * @prop {Body} other Provides quick access to the other body attached.
 */
export class ContactEdge {
    prev: ContactEdge | null = null;
    next: ContactEdge | null = null;
    other!: Body;

    constructor(public contact: Contact) {
    }
}

export type EvaluateFunction = (
    manifold: Manifold,
    xfA: Transform, fixtureA: Fixture, indexA: number,
    xfB: Transform, fixtureB: Fixture, indexB: number
) => void;

/**
 * @function Contact~evaluate
 *
 * @param manifold
 * @param xfA
 * @param fixtureA
 * @param indexA
 * @param xfB
 * @param fixtureB
 * @param indexB
 */

/**
 * The class manages contact between two shapes. A contact exists for each
 * overlapping AABB in the broad-phase (except if filtered). Therefore a contact
 * object may exist that has no contact points.
 *
 * @param {Fixture} fA
 * @param {int} indexA
 * @param {Fixture} fB
 * @param {int} indexB
 * @param {Contact~evaluate} evaluateFcn
 */
export class Contact {

    // Nodes for connecting bodies.
    m_nodeA = new ContactEdge(this);
    m_nodeB = new ContactEdge(this);

    m_fixtureA: Fixture;
    m_fixtureB: Fixture;

    m_indexA: number;
    m_indexB: number;

    m_evaluateFcn: EvaluateFunction;

    m_manifold = new Manifold();

    m_prev: Contact | null = null;
    m_next: Contact | null = null;

    m_toi = 1.0;
    m_toiCount = 0;
    // This contact has a valid TOI in m_toi
    m_toiFlag = false;

    m_friction: number;
    m_restitution: number;

    m_tangentSpeed = 0.0;

    // This contact can be disabled (by user)
    m_enabledFlag = true;

    // Used when crawling contact graph when forming islands.
    m_islandFlag = false;

    // Set when the shapes are touching.
    m_touchingFlag = false;

    // This contact needs filtering because a fixture filter was changed.
    m_filterFlag = false;

    // This bullet contact had a TOI event
    m_bulletHitFlag = false;

    v_points: VelocityConstraintPoint[] = []; // VelocityConstraintPoint[maxManifoldPoints]
    readonly v_normal = new Vec2(0, 0);
    readonly v_normalMass = Mat22.zero();
    readonly v_K = Mat22.zero();
    v_pointCount = 0;

    v_tangentSpeed: number = 0;
    v_friction: number = 0;
    v_restitution: number = 0;

    v_invMassA = 0;
    v_invMassB = 0;
    v_invIA = 0;
    v_invIB = 0;

    p_localPoints: Vec2[] = [] // Vec2[maxManifoldPoints];
    readonly p_localNormal = new Vec2(0, 0);
    readonly p_localPoint = new Vec2(0, 0);
    readonly p_localCenterA = new Vec2(0, 0);
    readonly p_localCenterB = new Vec2(0, 0);
    p_type = ManifoldType.e_circles;
    p_radiusA = 0;
    p_radiusB = 0;
    p_pointCount = 0;

    p_invMassA = 0;
    p_invMassB = 0;
    p_invIA = 0;
    p_invIB = 0;

    constructor(fA: Fixture, indexA: number, fB: Fixture, indexB: number, evaluateFcn: EvaluateFunction) {
        this.m_fixtureA = fA;
        this.m_fixtureB = fB;

        this.m_indexA = indexA;
        this.m_indexB = indexB;

        this.m_evaluateFcn = evaluateFcn;

        this.m_friction = mixFriction(fA.m_friction, fB.m_friction);
        this.m_restitution = mixRestitution(fA.m_restitution, fB.m_restitution);
    }

    initConstraint(step: TimeStep) {
        const fixtureA = this.m_fixtureA;
        const fixtureB = this.m_fixtureB;

        const shapeA = fixtureA.getShape();
        const shapeB = fixtureB.getShape();

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        const manifold = this.getManifold();

        const pointCount = manifold.pointCount;
        PLANCK_ASSERT && assert(pointCount > 0);

        this.v_invMassA = bodyA.m_invMass;
        this.v_invMassB = bodyB.m_invMass;
        this.v_invIA = bodyA.m_invI;
        this.v_invIB = bodyB.m_invI;

        this.v_friction = this.m_friction;
        this.v_restitution = this.m_restitution;
        this.v_tangentSpeed = this.m_tangentSpeed;

        this.v_pointCount = pointCount;

        this.v_K.setZero();
        this.v_normalMass.setZero();

        this.p_invMassA = bodyA.m_invMass;
        this.p_invMassB = bodyB.m_invMass;
        this.p_invIA = bodyA.m_invI;
        this.p_invIB = bodyB.m_invI;
        this.p_localCenterA.copyFrom(bodyA.m_sweep.localCenter);
        this.p_localCenterB.copyFrom(bodyB.m_sweep.localCenter);

        this.p_radiusA = shapeA.m_radius;
        this.p_radiusB = shapeB.m_radius;

        this.p_type = manifold.type;
        this.p_localNormal.copyFrom(manifold.localNormal);
        this.p_localPoint.copyFrom(manifold.localPoint);
        this.p_pointCount = pointCount;

        for (let j = 0; j < pointCount; ++j) {
            const cp = manifold.points[j]; // ManifoldPoint
            const vcp = this.v_points[j] = new VelocityConstraintPoint();

            if (step.warmStarting) {
                vcp.normalImpulse = step.dtRatio * cp.normalImpulse;
                vcp.tangentImpulse = step.dtRatio * cp.tangentImpulse;

            } else {
                vcp.normalImpulse = 0.0;
                vcp.tangentImpulse = 0.0;
            }

            vcp.rA.setZero();
            vcp.rB.setZero();
            vcp.normalMass = 0.0;
            vcp.tangentMass = 0.0;
            vcp.velocityBias = 0.0;

            // this.p_localPoints[j] = cp.localPoint.clone();
            this.p_localPoints[j] = cp.localPoint; // by REF!
        }
    }

    /**
     * Get the contact manifold. Do not modify the manifold unless you understand
     * the internals of the library.
     */
    getManifold(): Manifold {
        return this.m_manifold;
    }

    /**
     * Get the world manifold.
     *
     * @param {WorldManifold} [worldManifold]
     */
    getWorldManifold(worldManifold?: WorldManifold): WorldManifold {
        const bodyA = this.m_fixtureA.getBody();
        const bodyB = this.m_fixtureB.getBody();
        const shapeA = this.m_fixtureA.getShape();
        const shapeB = this.m_fixtureB.getShape();

        if (worldManifold === undefined) {
            worldManifold = s_worldManifold;
            worldManifold.reset();
        }
        this.m_manifold.getWorldManifold(worldManifold,
            bodyA.getTransform(), shapeA.m_radius,
            bodyB.getTransform(), shapeB.m_radius);

        return worldManifold;
    }

    /**
     * Enable/disable this contact. This can be used inside the pre-solve contact
     * listener. The contact is only disabled for the current time step (or sub-step
     * in continuous collisions).
     */
    setEnabled(flag: boolean) {
        this.m_enabledFlag = flag;
    }

    /**
     * Has this contact been disabled?
     */
    isEnabled() {
        return this.m_enabledFlag;
    }

    /**
     * Is this contact touching?
     */
    isTouching() {
        return this.m_touchingFlag;
    }

    /**
     * Get the next contact in the world's contact list.
     */
    getNext() {
        return this.m_next;
    }

    /**
     * Get fixture A in this contact.
     */
    getFixtureA() {
        return this.m_fixtureA;
    }

    /**
     * Get fixture B in this contact.
     */
    getFixtureB() {
        return this.m_fixtureB;
    }

    /**
     * Get the child primitive index for fixture A.
     */
    getChildIndexA() {
        return this.m_indexA;
    }

    /**
     * Get the child primitive index for fixture B.
     */
    getChildIndexB() {
        return this.m_indexB;
    }

    /**
     * Flag this contact for filtering. Filtering will occur the next time step.
     */
    flagForFiltering() {
        this.m_filterFlag = true;
    }

    /**
     * Override the default friction mixture. You can call this in
     * ContactListener.preSolve. This value persists until set or reset.
     */
    setFriction(friction: number) {
        this.m_friction = friction;
    }

    /**
     * Get the friction.
     */
    getFriction() {
        return this.m_friction;
    }

    /**
     * Reset the friction mixture to the default value.
     */
    resetFriction() {
        this.m_friction = mixFriction(this.m_fixtureA.m_friction, this.m_fixtureB.m_friction);
    }

    /**
     * Override the default restitution mixture. You can call this in
     * ContactListener.preSolve. The value persists until you set or reset.
     */
    setRestitution(restitution: number) {
        this.m_restitution = restitution;
    }

    /**
     * Get the restitution.
     */
    getRestitution() {
        return this.m_restitution;
    }

    /**
     * Reset the restitution to the default value.
     */
    resetRestitution() {
        this.m_restitution = mixRestitution(this.m_fixtureA.m_restitution,
            this.m_fixtureB.m_restitution);
    }

    /**
     * Set the desired tangent speed for a conveyor belt behavior. In meters per
     * second.
     */
    setTangentSpeed(speed: number) {
        this.m_tangentSpeed = speed;
    }

    /**
     * Get the desired tangent speed. In meters per second.
     */
    getTangentSpeed() {
        return this.m_tangentSpeed;
    }

    /**
     * Called by Update method, and implemented by subclasses.
     */
    evaluate(manifold: Manifold, xfA: Transform, xfB: Transform) {
        this.m_evaluateFcn(manifold,
            xfA, this.m_fixtureA, this.m_indexA,
            xfB, this.m_fixtureB, this.m_indexB);
    };

    /**
     * Updates the contact manifold and touching status.
     *
     * Note: do not assume the fixture AABBs are overlapping or are valid.
     *
     * @param {function} listener.beginContact
     * @param {function} listener.endContact
     * @param {function} listener.preSolve
     */
    update(listener?: ContactListener) {

        // TODO reuse manifold
        const oldManifold = this.m_manifold;

        // Re-enable this contact.
        this.m_enabledFlag = true;

        let touching = false;
        let wasTouching = this.m_touchingFlag;

        const sensorA = this.m_fixtureA.isSensor();
        const sensorB = this.m_fixtureB.isSensor();
        const sensor = sensorA || sensorB;

        const bodyA = this.m_fixtureA.getBody();
        const bodyB = this.m_fixtureB.getBody();
        const xfA = bodyA.getTransform();
        const xfB = bodyB.getTransform();

        // Is this contact a sensor?
        if (sensor) {
            const shapeA = this.m_fixtureA.getShape();
            const shapeB = this.m_fixtureB.getShape();
            touching = testOverlap(shapeA, this.m_indexA, shapeB,
                this.m_indexB, xfA, xfB);

            // Sensors don't generate manifolds.
            this.m_manifold.pointCount = 0;
        } else {
            this.m_manifold = new Manifold();

            this.evaluate(this.m_manifold, xfA, xfB);
            touching = this.m_manifold.pointCount > 0;

            // Match old contact ids to new contact ids and copy the
            // stored impulses to warm start the solver.
            for (let i = 0; i < this.m_manifold.pointCount; ++i) {
                const nmp = this.m_manifold.points[i];
                nmp.normalImpulse = 0.0;
                nmp.tangentImpulse = 0.0;

                for (let j = 0; j < oldManifold.pointCount; ++j) {
                    const omp = oldManifold.points[j];
                    // ContactID.key
                    if (omp.cf.key === nmp.cf.key) {
                        nmp.normalImpulse = omp.normalImpulse;
                        nmp.tangentImpulse = omp.tangentImpulse;
                        break;
                    }
                }
            }

            if (touching != wasTouching) {
                bodyA.setAwake(true);
                bodyB.setAwake(true);
            }
        }

        this.m_touchingFlag = touching;

        if (!wasTouching && touching && listener) {
            listener.beginContact(this);
        }

        if (wasTouching && !touching && listener) {
            listener.endContact(this);
        }

        if (!sensor && touching && listener) {
            listener.preSolve(this, oldManifold);
        }
    }

    solvePositionConstraint(step: TimeStep) {
        return this._solvePositionConstraint(step, false);
    }

    solvePositionConstraintTOI(step: TimeStep, toiA: Body, toiB: Body) {
        return this._solvePositionConstraint(step, true, toiA, toiB);
    }

    _solvePositionConstraint(step: TimeStep, toi: boolean, toiA?: Body, toiB?: Body) {

        const fixtureA = this.m_fixtureA;
        const fixtureB = this.m_fixtureB;

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        let mA = 0.0;
        let iA = 0.0;
        if (!toi || (bodyA === toiA || bodyA === toiB)) {
            mA = this.p_invMassA;
            iA = this.p_invIA;
        }

        let mB = 0.0;
        let iB = 0.0;
        if (!toi || (bodyB === toiA || bodyB === toiB)) {
            mB = this.p_invMassB;
            iB = this.p_invIB;
        }

        // const cA = Vec2.clone(positionA.c);
        const cA = bodyA.c_pos;
        let aA = bodyA.c_a;

        // const cB = Vec2.clone(positionB.c);
        const cB = bodyB.c_pos;
        let aB = bodyB.c_a;

        let minSeparation = 0.0;

        // Solve normal constraints
        for (let j = 0; j < this.p_pointCount; ++j) {
            const xfA = Transform.angle(aA);
            const xfB = Transform.angle(aB);
            // Vec2._sub(cA, Rot.mulVec2(xfA, localCenterA), xfA);
            // Vec2._sub(cB, Rot.mulVec2(xfB, localCenterB), xfB);
            Rot._mulVec2(xfA, this.p_localCenterA, xfA);
            Rot._mulVec2(xfB, this.p_localCenterB, xfB);
            Vec2._sub(cA, xfA, xfA);
            Vec2._sub(cB, xfB, xfB);

            // PositionSolverManifold
            let normal: Vec2;
            let point: Vec2;
            let separation: number;
            if (this.p_type === ManifoldType.e_circles) {
                const pointA = Transform.mulVec2(xfA, this.p_localPoint);
                const pointB = Transform.mulVec2(xfB, this.p_localPoints[0]);
                normal = Vec2.sub(pointB, pointA);
                normal.normalize();
                point = Vec2.combine(0.5, pointA, 0.5, pointB);
                separation = Vec2.dot(Vec2.sub(pointB, pointA), normal) - this.p_radiusA - this.p_radiusB;
            } else if (this.p_type === ManifoldType.e_faceA) {
                normal = Rot.mulVec2(xfA, this.p_localNormal);
                const planePoint = Transform.mulVec2(xfA, this.p_localPoint);
                const clipPoint = Transform.mulVec2(xfB, this.p_localPoints[j]);
                separation = Vec2.dot(Vec2.sub(clipPoint, planePoint), normal) - this.p_radiusA - this.p_radiusB;
                point = clipPoint;
            } else if (this.p_type === ManifoldType.e_faceB) {
                normal = Rot.mulVec2(xfB, this.p_localNormal);
                const planePoint = Transform.mulVec2(xfB, this.p_localPoint);
                const clipPoint = Transform.mulVec2(xfA, this.p_localPoints[j]);
                separation = Vec2.dot(Vec2.sub(clipPoint, planePoint), normal) - this.p_radiusA - this.p_radiusB;
                point = clipPoint;

                // Ensure normal points from A to B
                normal.mul(-1);
            }

            const rA = Vec2.sub(point!, cA);
            const rB = Vec2.sub(point!, cB);

            // Track max constraint error.
            minSeparation = Math.min(minSeparation, separation!);

            const baumgarte = toi ? Settings.toiBaugarte : Settings.baumgarte;
            const linearSlop = Settings.linearSlop;
            const maxLinearCorrection = Settings.maxLinearCorrection;

            // Prevent large corrections and allow slop.
            const C = MathUtil.clamp(baumgarte * (separation! + linearSlop),
                -maxLinearCorrection, 0.0);

            // Compute the effective mass.
            const rnA = Vec2.cross(rA, normal!);
            const rnB = Vec2.cross(rB, normal!);
            const K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

            // Compute normal impulse
            const impulse = K > 0.0 ? -C / K : 0.0;

            // const P = Vec2.mul(impulse, normal!);
            // OPTIMIZATION
            const P = normal!;
            P.mul(impulse);

            cA.subMul(mA, P);
            aA -= iA * Vec2.cross(rA, P);

            cB.addMul(mB, P);
            aB += iB * Vec2.cross(rB, P);
        }

        // positionA.c.copyFrom(cA);
        bodyA.c_a = aA;

        // positionB.c.copyFrom(cB);
        bodyB.c_a = aB;

        return minSeparation;
    }

    initVelocityConstraint(step: TimeStep) {
        const fixtureA = this.m_fixtureA;
        const fixtureB = this.m_fixtureB;

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        // const velocityA = bodyA.c_vel;
        // const velocityB = bodyB.c_vel;
        //
        // const positionA = bodyA.c_pos;
        // const positionB = bodyB.c_pos;

        const radiusA = this.p_radiusA;
        const radiusB = this.p_radiusB;
        const manifold = this.getManifold();

        const mA = this.v_invMassA;
        const mB = this.v_invMassB;
        const iA = this.v_invIA;
        const iB = this.v_invIB;

        const cA = bodyA.c_pos;
        const aA = bodyA.c_a;
        const vA = bodyA.c_vel;
        const wA = bodyA.c_w;

        const cB = bodyB.c_pos;
        const aB = bodyB.c_a;
        const vB = bodyB.c_vel;
        const wB = bodyB.c_w;

        PLANCK_ASSERT && assert(manifold.pointCount > 0);

        // const xfA = Transform.identity();
        // const xfB = Transform.identity();
        // xfA.q.setAngle(aA);
        // xfB.q.setAngle(aB);
        // xfA.p.setCombine(1, cA, -1, Rot.mulVec2(xfA, localCenterA));
        // xfB.p.setCombine(1, cB, -1, Rot.mulVec2(xfB, localCenterB));
        const xfA = Transform.angle(aA);
        const xfB = Transform.angle(aB);
        // Vec2._sub(cA, Rot.mulVec2(xfA, localCenterA), xfA);
        // Vec2._sub(cB, Rot.mulVec2(xfB, localCenterB), xfB);

        // Vec2._sub(cA, Rot.mulVec2(xfA, localCenterA), xfA);
        Rot._mulVec2(xfA, this.p_localCenterA, xfA);
        Vec2._sub(cA, xfA, xfA);

        // Vec2._sub(cB, Rot.mulVec2(xfB, localCenterB), xfB);
        Rot._mulVec2(xfB, this.p_localCenterB, xfB);
        Vec2._sub(cB, xfB, xfB);

        // const worldManifold = new WorldManifold();
        const worldManifold = s_worldManifold;
        worldManifold.reset();
        manifold.getWorldManifold(worldManifold, xfA, radiusA, xfB, radiusB);

        this.v_normal.copyFrom(worldManifold.normal);

        for (let j = 0; j < this.v_pointCount; ++j) {
            const vcp = this.v_points[j]; // VelocityConstraintPoint

            const pointj = worldManifold.points[j];
            Vec2._sub(pointj, cA, vcp.rA);
            Vec2._sub(pointj, cB, vcp.rB);

            const rnA = Vec2.cross(vcp.rA, this.v_normal);
            const rnB = Vec2.cross(vcp.rB, this.v_normal);

            const kNormal = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

            vcp.normalMass = kNormal > 0.0 ? 1.0 / kNormal : 0.0;

            const tangent = Vec2.crossVS(this.v_normal, 1.0);

            const rtA = Vec2.cross(vcp.rA, tangent);
            const rtB = Vec2.cross(vcp.rB, tangent);

            const kTangent = mA + mB + iA * rtA * rtA + iB * rtB * rtB;

            vcp.tangentMass = kTangent > 0.0 ? 1.0 / kTangent : 0.0;

            // Setup a velocity bias for restitution.
            vcp.velocityBias = 0.0;
            const vRel = Vec2.dot(this.v_normal, vB)
                + Vec2.dot(this.v_normal, Vec2.crossSV(wB, vcp.rB))
                - Vec2.dot(this.v_normal, vA)
                - Vec2.dot(this.v_normal, Vec2.crossSV(wA, vcp.rA));
            if (vRel < -Settings.velocityThreshold) {
                vcp.velocityBias = -this.v_restitution * vRel;
            }
        }

        // If we have two points, then prepare the block solver.
        if (this.v_pointCount === 2 && step.blockSolve) {
            const vcp1 = this.v_points[0]; // VelocityConstraintPoint
            const vcp2 = this.v_points[1]; // VelocityConstraintPoint

            const rn1A = Vec2.cross(vcp1.rA, this.v_normal);
            const rn1B = Vec2.cross(vcp1.rB, this.v_normal);
            const rn2A = Vec2.cross(vcp2.rA, this.v_normal);
            const rn2B = Vec2.cross(vcp2.rB, this.v_normal);

            const k11 = mA + mB + iA * rn1A * rn1A + iB * rn1B * rn1B;
            const k22 = mA + mB + iA * rn2A * rn2A + iB * rn2B * rn2B;
            const k12 = mA + mB + iA * rn1A * rn2A + iB * rn1B * rn2B;

            // Ensure a reasonable condition number.
            const k_maxConditionNumber = 1000.0;
            if (k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12)) {
                // K is safe to invert.
                this.v_K.set(k11, k12, k12, k22);
                Mat22._inverse(this.v_K, this.v_normalMass);
            } else {
                // The constraints are redundant, just use one.
                // TODO_ERIN use deepest?
                this.v_pointCount = 1;
            }
        }

        // positionA.c.copyFrom(cA);
        // positionA.a = aA;
        // velocityA.v.copyFrom(vA);
        // velocityA.w = wA;
        //
        // positionB.c.copyFrom(cB);
        // positionB.a = aB;
        // velocityB.v.copyFrom(vB);
        // velocityB.w = wB;
    }

    warmStartConstraint(step: TimeStep) {
        const fixtureA = this.m_fixtureA;
        const fixtureB = this.m_fixtureB;

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        const velocityA = bodyA.c_vel;
        const velocityB = bodyB.c_vel;
        // const positionA = bodyA.c_position;
        // const positionB = bodyB.c_position;

        const mA = this.v_invMassA;
        const iA = this.v_invIA;
        const mB = this.v_invMassB;
        const iB = this.v_invIB;

        const vA = bodyA.c_vel;
        let wA = bodyA.c_w;
        const vB = bodyB.c_vel;
        let wB = bodyB.c_w;

        const normal = this.v_normal;
        const tangent = Vec2.crossVS(normal, 1.0);

        for (let j = 0; j < this.v_pointCount; ++j) {
            const vcp = this.v_points[j]; // VelocityConstraintPoint

            const P = Vec2.combine(vcp.normalImpulse, normal, vcp.tangentImpulse, tangent);
            wA -= iA * Vec2.cross(vcp.rA, P);
            vA.subMul(mA, P);
            wB += iB * Vec2.cross(vcp.rB, P);
            vB.addMul(mB, P);
        }

        // velocityA.v.copyFrom(vA); // mod by ref!
        bodyA.c_w = wA;
        // velocityB.v.copyFrom(vB); // mod by ref!
        bodyB.c_w = wB;
    }

    storeConstraintImpulses(step: TimeStep) {
        const manifold = this.m_manifold;
        for (let j = 0; j < this.v_pointCount; ++j) {
            const vp = this.v_points[j];
            const mp = manifold.points[j];
            mp.normalImpulse = vp.normalImpulse;
            mp.tangentImpulse = vp.tangentImpulse;
        }
    }

    solveVelocityConstraint(step: TimeStep) {
        const bodyA = this.m_fixtureA.m_body;
        const bodyB = this.m_fixtureB.m_body;

        const mA = this.v_invMassA;
        const iA = this.v_invIA;
        const mB = this.v_invMassB;
        const iB = this.v_invIB;

        const vA = bodyA.c_vel;
        let wA = bodyA.c_w;
        const vB = bodyB.c_vel;
        let wB = bodyB.c_w;

        const normal = this.v_normal;
        //const tangent = Vec2.crossVS(normal, 1.0);
        const friction = this.v_friction;

        PLANCK_ASSERT && assert(this.v_pointCount === 1 || this.v_pointCount === 2);

        // Solve tangent constraints first because non-penetration is more important
        // than friction.
        for (let j = 0; j < this.v_pointCount; ++j) {
            const vcp = this.v_points[j]; // VelocityConstraintPoint

            // OPTIMIZATION
            const tangent = s_vec2_0;
            Vec2._crossVS(normal, 1.0, tangent);

            // Relative velocity at contact
            const dvx = vB.x - wB * vcp.rB.y - vA.x + wA * vcp.rA.y;
            const dvy = vB.y + wB * vcp.rB.x - vA.y - wA * vcp.rA.x;
            // const dv = Vec2.zero();
            // dv.addCombine(1, vB, 1, Vec2.crossSV(wB, vcp.rB));
            // dv.subCombine(1, vA, 1, Vec2.crossSV(wA, vcp.rA));

            // Compute tangent force
            // const vt = Vec2.dot(dv, tangent) - this.v_tangentSpeed;
            const vt = dvx * tangent.x + dvy * tangent.y - this.v_tangentSpeed;
            let lambda = -vt * vcp.tangentMass;

            // Clamp the accumulated force
            const maxFriction = friction * vcp.normalImpulse;
            const newImpulse = MathUtil.clamp(vcp.tangentImpulse + lambda, -maxFriction, maxFriction);
            lambda = newImpulse - vcp.tangentImpulse;
            vcp.tangentImpulse = newImpulse;

            // Apply contact impulse

            // const P = Vec2.mul(lambda, tangent);

            // OPTIMIZATION
            // reuse `tangent`
            const P = tangent;
            P.mul(lambda);

            vA.subMul(mA, P);
            wA -= iA * Vec2.cross(vcp.rA, P);

            vB.addMul(mB, P);
            wB += iB * Vec2.cross(vcp.rB, P);
        }

        // Solve normal constraints
        if (this.v_pointCount === 1 || !step.blockSolve) {
            for (let i = 0; i < this.v_pointCount; ++i) {
                const vcp = this.v_points[i]; // VelocityConstraintPoint

                // Relative velocity at contact
                const dv = Vec2.zero();
                dv.addCombine(1, vB, 1, Vec2.crossSV(wB, vcp.rB));
                dv.subCombine(1, vA, 1, Vec2.crossSV(wA, vcp.rA));
                // TODO: optimize
                // const dvx = vB.x - wB * vcp.rB.y - vA.x + wA * vcp.rA.y;
                // const dvy = vB.y + wB * vcp.rB.x - vA.y - wA * vcp.rA.x;
                const dvx = dv.x;
                const dvy = dv.y;

                // Compute normal impulse
                const vn = Vec2.dot(dv, normal);
                // const vn = dvx * normal.x + dvy * normal.y;

                let lambda = -vcp.normalMass * (vn - vcp.velocityBias);

                // Clamp the accumulated impulse
                const newImpulse = Math.max(vcp.normalImpulse + lambda, 0.0);
                lambda = newImpulse - vcp.normalImpulse;
                vcp.normalImpulse = newImpulse;

                // Apply contact impulse
                // const P = Vec2.mul(lambda, normal);
                // optimization
                const P = s_vec2_0;
                P.x = lambda * normal.x;
                P.y = lambda * normal.y;

                vA.subMul(mA, P);
                wA -= iA * Vec2.cross(vcp.rA, P);

                vB.addMul(mB, P);
                wB += iB * Vec2.cross(vcp.rB, P);
            }
        } else {
            // Block solver developed in collaboration with Dirk Gregorius (back in
            // 01/07 on Box2D_Lite).
            // Build the mini LCP for this contact patch
            //
            // vn = A * x + b, vn >= 0, , vn >= 0, x >= 0 and vn_i * x_i = 0 with i =
            // 1..2
            //
            // A = J * W * JT and J = ( -n, -r1 x n, n, r2 x n )
            // b = vn0 - velocityBias
            //
            // The system is solved using the "Total enumeration method" (s. Murty).
            // The complementary constraint vn_i * x_i
            // implies that we must have in any solution either vn_i = 0 or x_i = 0.
            // So for the 2D contact problem the cases
            // vn1 = 0 and vn2 = 0, x1 = 0 and x2 = 0, x1 = 0 and vn2 = 0, x2 = 0 and
            // vn1 = 0 need to be tested. The first valid
            // solution that satisfies the problem is chosen.
            //
            // In order to account of the accumulated impulse 'a' (because of the
            // iterative nature of the solver which only requires
            // that the accumulated impulse is clamped and not the incremental
            // impulse) we change the impulse variable (x_i).
            //
            // Substitute:
            //
            // x = a + d
            //
            // a := old total impulse
            // x := new total impulse
            // d := incremental impulse
            //
            // For the current iteration we extend the formula for the incremental
            // impulse
            // to compute the new total impulse:
            //
            // vn = A * d + b
            // = A * (x - a) + b
            // = A * x + b - A * a
            // = A * x + b'
            // b' = b - A * a;

            const vcp1 = this.v_points[0]; // VelocityConstraintPoint
            const vcp2 = this.v_points[1]; // VelocityConstraintPoint

            // const a = new Vec2(vcp1.normalImpulse, vcp2.normalImpulse);
            // PLANCK_ASSERT && assert(a.x >= 0.0 && a.y >= 0.0);
            // optimization
            const ax = vcp1.normalImpulse;
            const ay = vcp2.normalImpulse;
            PLANCK_ASSERT && assert(ax >= 0.0 && ay >= 0.0);

            // Relative velocity at contact
            // let dv1 = vB.clone().add(Vec2.crossSV(wB, vcp1.rB)).sub(vA).sub(Vec2.crossSV(wA, vcp1.rA));
            // let dv2 = vB.clone().add(Vec2.crossSV(wB, vcp2.rB)).sub(vA).sub(Vec2.crossSV(wA, vcp2.rA));
            // optimization:
            //   Vec2.crossSV(wB, vcp1.rB) => (-wB * vcp1.rB.y, wB * vcp1.rB.x)
            //   Vec2.crossSV(wA, vcp1.rA) => (-wA * vcp1.rA.y, wA * vcp1.rA.x)
            const dv1x = vB.x - wB * vcp1.rB.y - vA.x + wA * vcp1.rA.y;
            const dv1y = vB.y + wB * vcp1.rB.x - vA.y - wA * vcp1.rA.x;
            const dv2x = vB.x - wB * vcp2.rB.y - vA.x + wA * vcp2.rA.y;
            const dv2y = vB.y + wB * vcp2.rB.x - vA.y - wA * vcp2.rA.x;

            // Compute normal velocity
            // let vn1 = Vec2.dot(dv1, normal);
            // let vn2 = Vec2.dot(dv2, normal);
            // optimization:
            let vn1 = dv1x * normal.x + dv1y * normal.y;
            let vn2 = dv2x * normal.x + dv2y * normal.y;

            // const b = new Vec2(vn1 - vcp1.velocityBias, vn2 - vcp2.velocityBias);

            // Compute b'
            // b.sub(Mat22.mulVec2(this.v_K, a));

            // optimization:
            //   Mat22.mulVec2(this.v_K, a) => this.v_K.a * ax + this.v_K.b * ay, this.v_K.c * ax + this.v_K.d * ay
            const bx = vn1 - vcp1.velocityBias - this.v_K.a * ax - this.v_K.b * ay;
            const by = vn2 - vcp2.velocityBias - this.v_K.c * ax - this.v_K.d * ay;

            // const k_errorTol = 1e-3;
            // NOT_USED(k_errorTol);

            for (; ;) {
                //
                // Case 1: vn = 0
                //
                // 0 = A * x + b'
                //
                // Solve for x:
                //
                // x = - inv(A) * b'
                //
                // const x = Mat22.mulVec2(this.v_normalMass, b).neg();
                // optimization:
                //     Mat22.mulVec2(this.v_normalMass, b) =>
                //     x: this.v_normalMass.a * bx + this.v_normalMass.b * by
                //     y: this.v_normalMass.c * bx + this.v_normalMass.d * by
                let xx = -this.v_normalMass.a * bx - this.v_normalMass.b * by;
                let xy = -this.v_normalMass.c * bx - this.v_normalMass.d * by;

                if (xx >= 0.0 && xy >= 0.0) {
                    // Get the incremental impulse
                    // const d = Vec2.sub(x, a);
                    // const d = new Vec2(xx - ax, xy - ay);

                    // Apply incremental impulse
                    // const P1 = Vec2.mul(d.x, normal);
                    // const P2 = Vec2.mul(d.y, normal);

                    // TODO: optimize
                    const P1x = normal.x * (xx - ax);
                    const P1y = normal.y * (xx - ax);
                    const P2x = normal.x * (xy - ay);
                    const P2y = normal.y * (xy - ay);

                    // vA.subCombine(mA, P1, mA, P2);
                    // vB.addCombine(mB, P1, mB, P2);
                    // TODO: optimize
                    vA.x -= mA * (P1x + P2x);
                    vA.y -= mA * (P1y + P2y);
                    vB.x += mB * (P1x + P2x);
                    vB.y += mB * (P1y + P2y);

                    // wA -= iA * (Vec2.cross(vcp1.rA, P1) + Vec2.cross(vcp2.rA, P2));
                    // wB += iB * (Vec2.cross(vcp1.rB, P1) + Vec2.cross(vcp2.rB, P2));
                    // Optimization
                    wA -= iA * (vcp1.rA.x * P1y - vcp1.rA.y * P1x + vcp2.rA.x * P2y - vcp2.rA.y * P2x);
                    wB += iB * (vcp1.rB.x * P1y - vcp1.rB.y * P1x + vcp2.rB.x * P2y - vcp2.rB.y * P2x);

                    // Accumulate
                    vcp1.normalImpulse = xx;
                    vcp2.normalImpulse = xy;

                    // TODO
                    // if (DEBUG_SOLVER) {
                    //     // Postconditions
                    //     dv1 = Vec2.add(
                    //         vB,
                    //         Vec2.sub(
                    //             Vec2.crossSV(wB, vcp1.rB),
                    //             Vec2.add(vA, Vec2.crossSV(wA, vcp1.rA))
                    //         )
                    //     );
                    //     dv2 = Vec2.add(
                    //         vB,
                    //         Vec2.sub(
                    //             Vec2.crossSV(wB, vcp2.rB),
                    //             Vec2.add(vA, Vec2.crossSV(wA, vcp2.rA))
                    //         )
                    //     );
                    //
                    //     // Compute normal velocity
                    //     vn1 = Vec2.dot(dv1, normal);
                    //     vn2 = Vec2.dot(dv2, normal);
                    //
                    //     PLANCK_ASSERT && assert(Math.abs(vn1 - vcp1.velocityBias) < k_errorTol);
                    //     PLANCK_ASSERT && assert(Math.abs(vn2 - vcp2.velocityBias) < k_errorTol);
                    // }
                    break;
                }

                //
                // Case 2: vn1 = 0 and x2 = 0
                //
                // 0 = a11 * x1 + a12 * 0 + b1'
                // vn2 = a21 * x1 + a22 * 0 + b2'
                //
                xx = -vcp1.normalMass * bx;
                xy = 0.0;
                vn1 = 0.0;
                vn2 = this.v_K.c * xx + by;

                if (xx >= 0.0 && vn2 >= 0.0) {
                    // Get the incremental impulse
                    // const d = Vec2.sub(x, a);

                    // Apply incremental impulse
                    // const P1 = Vec2.mul(d.x, normal);
                    // const P2 = Vec2.mul(d.y, normal);

                    const P1x = normal.x * (xx - ax);
                    const P1y = normal.y * (xx - ax);
                    const P2x = normal.x * (xy - ay);
                    const P2y = normal.y * (xy - ay);

                    // vA.subCombine(mA, P1, mA, P2);
                    // vB.addCombine(mB, P1, mB, P2);
                    vA.x -= mA * (P1x + P2x);
                    vA.y -= mA * (P1y + P2y);
                    vB.x += mB * (P1x + P2x);
                    vB.y += mB * (P1y + P2y);

                    // wA -= iA * (Vec2.cross(vcp1.rA, P1) + Vec2.cross(vcp2.rA, P2));
                    // wB += iB * (Vec2.cross(vcp1.rB, P1) + Vec2.cross(vcp2.rB, P2));
                    wA -= iA * (vcp1.rA.x * P1y - vcp1.rA.y * P1x + vcp2.rA.x * P2y - vcp2.rA.y * P2x);
                    wB += iB * (vcp1.rB.x * P1y - vcp1.rB.y * P1x + vcp2.rB.x * P2y - vcp2.rB.y * P2x);

                    // Accumulate
                    vcp1.normalImpulse = xx;
                    vcp2.normalImpulse = xy;

                    // TODO
                    // if (DEBUG_SOLVER) {
                    //     // Postconditions
                    //     const dv1B = Vec2.add(vB, Vec2.crossSV(wB, vcp1.rB));
                    //     const dv1A = Vec2.add(vA, Vec2.crossSV(wA, vcp1.rA));
                    //     const dv1 = Vec2.sub(dv1B, dv1A);
                    //
                    //     // Compute normal velocity
                    //     vn1 = Vec2.dot(dv1, normal);
                    //
                    //     PLANCK_ASSERT && assert(Math.abs(vn1 - vcp1.velocityBias) < k_errorTol);
                    // }
                    break;
                }

                //
                // Case 3: vn2 = 0 and x1 = 0
                //
                // vn1 = a11 * 0 + a12 * x2 + b1'
                // 0 = a21 * 0 + a22 * x2 + b2'
                //
                xx = 0.0;
                xy = -vcp2.normalMass * by;
                vn1 = this.v_K.b * xy + bx;
                vn2 = 0.0;

                if (xy >= 0.0 && vn1 >= 0.0) {
                    // Resubstitute for the incremental impulse
                    // const d = Vec2.sub(x, a);

                    // Apply incremental impulse
                    // const P1 = Vec2.mul(d.x, normal);
                    // const P2 = Vec2.mul(d.y, normal);

                    const P1x = normal.x * (xx - ax);
                    const P1y = normal.y * (xx - ax);
                    const P2x = normal.x * (xy - ay);
                    const P2y = normal.y * (xy - ay);

                    // vA.subCombine(mA, P1, mA, P2);
                    vA.x -= mA * (P1x + P2x);
                    vA.y -= mA * (P1y + P2y);

                    // vB.addCombine(mB, P1, mB, P2);
                    vB.x += mB * (P1x + P2x);
                    vB.y += mB * (P1y + P2y);

                    // wA -= iA * (Vec2.cross(vcp1.rA, P1) + Vec2.cross(vcp2.rA, P2));
                    wA -= iA * (vcp1.rA.x * P1y - vcp1.rA.y * P1x + vcp2.rA.x * P2y - vcp2.rA.y * P2x);

                    // wB += iB * (Vec2.cross(vcp1.rB, P1) + Vec2.cross(vcp2.rB, P2));
                    wB += iB * (vcp1.rB.x * P1y - vcp1.rB.y * P1x + vcp2.rB.x * P2y - vcp2.rB.y * P2x);

                    // Accumulate
                    vcp1.normalImpulse = xx;
                    vcp2.normalImpulse = xy;

                    // TODO:
                    // if (DEBUG_SOLVER) {
                    //     // Postconditions
                    //     const dv2B = Vec2.add(vB, Vec2.crossSV(wB, vcp2.rB));
                    //     const dv2A = Vec2.add(vA, Vec2.crossSV(wA, vcp2.rA));
                    //     const dv1 = Vec2.sub(dv2B, dv2A);
                    //
                    //     // Compute normal velocity
                    //     vn2 = Vec2.dot(dv2, normal);
                    //
                    //     PLANCK_ASSERT && assert(Math.abs(vn2 - vcp2.velocityBias) < k_errorTol);
                    // }
                    break;
                }

                //
                // Case 4: x1 = 0 and x2 = 0
                //
                // vn1 = b1
                // vn2 = b2;
                //
                xx = 0.0;
                xy = 0.0;
                vn1 = bx;
                vn2 = by;

                if (vn1 >= 0.0 && vn2 >= 0.0) {
                    // Resubstitute for the incremental impulse
                    // const d = Vec2.sub(x, a);

                    // Apply incremental impulse
                    // const P1 = Vec2.mul(d.x, normal);
                    // const P2 = Vec2.mul(d.y, normal);

                    const P1x = normal.x * (xx - ax);
                    const P1y = normal.y * (xx - ax);
                    const P2x = normal.x * (xy - ay);
                    const P2y = normal.y * (xy - ay);

                    // vA.subCombine(mA, P1, mA, P2);
                    vA.x -= mA * (P1x + P2x);
                    vA.y -= mA * (P1y + P2y);

                    // vB.addCombine(mB, P1, mB, P2);
                    vB.x += mB * (P1x + P2x);
                    vB.y += mB * (P1y + P2y);

                    // wA -= iA * (Vec2.cross(vcp1.rA, P1) + Vec2.cross(vcp2.rA, P2));
                    //   Vec2.cross(vcp1.rA, P1) => vcp1.rA.x * P1.y - vcp1.rA.y * P1.x
                    //   Vec2.cross(vcp2.rA, P2) => vcp2.rA.x * P2.y - vcp2.rA.y * P2.x
                    wA -= iA * (vcp1.rA.x * P1y - vcp1.rA.y * P1x + vcp2.rA.x * P2y - vcp2.rA.y * P2x);

                    // wB += iB * (Vec2.cross(vcp1.rB, P1) + Vec2.cross(vcp2.rB, P2));
                    //   Vec2.cross(vcp1.rB, P1) => vcp1.rB.x * P1.y - vcp1.rB.y * P1.x
                    //   Vec2.cross(vcp2.rB, P2) => vcp1.rB.x * P2.y - vcp1.rB.y * P2.x
                    wB += iB * (vcp1.rB.x * P1y - vcp1.rB.y * P1x + vcp2.rB.x * P2y - vcp2.rB.y * P2x);

                    // Accumulate
                    vcp1.normalImpulse = xx;
                    vcp2.normalImpulse = xy;
                    break;
                }

                // No solution, give up. This is hit sometimes, but it doesn't seem to
                // matter.
                break;
            }
        }

        // velocityA.v.copyFrom(vA); // mod by ref
        bodyA.c_w = wA;

        // velocityB.v.copyFrom(vB); // mod by ref
        bodyB.c_w = wB;
    }

    static addType(type1: ShapeType, type2: ShapeType, callback: EvaluateFunction) {
        s_registers.set((type1 << 4) | type2, callback);
    }

    static create(fixtureA: Fixture, indexA: number, fixtureB: Fixture, indexB: number): Contact | null {
        const typeA = fixtureA.getType(); // Shape.Type
        const typeB = fixtureB.getType(); // Shape.Type

        // TODO: pool contacts
        let contact: Contact | undefined;
        let evaluateFcn: EvaluateFunction | undefined = s_registers.get((typeA << 4) | typeB);
        if (evaluateFcn !== undefined) {
            contact = new Contact(fixtureA, indexA, fixtureB, indexB, evaluateFcn);
        } else {
            evaluateFcn = s_registers.get((typeB << 4) | typeA);
            if (evaluateFcn) {
                contact = new Contact(fixtureB, indexB, fixtureA, indexA, evaluateFcn);
            } else {
                return null;
            }
        }

        // Contact creation may swap fixtures.
        fixtureA = contact.getFixtureA();
        fixtureB = contact.getFixtureB();
        // indexA = contact.getChildIndexA();
        // indexB = contact.getChildIndexB();
        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        // Connect to body A
        contact.m_nodeA.contact = contact;
        contact.m_nodeA.other = bodyB;

        contact.m_nodeA.prev = null;
        contact.m_nodeA.next = bodyA.m_contactList;
        if (bodyA.m_contactList != null) {
            bodyA.m_contactList.prev = contact.m_nodeA;
        }
        bodyA.m_contactList = contact.m_nodeA;

        // Connect to body B
        contact.m_nodeB.contact = contact;
        contact.m_nodeB.other = bodyA;

        contact.m_nodeB.prev = null;
        contact.m_nodeB.next = bodyB.m_contactList;
        if (bodyB.m_contactList != null) {
            bodyB.m_contactList.prev = contact.m_nodeB;
        }
        bodyB.m_contactList = contact.m_nodeB;

        // Wake up the bodies
        if (!fixtureA.isSensor() && !fixtureB.isSensor()) {
            bodyA.setAwake(true);
            bodyB.setAwake(true);
        }

        return contact;
    }

    static destroy(contact: Contact, listener: ContactListener) {
        const fixtureA = contact.m_fixtureA;
        const fixtureB = contact.m_fixtureB;

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        if (contact.isTouching()) {
            listener.endContact(contact);
        }

        // Remove from body 1
        if (contact.m_nodeA.prev) {
            contact.m_nodeA.prev.next = contact.m_nodeA.next;
        }

        if (contact.m_nodeA.next) {
            contact.m_nodeA.next.prev = contact.m_nodeA.prev;
        }

        if (contact.m_nodeA === bodyA.m_contactList) {
            bodyA.m_contactList = contact.m_nodeA.next;
        }

        // Remove from body 2
        if (contact.m_nodeB.prev) {
            contact.m_nodeB.prev.next = contact.m_nodeB.next;
        }

        if (contact.m_nodeB.next) {
            contact.m_nodeB.next.prev = contact.m_nodeB.prev;
        }

        if (contact.m_nodeB === bodyB.m_contactList) {
            bodyB.m_contactList = contact.m_nodeB.next;
        }

        if (contact.m_manifold.pointCount > 0 && !fixtureA.isSensor() && !fixtureB.isSensor()) {
            bodyA.setAwake(true);
            bodyB.setAwake(true);
        }

        // TODO: !!!!
        // const typeA = fixtureA.getType(); // Shape.Type
        // const typeB = fixtureB.getType(); // Shape.Type
        // const destroyFcn = s_registers[typeA][typeB].destroyFcn;
        // if (typeof destroyFcn === 'function') {
        //     destroyFcn(contact);
        // }
    }
}

// TODO merge with ManifoldPoint
class VelocityConstraintPoint {
    readonly rA = new Vec2(0, 0);
    readonly rB = new Vec2(0, 0);
    normalImpulse = 0;
    tangentImpulse = 0;
    normalMass = 0;
    tangentMass = 0;
    velocityBias = 0;
}


