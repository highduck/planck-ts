import {IVec2, Vec2} from "./common/Vec2";
import {assert} from "./util/common";
import {MathUtil} from "./common/Math";
import {Sweep} from "./common/Sweep";
import {Transform} from "./common/Transform";
import {MassData} from "./MassData";
import {Fixture, FixtureDef} from "./Fixture";
import {Rot} from "./common/Rot";
import {World} from "./World";
import {ContactEdge} from "./Contact";
import {Shape} from "./Shape";
import {JointEdge} from "./Joint";

export const enum BodyType {
    STATIC = 0,
    KINEMATIC = 1,
    DYNAMIC = 2
}

/**
 * @typedef {Object} BodyDef
 *
 * @prop type Body types are static, kinematic, or dynamic. Note: if a dynamic
 *       body would have zero mass, the mass is set to one.
 *
 * @prop position The world position of the body. Avoid creating bodies at the
 *       origin since this can lead to many overlapping shapes.
 *
 * @prop angle The world angle of the body in radians.
 *
 * @prop linearVelocity The linear velocity of the body's origin in world
 *       co-ordinates.
 *
 * @prop angularVelocity
 *
 * @prop linearDamping Linear damping is use to reduce the linear velocity. The
 *       damping parameter can be larger than 1.0 but the damping effect becomes
 *       sensitive to the time step when the damping parameter is large.
 *
 * @prop angularDamping Angular damping is use to reduce the angular velocity.
 *       The damping parameter can be larger than 1.0 but the damping effect
 *       becomes sensitive to the time step when the damping parameter is large.
 *
 * @prop fixedRotation Should this body be prevented from rotating? Useful for
 *       characters.
 *
 * @prop bullet Is this a fast moving body that should be prevented from
 *       tunneling through other moving bodies? Note that all bodies are
 *       prevented from tunneling through kinematic and static bodies. This
 *       setting is only considered on dynamic bodies. Warning: You should use
 *       this flag sparingly since it increases processing time.
 *
 * @prop active Does this body start out active?
 *
 * @prop awake Is this body initially awake or sleeping?
 *
 * @prop allowSleep Set this flag to false if this body should never fall
 *       asleep. Note that this increases CPU usage.
 */
export interface BodyDef {
    type?: BodyType; // static
    position?: Vec2; // zero
    angle?: number; // 0

    linearVelocity?: Vec2; // zero
    angularVelocity?: number; // 0

    linearDamping?: number; // 0
    angularDamping?: number; // 0

    fixedRotation?: boolean; // false
    bullet?: boolean; // false
    gravityScale?: number; // 1

    allowSleep?: boolean; // true
    awake?: boolean; // true
    active?: boolean; // true

    userData?: any;
}

export type BodyRestoreFunction<T> = (ctor: T, data: any, b: Body) => T;

/**
 * @class
 *
 * A rigid body composed of one or more fixtures.
 *
 * @param {World} world
 * @param {BodyDef} def
 */
export class Body {
    static readonly STATIC = BodyType.STATIC;
    static readonly KINEMATIC = BodyType.KINEMATIC;
    static readonly DYNAMIC = BodyType.DYNAMIC;

    m_awakeFlag: boolean;
    m_autoSleepFlag: boolean;
    m_bulletFlag: boolean;
    m_fixedRotationFlag: boolean;
    m_activeFlag: boolean;
    m_userData: any;
    m_type: BodyType;

    m_islandFlag = false;
    m_toiFlag = false;

// Rotational inertia about the center of mass.
    m_I = 0.0;
    m_invI = 0.0;

    m_mass: number;
    m_invMass: number;

// the body origin transform
    readonly m_xf = Transform.identity();

// the swept motion for CCD
    readonly m_sweep = new Sweep();

// position and velocity correction
    readonly c_vel = new Vec2(0.0, 0.0);
    c_w = 0.0;
    readonly c_pos = new Vec2(0.0, 0.0);
    c_a = 0.0;

    readonly m_force = Vec2.zero();
    m_torque = 0.0;

    readonly m_linearVelocity = new Vec2(0, 0);
    m_angularVelocity: number;
    m_linearDamping: number;
    m_angularDamping: number;
    m_gravityScale: number;

