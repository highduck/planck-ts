import {Body, BoxShape, EdgeShape, PrismaticJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// The motor in this test gets smoother with higher velocity iterations.
testbed('Prismatic', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const MOTOR_SPEED = 10;

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    const body = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(-10.0, 10.0),
        angle: 0.5 * Math.PI,
        allowSleep: false
    });
    body.createFixture(new BoxShape(2.0, 0.5), {density: 5.0});

    // Bouncy limit
    const axis = new Vec2(2.0, 1.0);
    axis.normalize();
    const joint = new PrismaticJoint({
        bodyA: ground, bodyB: body, anchor: new Vec2(0.0, 0.0), axis,
        motorSpeed: MOTOR_SPEED,
        maxMotorForce: 10000.0,
        enableMotor: true,
        lowerTranslation: 0.0,
        upperTranslation: 20.0,
        enableLimit: true
    });

    // Non-bouncy limit
    // (ground, body, new Vec2(-10.0, 10.0), new Vec2(1.0, 0.0));

    world.createJoint(joint);

    testbed.step = function () {
        if (testbed.activeKeys.right && !testbed.activeKeys.left) {
            joint.enableLimit(true);
            joint.enableMotor(true);
            joint.setMotorSpeed(+MOTOR_SPEED);

        } else if (testbed.activeKeys.left && !testbed.activeKeys.right) {
            joint.enableLimit(true);
            joint.enableMotor(true);
            joint.setMotorSpeed(-MOTOR_SPEED);

        } else if (testbed.activeKeys.up && !testbed.activeKeys.down) {
            joint.enableLimit(false);
            joint.enableMotor(true);
            joint.setMotorSpeed(+MOTOR_SPEED);

        } else if (testbed.activeKeys.down && !testbed.activeKeys.up) {
            joint.enableLimit(false);
            joint.enableMotor(true);
            joint.setMotorSpeed(-MOTOR_SPEED);

        } else {
            joint.enableLimit(true);
            joint.enableMotor(false);
        }

        const force = joint.getMotorForce(1 / 60);
        testbed.status('Motor Force', force);
    };

    return world;
});
