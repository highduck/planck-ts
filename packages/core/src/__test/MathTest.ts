/// <reference path="../global.d.ts" />
(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;
import {expect} from "chai";
import {Vec2} from "..";
import {MathUtil} from "../common/Math";
import {Vec3} from "../common/Vec3";

describe('Math', function () {

    it('Math', function () {
        expect(MathUtil.isFinite(+'NaN')).equal(false);
        expect(MathUtil.isFinite(Infinity)).equal(false);
        expect(MathUtil.isFinite('0')).equal(false);
        expect(MathUtil.isFinite('')).equal(false);

        expect(MathUtil.isFinite(1)).equal(true);
        expect(MathUtil.isFinite(0)).equal(true);
        expect(MathUtil.isFinite(-1)).equal(true);

        // InvSqrt
        // NextPowerOfTwo
        // IsPowerOfTwo
        // clamp
        // EPSILON
    });

    it('Vec2', function () {
        let r: number;
        let u: Vec2;
        const v = new Vec2(0, 0);
        expect(v.x).equal(0);
        expect(v.y).equal(0);

        v.set(3, 4);
        expect(v.x).equal(3);
        expect(v.y).equal(4);
        expect(v.length()).equal(5);
        expect(v.lengthSquared()).equal(25);

        expect(v.normalize()).equal(5);
        expect(v.x).closeTo(3 / 5, 1e-12);
        expect(v.y).closeTo(4 / 5, 1e-12);

        v.setZero();
        expect(v.x).equal(0);
        expect(v.y).equal(0);

        v.add(new Vec2(3, 2));
        expect(v.x).equal(3);
        expect(v.y).equal(2);

        v.sub(new Vec2(2, 1));
        expect(v.x).equal(1);
        expect(v.y).equal(1);

        v.mul(5);
        expect(v.x).equal(5);
        expect(v.y).equal(5);

        v.set(2, 3);
        expect(v.x).equal(2);
        expect(v.y).equal(3);

        const sk = Vec2.skew(v);
        expect(sk.x).equal(-3);
        expect(sk.y).equal(2);

        r = Vec2.dot(v, new Vec2(2, 3));
        expect(r).equal(13);

        r = Vec2.cross(v, new Vec2(2, 3));
        expect(r).equal(0);

        u = Vec2.crossVS(v, 5);
        expect(u.x).equal(15);
        expect(u.y).equal(-10);

        u = Vec2.clamp(new Vec2(6, 8), 5);
        expect(u.x).closeTo(3, 1e-12);
        expect(u.y).closeTo(4, 1e-12);

    });

    it('Vec3', function () {
        return;

        let r;
        let v = new Vec3(0, 0, 0);
        expect(v.x).equal(0);
        expect(v.y).equal(0);
        expect(v.z).equal(0);

        v = new Vec3(3, 4, 5);
        expect(v.x).equal(3);
        expect(v.y).equal(4);
        expect(v.z).equal(5);

        v.setZero();
        expect(v.x).equal(0);
        expect(v.y).equal(0);
        expect(v.z).equal(0);

        v.add(new Vec3(3, 2, 1));
        expect(v.x).equal(3);
        expect(v.y).equal(2);
        expect(v.z).equal(1);

        v.sub(new Vec3(0, 1, 2));
        expect(v.x).equal(3);
        expect(v.y).equal(1);
        expect(v.z).equal(-1);

        v.mul(5);
        expect(v.x).equal(15);
        expect(v.y).equal(5);
        expect(v.z).equal(-5);

        v.set(2, 3, 4);
        expect(v.x).equal(2);
        expect(v.y).equal(3);
        expect(v.z).equal(4);

        r = Vec3.dot(v, new Vec3(2, 0, -1));
        expect(r).equal(0);

        r = Vec3.cross(v, new Vec3(2, 0, -1));
        expect(r.x).equal(-3);
        expect(r.y).equal(10);
        expect(r.z).equal(-6);
    });
});
