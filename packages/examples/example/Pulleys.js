import {Body, BoxShape, CircleShape, PulleyJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Pulleys', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    const y = 16.0;
    const L = 12.0;
    const a = 1.0;
    const b = 2.0;

    const ground = world.createBody();

    // ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), 0.0);

    ground.createFixture(new CircleShape(-10.0, y + b + L, 2.0));
    ground.createFixture(new CircleShape(10.0, y + b + L, 2.0));

    const shape = new BoxShape(a, b);

    // bd.fixedRotation = true;
    const box1 = world.createBody({type: Body.DYNAMIC, position: new Vec2(-10.0, y)});
    box1.createFixture(shape, {density: 5.0});

    const box2 = world.createBody({type: Body.DYNAMIC, position: new Vec2(10.0, y)});
    box2.createFixture(shape, {density: 5.0});

    const anchor1 = new Vec2(-10.0, y + b);
    const anchor2 = new Vec2(10.0, y + b);
    const groundAnchor1 = new Vec2(-10.0, y + b + L);
    const groundAnchor2 = new Vec2(10.0, y + b + L);

    var joint1 = world.createJoint(new PulleyJoint({
        bodyA: box1, bodyB: box2, groundA: groundAnchor1, groundB: groundAnchor2, anchorA: anchor1, anchorB: anchor2,
        ratio: 1.5
    }));

    testbed.step = function () {
        var ratio = joint1.getRatio();
        var L = joint1.getCurrentLengthA() + ratio * joint1.getCurrentLengthB();
        testbed.status('ratio', ratio);
        testbed.status('L (L1 * ratio + L2)', L);
    };

    return world;
});
