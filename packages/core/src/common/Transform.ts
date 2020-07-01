import {IVec2, Vec2} from "./Vec2";
import {Rot} from "./Rot";
import {MathUtil} from "./Math";

// TODO merge with Rot
export class Transform {
    /**
     * A transform contains translation and rotation. It is used to represent the
     * position and orientation of rigid frames. Initialize using a position vector
     * and a rotation.
     *
     * @prop {Vec2} position [zero]
     * @prop {Rot} rotation [identity]
     */
    // constructor(public p: Vec2,
    //             public q: Rot) {
    // }
    constructor(public x: number, public y: number,
                public s: number, public c: number) {
    }

    static create(x: number, y: number, angle: number): Transform {
        return new Transform(x, y, Math.sin(angle), Math.cos(angle));
    }

    clone(): Transform {
        return new Transform(this.x, this.y, this.s, this.c);
    }

    static identity(): Transform {
        return new Transform(0, 0, 0, 1);
    }

    static angle(a: number): Transform {
        return new Transform(0, 0, Math.sin(a), Math.cos(a));
    }

    /**
     * Set this based on the position and angle.
     */
    set(position: Vec2, rotation: Rot) {
        this.x = position.x;
        this.y = position.y;
        this.s = rotation.s;
        this.c = rotation.c;
    }

    setPosAngle(position: IVec2, angle: number) {
        this.x = position.x;
        this.y = position.y;
        this.s = Math.sin(angle);
        this.c = Math.cos(angle);
    }

    copyFrom(xf: Transform) {
        this.x = xf.x;
        this.y = xf.y;
        this.s = xf.s;
        this.c = xf.c;
    }

    static isValid(o?: Transform) {
        return o && MathUtil.isFinite(o.x) && MathUtil.isFinite(o.y) &&
            MathUtil.isFinite(o.s) && MathUtil.isFinite(o.c);
    }

    static assert(o?: Transform) {
        if (!PLANCK_ASSERT) return;
        if (!Transform.isValid(o)) {
            PLANCK_DEBUG && console.debug(o);
            throw new Error('Invalid Transform!');
        }
    }

    static mulVec2(a: Transform, b: Vec2): Vec2 {
        PLANCK_ASSERT && Transform.assert(a);
        PLANCK_ASSERT && Vec2.assert(b);
        const x = (a.c * b.x - a.s * b.y) + a.x;
        const y = (a.s * b.x + a.c * b.y) + a.y;
        return new Vec2(x, y);
    }

    static _mulVec2(a: Transform, b: Vec2, out: Vec2) {
        const x = b.x;
        const y = b.y;
        out.x = (a.c * x - a.s * y) + a.x;
        out.y = (a.s * x + a.c * y) + a.y;
    }

    static mulXf(a: Transform, b: Transform): Transform {
        PLANCK_ASSERT && Transform.assert(a);
        PLANCK_ASSERT && Transform.assert(b);
        // v2 = A.q.Rot(B.q.Rot(v1) + B.p) + A.p
        // = (A.q * B.q).Rot(v1) + A.q.Rot(B.p) + A.p

        //const xf = Transform.identity();
        // xf.q = Rot.mulRot(a.q, b.q);
        // xf.s = a.s * b.c + a.c * b.s;
        // xf.c = a.c * b.c - a.s * b.s;
        // xf.p = Vec2.add(Rot.mulVec2(a.q, b.p), a.p);
        // xf.x = a.x + a.c * b.x - a.s * b.y;
        // xf.y = a.y + a.s * b.x + a.c * b.y;

        return new Transform(
            a.x + a.c * b.x - a.s * b.y,
            a.y + a.s * b.x + a.c * b.y,
            a.s * b.c + a.c * b.s,
            a.c * b.c - a.s * b.s
        );
    }

    /**
     * @param {Transform} a
     * @param {Vec2} b
     * @returns {Vec2}
     */
    static mulTVec2(a: Transform, b: IVec2): Vec2 {
        PLANCK_ASSERT && Transform.assert(a);
        PLANCK_ASSERT && Vec2.assert(b)
        const px = b.x - a.x;
        const py = b.y - a.y;
        const x = a.c * px + a.s * py;
        const y = -a.s * px + a.c * py;
        return new Vec2(x, y);
    }

    static _mulTVec2(a: Transform, b: Vec2, out: Vec2) {
        const px = b.x - a.x;
        const py = b.y - a.y;
        out.x = a.c * px + a.s * py;
        out.y = -a.s * px + a.c * py;
    }

    /**
     * @param {Transform} a
     * @param {Transform} b
     * @returns {Transform}
     */
    static mulTXf(a: Transform, b: Transform): Transform {
        PLANCK_ASSERT && Transform.assert(a);
        PLANCK_ASSERT && Transform.assert(b);
        // v2 = A.q' * (B.q * v1 + B.p - A.p)
        // = A.q' * B.q * v1 + A.q' * (B.p - A.p)

        // Vec2.sub(b.p, a.p)
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        // Rot.mulTVec2(a.q, dxdy)
        const x = a.c * dx + a.s * dy;
        const y = -a.s * dx + a.c * dy;
        // Rot.mulTRot(a.q, b.q)
        const s = a.c * b.s - a.s * b.c;
        const c = a.c * b.c + a.s * b.s;

        // const xf = Transform.identity();
        // xf.q.set(Rot.mulTRot(a.q, b.q));
        // const v = Rot.mulTVec2(a.q, Vec2.sub(b.p, a.p));
        // xf.p.set(v.x, v.y);
        return new Transform(x, y, s, c);
    }

    newRotMulVec2(v: Vec2): Vec2 {
        // Rot.mulVec2
        return new Vec2(this.c * v.x - this.s * v.y, this.s * v.x + this.c * v.y);
    }

}