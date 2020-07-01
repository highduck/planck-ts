import {Body, BoxShape, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('MobileBalanced', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    testbed.y = -15;
    testbed.width = 20;
    testbed.height = 20;
    testbed.ratio = 40;

    const DEPTH = 4;
    const DENSITY = 20.0;

    const ground = world.createBody({position: new Vec2(0.0, 20.0)});

    const a = 0.5;
    const h = new Vec2(0.0, a);

    const root = addNode(ground, new Vec2.zero(), 0, 3.0, a);

    world.createJoint(new RevoluteJoint({
        bodyA: ground,
        bodyB: root,
        localAnchorA: Vec2.zero(),
        localAnchorB: h
    }));

    function addNode(parent_, localAnchor, depth, offset, a) {
        const h = new Vec2(0.0, a);
        const p = Vec2.zero().add(parent_.getPosition()).add(localAnchor).sub(h);

        const parent = world.createBody({type: Body.DYNAMIC, position: p});

        parent.createFixture(new BoxShape(0.25 * a, a), {density: DENSITY});

        if (depth === DEPTH) {
            return parent;
        }

        parent.createFixture(new BoxShape(offset, 0.25 * a, new Vec2(0, -a), 0.0), {density: DENSITY});

        const right = new Vec2(offset, -a);
        const left = new Vec2(-offset, -a);
        const rightChild = addNode(parent, right, depth + 1, 0.5 * offset, a);
        const leftChild = addNode(parent, left, depth + 1, 0.5 * offset, a);

        world.createJoint(new RevoluteJoint({
            bodyA: parent,
            bodyB: rightChild,
            localAnchorA: right,
            localAnchorB: h,
        }));

        world.createJoint(new RevoluteJoint({
            bodyA: parent,
            bodyB: leftChild,
            localAnchorA: left,
            localAnchorB: h,
        }));

        return parent;
    }

    return world;
});