    m_sleepTime = 0.0;

    m_jointList: JointEdge | null = null;
    m_contactList: ContactEdge | null = null;
    m_fixtureList: Fixture | null = null;

    m_prev: Body | null = null;
    m_next: Body | null = null;

    m_destroyed = false;

    constructor(readonly m_world: World, def: BodyDef) {

        if (PLANCK_ASSERT) {
            def.position !== undefined && assert(Vec2.isValid(def.position));
            def.linearVelocity !== undefined && assert(Vec2.isValid(def.linearVelocity));
            def.angle !== undefined && assert(MathUtil.isFinite(def.angle));
            def.angularVelocity !== undefined && assert(MathUtil.isFinite(def.angularVelocity));
            def.angularDamping !== undefined && assert(MathUtil.isFinite(def.angularDamping) && def.angularDamping >= 0.0);
            def.linearDamping !== undefined && assert(MathUtil.isFinite(def.linearDamping) && def.linearDamping >= 0.0);
        }

        this.m_awakeFlag = def.awake ?? true;
        this.m_autoSleepFlag = def.allowSleep ?? true;
        this.m_bulletFlag = !!def.bullet;
        this.m_fixedRotationFlag = !!def.fixedRotation;
        this.m_activeFlag = def.active ?? true;
        this.m_userData = def.userData;
        this.m_type = def.type ?? BodyType.STATIC;

        if (this.m_type === BodyType.DYNAMIC) {
            this.m_mass = 1.0;
            this.m_invMass = 1.0;
        } else {
            this.m_mass = 0.0;
            this.m_invMass = 0.0;
        }

        // the body origin transform
        this.m_xf.setPosAngle(def.position ?? Vec2.ZERO, def.angle ?? 0);

        // the swept motion for CCD
        this.m_sweep.setTransform(this.m_xf);

        this.m_linearVelocity.copyFrom(def.linearVelocity ?? Vec2.ZERO);
        this.m_angularVelocity = def.angularVelocity ?? 0;

        this.m_linearDamping = def.linearDamping ?? 0;
        this.m_angularDamping = def.angularDamping ?? 0;
        this.m_gravityScale = def.gravityScale ?? 1;
    }

    isWorldLocked() {
        return this.m_world && this.m_world.isLocked();
    }

    getWorld() {
        return this.m_world;
    }

    getNext() {
        return this.m_next;
    }


    setUserData(data: any) {
        this.m_userData = data;
    }

    getUserData() {
        return this.m_userData;
    }

    getFixtureList() {
        return this.m_fixtureList;
    }

    getJointList() {
        return this.m_jointList;
    }

    /**
     * Warning: this list changes during the time step and you may miss some
     * collisions if you don't use ContactListener.
     */
    getContactList(): ContactEdge | null {
        return this.m_contactList;
    }

    isStatic() {
        return this.m_type === BodyType.STATIC;
    }

    isDynamic() {
        return this.m_type === BodyType.DYNAMIC;
    }

    isKinematic() {
        return this.m_type === BodyType.KINEMATIC;
    }

    /**
     * This will alter the mass and velocity.
     */

    setStatic() {
        this.setType(BodyType.STATIC);
        return this;
    }

    setDynamic() {
        this.setType(BodyType.DYNAMIC);
        return this;
    }

    setKinematic() {
        this.setType(BodyType.KINEMATIC);
        return this;
    }

    getType() {
        return this.m_type;
    }

    setType(type: BodyType) {
        PLANCK_ASSERT && assert(type === BodyType.STATIC || type === BodyType.KINEMATIC || type === BodyType.DYNAMIC);
        PLANCK_ASSERT && assert(!this.isWorldLocked());

        if (this.isWorldLocked()) {
            return;
        }

        if (this.m_type === type) {
            return;
        }

        this.m_type = type;

        this.resetMassData();

        if (this.m_type === BodyType.STATIC) {
            this.m_linearVelocity.setZero();
            this.m_angularVelocity = 0.0;
            this.m_sweep.forward();
            this.synchronizeFixtures();
        }

        this.setAwake(true);

        this.m_force.setZero();
        this.m_torque = 0.0;

        // Delete the attached contacts.
        let ce = this.m_contactList;
        while (ce) {
            const ce0 = ce;
            ce = ce.next;
            this.m_world.destroyContact(ce0.contact);
        }
        this.m_contactList = null;

        // Touch the proxies so that new contacts will be created (when appropriate)
        const broadPhase = this.m_world.m_broadPhase;
        for (let f = this.m_fixtureList; f; f = f.m_next) {
            const proxyCount = f.m_proxyCount;
            for (let i = 0; i < proxyCount; ++i) {
                broadPhase.touchProxy(f.m_proxies[i].proxyId);
            }
        }
    }

