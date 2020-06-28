import {Vec2} from "./Vec2";
import {MathUtil} from "./Math";

// TODO merge with Transform
export class Rot {
    constructor(public s: number,
                public c: number) {
    }

    static neo(angle: number): Rot {
        const r = new Rot(0, 1);
        r.setAngle(angle);
        return r;
    }

    clone(): Rot {
        return new Rot(this.s, this.c);
    }

    static clone(rot: Rot): Rot {
        PLANCK_ASSERT && Rot.assert(rot);
        return new Rot(rot.s, rot.c);
    };

    static identity(): Rot {
        return new Rot(0.0, 1.0);
    };

    static isValid(o: any) {
        return o && MathUtil.isFinite(o.s) && MathUtil.isFinite(o.c);
    }

    static assert(o: any) {
        if (!PLANCK_ASSERT) return;
        if (!Rot.isValid(o)) {
            PLANCK_DEBUG && console.debug(o);
            throw new Error('Invalid Rot!');
        }
    }

    /**
     * Set to the identity rotation.
     */
    setIdentity() {
        this.s = 0.0;
        this.c = 1.0;
    }

    set(r: Rot) {
        PLANCK_ASSERT && Rot.assert(r);
        this.s = r.s;
        this.c = r.c;
    }

    /**
     * Set using an angle in radians.
     */
    setAngle(angle: number) {
        PLANCK_ASSERT && MathUtil.assert(angle);
        // TODO_ERIN optimize
        this.s = Math.sin(angle);
        this.c = Math.cos(angle);
    };

    /**
     * Get the angle in radians.
     */
    getAngle() {
        return Math.atan2(this.s, this.c);
    }

    /**
     * Get the x-axis.
     */
    getXAxis() {
        return Vec2.neo(this.c, this.s);
    }

    /**
     * Get the u-axis.
     */
    getYAxis() {
        return Vec2.neo(-this.s, this.c);
    }

    /**
     * Multiply two rotations: q * r
     *
     * @returns Rot
     */
    static mulRot(rot: Rot, m: Rot) {
        PLANCK_ASSERT && Rot.assert(rot);
        PLANCK_ASSERT && Rot.assert(m);
        // [qc -qs] * [rc -rs] = [qc*rc-qs*rs -qc*rs-qs*rc]
        // [qs qc] [rs rc] [qs*rc+qc*rs -qs*rs+qc*rc]
        // s = qs * rc + qc * rs
        // c = qc * rc - qs * rs
        const qr = Rot.identity();
        qr.s = rot.s * m.c + rot.c * m.s;
        qr.c = rot.c * m.c - rot.s * m.s;
        return qr;
    }

    /**
     * Rotate a vector
     *
     * @returns Vec2
     */
    static mulVec2(rot: Rot, m: Vec2): Vec2 {
        PLANCK_ASSERT && Rot.assert(rot);
        PLANCK_ASSERT && Vec2.assert(m);
        return Vec2.neo(rot.c * m.x - rot.s * m.y, rot.s * m.x + rot.c * m.y);
    }

    static mulSub(rot: Rot, v: Vec2, w: Vec2): Vec2 {
        const x = rot.c * (v.x - w.x) - rot.s * (v.y - w.y);
        const y = rot.s * (v.x - w.x) + rot.c * (v.y - w.y);
        return Vec2.neo(x, y);
    }

    /**
     * Transpose multiply two rotations: qT * r
     *
     * @returns Rot
     */
    static mulTRot(rot: Rot, m: Rot): Rot {
        PLANCK_ASSERT && Rot.assert(m);
        // [ qc qs] * [rc -rs] = [qc*rc+qs*rs -qc*rs+qs*rc]
        // [-qs qc] [rs rc] [-qs*rc+qc*rs qs*rs+qc*rc]
        // s = qc * rs - qs * rc
        // c = qc * rc + qs * rs
        const qr = Rot.identity();
        qr.s = rot.c * m.s - rot.s * m.c;
        qr.c = rot.c * m.c + rot.s * m.s;
        return qr;
    }

    /**
     * Inverse rotate a vector
     *
     * @returns Vec2
     */
    static mulTVec2(rot: Rot, m: Vec2): Vec2 {
        PLANCK_ASSERT && Vec2.assert(m);
        return Vec2.neo(rot.c * m.x + rot.s * m.y, -rot.s * m.x + rot.c * m.y);
    }

}