import {Body, BoxShape, EdgeShape, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// This test shows how to use a motor joint. A motor joint
// can be used to animate a dynamic body. With finite motor forces
// the body can be blocked by collision with other bodies.
testbed('Motor Joint', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    let time = 0;

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-20.0, 0.0), new Vec2(20.0, 0.0)));

    // Define motorized body
    const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 8.0)});
    body.createFixture(new BoxShape(2.0, 0.5), {
        friction: 0.6,
        density: 2.0
    });

    var joint = world.createJoint(pl.MotorJoint({
        maxForce: 1000.0,
        maxTorque: 1000.0
    }, ground, body));

    testbed.step = function (dt) {
        // if (m_go && settings.hz > 0.0) {
        //   time += 1.0 / settings.hz;
        // }
        time += Math.min(dt, 100) / 1000;

        const linearOffset = Vec2.zero();
        linearOffset.x = 6.0 * Math.sin(2.0 * time);
        linearOffset.y = 8.0 + 4.0 * Math.sin(time);

        const angularOffset = 4.0 * time;

        joint.setLinearOffset(linearOffset);
        joint.setAngularOffset(angularOffset);
    };

    return world;
});
