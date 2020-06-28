/**
 * A 2-by-2 matrix. Stored in column-major order.
 */
import {Vec2} from "./Vec2";

export class Mat22 {
    // Mat22(a, b, c, d) {
    //     if (typeof a === 'object' && a !== null) {
    //         this.ex = Vec2.clone(a);
    //         this.ey = Vec2.clone(b);
    //     } else if (typeof a === 'number') {
    //         this.ex = Vec2.neo(a, c);
    //         this.ey = Vec2.neo(b, d)
    //     } else {
    //         this.ex = Vec2.zero();
    //         this.ey = Vec2.zero()
    //     }
    // };

    constructor(readonly ex:Vec2,
                readonly ey:Vec2) {

    }

    static zero() {
        return new Mat22(Vec2.zero(), Vec2.zero());
    }

    toString() {
        return JSON.stringify(this);
    }

    static isValid(o?:Mat22) {
        return o && Vec2.isValid(o.ex) && Vec2.isValid(o.ey);
    }

    static assert(o?:Mat22) {
        if (!PLANCK_ASSERT) return;
        if (!Mat22.isValid(o)) {
            PLANCK_DEBUG && console.debug(o);
            throw new Error('Invalid Mat22!');
        }
    };

    set(a: number, b: number, c: number, d: number) {
        this.ex.set(a, c);
        this.ey.set(b, d);
    }

    setVec2(a: Vec2, b: Vec2) {
        this.ex.copyFrom(a);
        this.ey.copyFrom(b);
    }

    copyFrom(a: Mat22) {
        PLANCK_ASSERT && Mat22.assert(a);
        this.ex.copyFrom(a.ex);
        this.ey.copyFrom(a.ey);
    }

    setIdentity() {
        this.ex.x = 1.0;
        this.ex.y = 0.0;
        this.ey.x = 0.0;
        this.ey.y = 1.0;
    }


    setZero() {
        this.ex.x = 0.0;
        this.ey.x = 0.0;
        this.ex.y = 0.0;
        this.ey.y = 0.0;
    }

    getInverse(): Mat22 {
        const a = this.ex.x;
        const b = this.ey.x;
        const c = this.ex.y;
        const d = this.ey.y;
        let det = a * d - b * c;
        if (det != 0.0) {
            det = 1.0 / det;
        }
        // todo:
        const imx = Mat22.zero();
        imx.ex.x = det * d;
        imx.ey.x = -det * b;
        imx.ex.y = -det * c;
        imx.ey.y = det * a;
        return imx;
    }

    /**
     * Solve A * x = b, where b is a column vector. This is more efficient than
     * computing the inverse in one-shot cases.
     */
    solve(v: Vec2): Vec2 {
        PLANCK_ASSERT && Vec2.assert(v);
        const a = this.ex.x;
        const b = this.ey.x;
        const c = this.ex.y;
        const d = this.ey.y;
        let det = a * d - b * c;
        if (det !== 0.0) {
            det = 1.0 / det;
        }
        // todo:
        const w = Vec2.zero();
        w.x = det * (d * v.x - b * v.y);
        w.y = det * (a * v.y - c * v.x);
        return w;
    }

    /**
     * Multiply a matrix times a vector. If a rotation matrix is provided, then this
     * transforms the vector from one frame to another.
     */

    static mulVec2(mx: Mat22, v: Vec2): Vec2 {
        PLANCK_ASSERT && Vec2.assert(v);
        const x = mx.ex.x * v.x + mx.ey.x * v.y;
        const y = mx.ex.y * v.x + mx.ey.y * v.y;
        return Vec2.neo(x, y);
    }

    static mulMat22(mx: Mat22, v: Mat22): Mat22 {
        PLANCK_ASSERT && Mat22.assert(v);
        const a = mx.ex.x * v.ex.x + mx.ey.x * v.ex.y;
        const b = mx.ex.x * v.ey.x + mx.ey.x * v.ey.y;
        const c = mx.ex.y * v.ex.x + mx.ey.y * v.ex.y;
        const d = mx.ex.y * v.ey.x + mx.ey.y * v.ey.y;

        const m = new Mat22(new Vec2(a, c), new Vec2(b, d));
        return m;
    }

    /**
     * Multiply a matrix transpose times a vector. If a rotation matrix is provided,
     * then this transforms the vector from one frame to another (inverse
     * transform).
     */

    static mulTVec2(mx: Mat22, v: Vec2) {
        PLANCK_ASSERT && Mat22.assert(mx);
        PLANCK_ASSERT && Vec2.assert(v);
        return Vec2.neo(Vec2.dot(v, mx.ex), Vec2.dot(v, mx.ey));
    }

    static mulTMat22(mx: Mat22, v: Mat22) {
        PLANCK_ASSERT && Mat22.assert(mx);
        PLANCK_ASSERT && Mat22.assert(v);
        const c1 = Vec2.neo(Vec2.dot(mx.ex, v.ex), Vec2.dot(mx.ey, v.ex));
        const c2 = Vec2.neo(Vec2.dot(mx.ex, v.ey), Vec2.dot(mx.ey, v.ey));
        return Mat22.zero().setVec2(c1, c2);
    }

    static abs(mx: Mat22) {
        PLANCK_ASSERT && Mat22.assert(mx);
        return Mat22.zero().setVec2(Vec2.abs(mx.ex), Vec2.abs(mx.ey));
    }

    static add(mx1: Mat22, mx2: Mat22) {
        PLANCK_ASSERT && Mat22.assert(mx1);
        PLANCK_ASSERT && Mat22.assert(mx2);
        return Mat22.zero().setVec2(Vec2.add(mx1.ex, mx2.ex), Vec2.add(mx1.ey, mx2.ey));
    }
}