    isBullet() {
        return this.m_bulletFlag;
    }

    /**
     * Should this body be treated like a bullet for continuous collision detection?
     */
    setBullet(flag: boolean) {
        this.m_bulletFlag = flag;
    }

    isSleepingAllowed() {
        return this.m_autoSleepFlag;
    }

    setSleepingAllowed(flag: boolean) {
        this.m_autoSleepFlag = flag;
        if (!this.m_autoSleepFlag) {
            this.setAwake(true);
        }
    }

    isAwake() {
        return this.m_awakeFlag;
    }

    /**
     * Set the sleep state of the body. A sleeping body has very low CPU cost.
     *
     * @param flag Set to true to wake the body, false to put it to sleep.
     */
    setAwake(flag: boolean) {
        if (flag) {
            if (!this.m_awakeFlag) {
                this.m_awakeFlag = true;
                this.m_sleepTime = 0.0;
            }
        } else {
            this.m_awakeFlag = false;
            this.m_sleepTime = 0.0;
            this.m_linearVelocity.setZero();
            this.m_angularVelocity = 0.0;
            this.m_force.setZero();
            this.m_torque = 0.0;
        }
    }

    isActive(): boolean {
        return this.m_activeFlag;
    }

    /**
     * Set the active state of the body. An inactive body is not simulated and
     * cannot be collided with or woken up. If you pass a flag of true, all fixtures
     * will be added to the broad-phase. If you pass a flag of false, all fixtures
     * will be removed from the broad-phase and all contacts will be destroyed.
     * Fixtures and joints are otherwise unaffected.
     *
     * You may continue to create/destroy fixtures and joints on inactive bodies.
     * Fixtures on an inactive body are implicitly inactive and will not participate
     * in collisions, ray-casts, or queries. Joints connected to an inactive body
     * are implicitly inactive. An inactive body is still owned by a World object
     * and remains
     */
    setActive(flag: boolean) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());

        if (flag === this.m_activeFlag) {
            return;
        }

        this.m_activeFlag = flag;

        if (this.m_activeFlag) {
            // Create all proxies.
            const broadPhase = this.m_world.m_broadPhase;
            for (let f = this.m_fixtureList; f; f = f.m_next) {
                f.createProxies(broadPhase, this.m_xf);
            }
            // Contacts are created the next time step.

        } else {
            // Destroy all proxies.
            const broadPhase = this.m_world.m_broadPhase;
            for (let f = this.m_fixtureList; f; f = f.m_next) {
                f.destroyProxies(broadPhase);
            }

            // Destroy the attached contacts.
            let ce = this.m_contactList;
            while (ce) {
                const ce0 = ce;
                ce = ce.next;
                this.m_world.destroyContact(ce0.contact);
            }
            this.m_contactList = null;
        }
    }

    isFixedRotation() {
        return this.m_fixedRotationFlag;
    }

    /**
     * Set this body to have fixed rotation. This causes the mass to be reset.
     */
    setFixedRotation(flag: boolean) {
        if (this.m_fixedRotationFlag === flag) {
            return;
        }

        this.m_fixedRotationFlag = flag;
        this.m_angularVelocity = 0.0;
        this.resetMassData();
    }

    /**
     * Get the world transform for the body's origin.
     */
    getTransform() {
        return this.m_xf;
    }

    /**
     * Set the position of the body's origin and rotation. Manipulating a body's
     * transform may cause non-physical behavior. Note: contacts are updated on the
     * next call to World.step.
     *
     * @param position The world position of the body's local origin.
     * @param angle The world rotation in radians.
     */

    setTransform(position: IVec2, angle: number) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());
        if (this.isWorldLocked()) {
            return;
        }

        this.m_xf.setPosAngle(position, angle);
        this.m_sweep.setTransform(this.m_xf);

        const broadPhase = this.m_world.m_broadPhase;
        for (let f = this.m_fixtureList; f; f = f.m_next) {
            f.synchronize(broadPhase, this.m_xf, this.m_xf);
        }
    }

    setTransform2(xf: Transform) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());
        if (this.isWorldLocked()) {
            return;
        }

        this.m_xf.copyFrom(xf);
        this.m_sweep.setTransform(xf);

        const broadPhase = this.m_world.m_broadPhase;
        for (let f = this.m_fixtureList; f; f = f.m_next) {
            f.synchronize1(broadPhase, xf);
        }
    }

    synchronizeTransform() {
        this.m_sweep.getTransform(this.m_xf, 1);
    }

    synchronizeFixtures() {
        const xf0 = Transform.identity();
        this.m_sweep.getTransform(xf0, 0);

        const broadPhase = this.m_world.m_broadPhase;
        for (let f = this.m_fixtureList; f; f = f.m_next) {
            f.synchronize(broadPhase, xf0, this.m_xf);
        }
    }

    /**
     * Used in TOI.
     */
    advance(alpha: number) {
        // Advance to the new safe time. This doesn't sync the broad-phase.
        this.m_sweep.advance(alpha);
        this.m_sweep.c.copyFrom(this.m_sweep.c0);
        this.m_sweep.a = this.m_sweep.a0;
        this.m_sweep.getTransform(this.m_xf, 1);
    }

    /**
     * Get the world position for the body's origin.
     */
    getPosition(): IVec2 {
        return this.m_xf;
    }

    setPosition(p: Vec2) {
        this.setTransform(p, this.m_sweep.a);
    }

    /**
     * Get the current world rotation angle in radians.
     */
    getAngle() {
        return this.m_sweep.a;
    }

    setAngle(angle: number) {
        this.setTransform(this.m_xf, angle);
    }

    /**
     * Get the world position of the center of mass.
     */

    getWorldCenter() {
        return this.m_sweep.c;
    }

    /**
     * Get the local position of the center of mass.
     */
    getLocalCenter() {
        return this.m_sweep.localCenter;
    }

    /**
     * Get the linear velocity of the center of mass.
     *
     * @return the linear velocity of the center of mass.
     */
    getLinearVelocity() {
        return this.m_linearVelocity;
    }

    /**
     * Get the world linear velocity of a world point attached to this body.
     *
     * @param worldPoint A point in world coordinates.
     */
    getLinearVelocityFromWorldPoint(worldPoint: Vec2) {
        const localCenter = Vec2.sub(worldPoint, this.m_sweep.c);
        return Vec2.add(this.m_linearVelocity, Vec2.crossSV(this.m_angularVelocity, localCenter));
    }

    /**
     * Get the world velocity of a local point.
     *
     * @param localPoint A point in local coordinates.
     */

    getLinearVelocityFromLocalPoint(localPoint: Vec2) {
        return this.getLinearVelocityFromWorldPoint(this.getWorldPoint(localPoint));
    }

    /**
     * Set the linear velocity of the center of mass.
     *
     * @param v The new linear velocity of the center of mass.
     */
    setLinearVelocity(v: Vec2) {
        if (this.m_type === BodyType.STATIC) {
            return;
        }
        if (Vec2.dot(v, v) > 0.0) {
            this.setAwake(true);
        }
        this.m_linearVelocity.copyFrom(v);
    }

    /**
     * Get the angular velocity.
     *
     * @returns the angular velocity in radians/second.
     */

    getAngularVelocity() {
        return this.m_angularVelocity;
    }

    /**
     * Set the angular velocity.
     *
     * @param omega The new angular velocity in radians/second.
     */

    setAngularVelocity(omega: number) {
        if (this.m_type === BodyType.STATIC) {
            return;
        }
        if (omega * omega > 0.0) {
            this.setAwake(true);
        }
        this.m_angularVelocity = omega;
    }

    getLinearDamping() {
        return this.m_linearDamping;
    }

    setLinearDamping(linearDamping: number) {
        this.m_linearDamping = linearDamping;
    }

    getAngularDamping() {
        return this.m_angularDamping;
    }


    setAngularDamping(angularDamping: number) {
        this.m_angularDamping = angularDamping;
    }

    getGravityScale() {
        return this.m_gravityScale;
    }

    /**
     * Scale the gravity applied to this body.
     */

    setGravityScale(scale: number) {
        this.m_gravityScale = scale;
    }

    /**
     * Get the total mass of the body.
     *
     * @returns The mass, usually in kilograms (kg).
     */
    getMass() {
        return this.m_mass;
    }

    /**
     * Get the rotational inertia of the body about the local origin.
     *
     * @return the rotational inertia, usually in kg-m^2.
     */
    getInertia() {
        const lc = this.m_sweep.localCenter;
        return this.m_I + this.m_mass * Vec2.dot(lc, lc);
    }

    /**
     * Copy the mass data of the body to data.
     */
    getMassData(data: MassData) {
        data.mass = this.m_mass;
        data.I = this.getInertia();
        data.center.copyFrom(this.m_sweep.localCenter);
    }

    /**
     * This resets the mass properties to the sum of the mass properties of the
     * fixtures. This normally does not need to be called unless you called
     * SetMassData to override the mass and you later want to reset the mass.
     */
    resetMassData() {
        // Compute mass data from shapes. Each shape has its own density.
        this.m_mass = 0.0;
        this.m_invMass = 0.0;
        this.m_I = 0.0;
        this.m_invI = 0.0;
        this.m_sweep.localCenter.setZero();

        // Static and kinematic bodies have zero mass.
        if (this.m_type !== BodyType.DYNAMIC) {
            this.m_sweep.c0.copyFrom(this.m_xf);
            this.m_sweep.c.copyFrom(this.m_xf);
            this.m_sweep.a0 = this.m_sweep.a;
            return;
        }

        PLANCK_ASSERT && assert(this.isDynamic());

        // Accumulate mass over all fixtures.
        const localCenter = Vec2.zero();
        for (let f = this.m_fixtureList; f; f = f.m_next) {
            if (f.m_density == 0.0) {
                continue;
            }

            const massData = new MassData();
            f.getMassData(massData);
            this.m_mass += massData.mass;
            localCenter.addMul(massData.mass, massData.center);
            this.m_I += massData.I;
        }

        // Compute center of mass.
        if (this.m_mass > 0.0) {
            this.m_invMass = 1.0 / this.m_mass;
            localCenter.mul(this.m_invMass);

        } else {
            // Force all dynamic bodies to have a positive mass.
            this.m_mass = 1.0;
            this.m_invMass = 1.0;
        }

        if (this.m_I > 0.0 && !this.m_fixedRotationFlag) {
            // Center the inertia about the center of mass.
            this.m_I -= this.m_mass * Vec2.dot(localCenter, localCenter);
            PLANCK_ASSERT && assert(this.m_I > 0.0);
            this.m_invI = 1.0 / this.m_I;

        } else {
            this.m_I = 0.0;
            this.m_invI = 0.0;
        }

        // Move center of mass.
        const oldCenter = Vec2.clone(this.m_sweep.c);
        this.m_sweep.setLocalCenter(localCenter, this.m_xf);

        // Update center of mass velocity.
        this.m_linearVelocity.add(Vec2.crossSV(this.m_angularVelocity, Vec2.sub(
            this.m_sweep.c, oldCenter)));
    }

    /**
     * Set the mass properties to override the mass properties of the fixtures. Note
     * that this changes the center of mass position. Note that creating or
     * destroying fixtures can also alter the mass. This function has no effect if
     * the body isn't dynamic.
     *
     * @param massData The mass properties.
     */
    setMassData(massData: MassData) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());
        if (this.isWorldLocked()) {
            return;
        }

        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }

        this.m_invMass = 0.0;
        this.m_I = 0.0;
        this.m_invI = 0.0;

        this.m_mass = massData.mass;
        if (this.m_mass <= 0.0) {
            this.m_mass = 1.0;
        }

        this.m_invMass = 1.0 / this.m_mass;

        if (massData.I > 0.0 && !this.m_fixedRotationFlag) {
            this.m_I = massData.I - this.m_mass
                * Vec2.dot(massData.center, massData.center);
            PLANCK_ASSERT && assert(this.m_I > 0.0);
            this.m_invI = 1.0 / this.m_I;
        }

        // Move center of mass.
        const oldCenter = Vec2.clone(this.m_sweep.c);
        this.m_sweep.setLocalCenter(massData.center, this.m_xf);

        // Update center of mass velocity.
        this.m_linearVelocity.add(Vec2.crossSV(this.m_angularVelocity, Vec2.sub(this.m_sweep.c, oldCenter)));
    }

    /**
     * Apply a force at a world point. If the force is not applied at the center of
     * mass, it will generate a torque and affect the angular velocity. This wakes
     * up the body.
     *
     * @param force The world force vector, usually in Newtons (N).
     * @param point The world position of the point of application.
     * @param wake Also wake up the body
     */

    applyForce(force: Vec2, point: Vec2, wake: boolean) {
        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }
        if (wake && !this.m_awakeFlag) {
            this.setAwake(true);
        }
        // Don't accumulate a force if the body is sleeping.
        if (this.m_awakeFlag) {
            this.m_force.add(force);
            this.m_torque += Vec2.cross(Vec2.sub(point, this.m_sweep.c), force);
        }
    }

    /**
     * Apply a force to the center of mass. This wakes up the body.
     *
     * @param force The world force vector, usually in Newtons (N).
     * @param wake Also wake up the body
     */

    applyForceToCenter(force: Vec2, wake: boolean) {
        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }
        if (wake && !this.m_awakeFlag) {
            this.setAwake(true);
        }
        // Don't accumulate a force if the body is sleeping
        if (this.m_awakeFlag) {
            this.m_force.add(force);
        }
    }

    /**
     * Apply a torque. This affects the angular velocity without affecting the
     * linear velocity of the center of mass. This wakes up the body.
     *
     * @param torque About the z-axis (out of the screen), usually in N-m.
     * @param wake Also wake up the body
     */
    applyTorque(torque: number, wake: boolean) {
        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }
        if (wake && !this.m_awakeFlag) {
            this.setAwake(true);
        }
        // Don't accumulate a force if the body is sleeping
        if (this.m_awakeFlag) {
            this.m_torque += torque;
        }
    }

    /**
     * Apply an impulse at a point. This immediately modifies the velocity. It also
     * modifies the angular velocity if the point of application is not at the
     * center of mass. This wakes up the body.
     *
     * @param impulse The world impulse vector, usually in N-seconds or kg-m/s.
     * @param point The world position of the point of application.
     * @param wake Also wake up the body
     */

    applyLinearImpulse(impulse: Vec2, point: Vec2, wake: boolean) {
        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }
        if (wake && !this.m_awakeFlag) {
            this.setAwake(true);
        }

        // Don't accumulate velocity if the body is sleeping
        if (this.m_awakeFlag) {
            this.m_linearVelocity.addMul(this.m_invMass, impulse);
            this.m_angularVelocity += this.m_invI * Vec2.cross(Vec2.sub(point, this.m_sweep.c), impulse);
        }
    }

    /**
     * Apply an angular impulse.
     *
     * @param impulse The angular impulse in units of kg*m*m/s
     * @param wake Also wake up the body
     */
    applyAngularImpulse(impulse: number, wake: boolean) {
        if (this.m_type !== BodyType.DYNAMIC) {
            return;
        }

        if (wake && !this.m_awakeFlag) {
            this.setAwake(true);
        }
        // Don't accumulate velocity if the body is sleeping
        if (this.m_awakeFlag) {
            this.m_angularVelocity += this.m_invI * impulse;
        }
    }

    /**
     * This is used to prevent connected bodies (by joints) from colliding,
     * depending on the joint's collideConnected flag.
     */
    shouldCollide(that: Body) {
        // At least one body should be dynamic.
        if (this.m_type !== BodyType.DYNAMIC && that.m_type !== BodyType.DYNAMIC) {
            return false;
        }
        // Does a joint prevent collision?
        for (let jn = this.m_jointList; jn; jn = jn.next) {
            if (jn.other === that) {
                if (!jn.joint!.m_collideConnected) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * @internal Used for deserialize.
     */
    _addFixture(fixture: Fixture) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());
        if (this.isWorldLocked()) {
            return null;
        }

        if (this.m_activeFlag) {
            const broadPhase = this.m_world.m_broadPhase;
            fixture.createProxies(broadPhase, this.m_xf);
        }

        fixture.m_next = this.m_fixtureList;
        this.m_fixtureList = fixture;

        // Adjust mass properties if needed.
        if (fixture.m_density > 0.0) {
            this.resetMassData();
        }

        // Let the world know we have a new fixture. This will cause new contacts
        // to be created at the beginning of the next time step.
        this.m_world.m_newFixture = true;

        return fixture;
    }

    /**
     * Creates a fixture and attach it to this body.
     *
     * If the density is non-zero, this function automatically updates the mass of
     * the body.
     *
     * Contacts are not created until the next time step.
     *
     * Warning: This function is locked during callbacks.

     * @param {Shape|FixtureDef} shape Shape or fixture definition.
     * @param {FixtureDef|number} fixdef Fixture definition or just density.
     */
    createFixture(shape: Shape, def?: FixtureDef) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());

        if (this.isWorldLocked()) {
            throw new Error("world is locked");
        }

        const fixture = new Fixture(this, shape, def ?? {});
        this._addFixture(fixture);
        return fixture;
    }

    /**
     * Destroy a fixture. This removes the fixture from the broad-phase and destroys
     * all contacts associated with this fixture. This will automatically adjust the
     * mass of the body if the body is dynamic and the fixture has positive density.
     * All fixtures attached to a body are implicitly destroyed when the body is
     * destroyed.
     *
     * Warning: This function is locked during callbacks.
     *
     * @param fixture The fixture to be removed.
     */
    destroyFixture(fixture: Fixture) {
        PLANCK_ASSERT && assert(!this.isWorldLocked());

        if (this.isWorldLocked()) {
            return;
        }

        PLANCK_ASSERT && assert(fixture.m_body === this);

        // Remove the fixture from this body's singly linked list.
        let found = false;
        if (this.m_fixtureList === fixture) {
            this.m_fixtureList = fixture.m_next;
            found = true;
        } else {
            let node = this.m_fixtureList;
            while (node != null) {
                if (node.m_next === fixture) {
                    node.m_next = fixture.m_next;
                    found = true;
                    break;
                }
                node = node.m_next;
            }
        }

        // You tried to remove a shape that is not attached to this body.
        PLANCK_ASSERT && assert(found);

        // Destroy any contacts associated with the fixture.
        let edge = this.m_contactList;
        while (edge) {
            const c = edge.contact;
            edge = edge.next;

            const fixtureA = c.getFixtureA();
            const fixtureB = c.getFixtureB();

            if (fixture == fixtureA || fixture == fixtureB) {
                // This destroys the contact and removes it from
                // this body's contact list.
                this.m_world.destroyContact(c);
            }
        }

        if (this.m_activeFlag) {
            const broadPhase = this.m_world.m_broadPhase;
            fixture.destroyProxies(broadPhase);
        }

        fixture.m_body = null as unknown as Body; // TODO: investigate hash
        fixture.m_next = null;

        this.m_world.publish('remove-fixture', fixture);

        // Reset the mass data.
        this.resetMassData();
    }

    /**
     * Get the corresponding world point of a local point.
     */

    getWorldPoint(localPoint: Vec2): Vec2 {
        return Transform.mulVec2(this.m_xf, localPoint);
    }

    /**
     * Get the corresponding world vector of a local vector.
     */
    getWorldVector(localVector: Vec2): Vec2 {
        return Rot.mulVec2(this.m_xf, localVector);
    }

    /**
     * Gets the corresponding local point of a world point.
     */
    getLocalPoint(worldPoint: IVec2): Vec2 {
        return Transform.mulTVec2(this.m_xf, worldPoint);
    }

    /**
     *
     * Gets the corresponding local vector of a world vector.
     */
    getLocalVector(worldVector: Vec2): Vec2 {
        return Rot.mulTVec2(this.m_xf, worldVector);
    }
}