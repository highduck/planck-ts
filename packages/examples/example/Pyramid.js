import {Body, BoxShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Pyramid', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const COUNT = 20;

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), 0.0);

    const a = 0.5;
    const box = new BoxShape(a, a);

    const x = new Vec2(-7.0, 0.75);
    const y = Vec2.zero();
    const deltaX = new Vec2(0.5625, 1.25);
    const deltaY = new Vec2(1.125, 0.0);

    for (let i = 0; i < COUNT; ++i) {
        y.copyFrom(x);
        for (let j = i; j < COUNT; ++j) {
            world.createBody({type: Body.DYNAMIC, position: y}).createFixture(box, {density: 5});
            y.add(deltaY);
        }
        x.add(deltaX);
    }

    testbed.step = function () {
        // var tree = world.m_broadPhase.m_tree;
        // if (stepCount++ == 400) {
        // tree.rebuildBottomUp();
        // }
    };

    return world;
});
