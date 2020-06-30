/// <reference path="../global.d.ts" />
(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;
import {expect} from "chai";

import {AABB} from "../collision/AABB";
import {DynamicTree} from "../collision/DynamicTree";
import {Vec2} from "..";
import {BroadPhase} from "../collision/BroadPhase";
import sinon from "sinon";

describe('Collision', function () {

    it('AABB', function () {
        let r: Vec2;
        const o = new AABB(0, 0, 0, 0);
        expect(AABB.isValid(o)).equal(true);

        o.set(6, 4, 10, 6);

        r = o.getCenter();
        expect(r.x).equal(8);
        expect(r.y).equal(5);

        r = o.getExtents();
        expect(r.x).equal(2);
        expect(r.y).equal(1);

        expect(o.getPerimeter()).equal(12);

        o.combine(o, new AABB(7, 4, 9, 6));
        expect(o.ux).equal(10);
        expect(o.uy).equal(6);
        expect(o.lx).equal(6);
        expect(o.ly).equal(4);

        o.combine(o, new AABB(5, 3, 11, 7));
        expect(o.ux).equal(11);
        expect(o.uy).equal(7);
        expect(o.lx).equal(5);
        expect(o.ly).equal(3);

        expect(o.contains(new AABB(5, 3, 11, 7))).equal(true);
        expect(o.contains(new AABB(5, 2, 11, 7))).equal(false);
        expect(o.contains(new AABB(4, 2, 11, 7))).equal(false);
        expect(o.contains(new AABB(5, 3, 11, 8))).equal(false);
        expect(o.contains(new AABB(5, 3, 12, 7))).equal(false);

        // rayCast
    });

    it('DynamicTree', function () {
        const tree = new DynamicTree();

        const foo = tree.createProxy(new AABB(0, 0, 1, 1), 'foo');
        const bar = tree.createProxy(new AABB(1, 1, 2, 2), 'bar');
        const baz = tree.createProxy(new AABB(2, 2, 3, 3), 'baz');

        expect(tree.getHeight()).equal(2);

        expect(tree.getUserData(foo)).equal('foo');
        expect(tree.getUserData(bar)).equal('bar');
        expect(tree.getUserData(baz)).equal('baz');

        expect(tree.getFatAABB(foo).ux).be.above(1);
        expect(tree.getFatAABB(foo).uy).be.above(1);
        expect(tree.getFatAABB(foo).lx).be.below(0);
        expect(tree.getFatAABB(foo).ly).be.below(0);

        const QueryCallback = sinon.spy((proxy) => true);
        const callback = QueryCallback;

        tree.query(new AABB(1, 1, 2, 2), callback);
        expect(QueryCallback.calledWith(foo)).equal(true);
        expect(QueryCallback.calledWith(bar)).equal(true);
        expect(QueryCallback.calledWith(baz)).equal(true);

        tree.query(new AABB(0.3, 0.3, 0.7, 0.7), callback);
        expect(QueryCallback.lastCall.calledWith(foo)).equal(true);

        tree.query(new AABB(1.3, 1.3, 1.7, 1.7), callback);
        expect(QueryCallback.lastCall.calledWith(bar)).equal(true);

        tree.query(new AABB(2.3, 2.3, 2.7, 2.7), callback);
        expect(QueryCallback.lastCall.calledWith(baz)).equal(true);

        expect(tree.moveProxy(foo, new AABB(0, 0, 1, 1), new Vec2(0.01, 0.01))).equal(false);

        expect(tree.moveProxy(baz, new AABB(3, 3, 4, 4), new Vec2(0, 0))).equal(true);

        tree.query(new AABB(3.3, 3.3, 3.7, 3.7), callback);
        expect(QueryCallback.lastCall.calledWith(baz)).equal(true);

        tree.destroyProxy(foo);
        expect(tree.getHeight()).equal(1);

        tree.destroyProxy(bar);
        expect(tree.getHeight()).equal(0);

        tree.destroyProxy(baz);
        expect(tree.getHeight()).equal(0);

    });

    it('BroadPhase', function () {
        const bp = new BroadPhase();

        const AddPair = sinon.spy();
        const callback = AddPair;

        const foo = bp.createProxy(new AABB(0, 0, 1, 1), 'foo');
        const bar = bp.createProxy(new AABB(2, 2, 3, 3), 'bar');

        bp.updatePairs(callback);
        expect(AddPair.callCount).equal(0);

        const baz = bp.createProxy(new AABB(1, 1, 2, 2), 'baz');

        AddPair.resetHistory();
        bp.updatePairs(callback);
        expect(AddPair.callCount).equal(2);
        expect(AddPair.calledWith('bar', 'baz')).equal(true);
        expect(AddPair.calledWith('foo', 'baz')).equal(true);

        bp.moveProxy(baz, new AABB(0.5, 0.5, 1.5, 1.5), new Vec2(0, 0));

        AddPair.resetHistory();
        bp.updatePairs(callback);
        expect(AddPair.callCount).equal(1);
        expect(AddPair.calledWith('foo', 'baz')).equal(true);

    });

});
