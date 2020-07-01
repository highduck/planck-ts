import {Body, BoxShape, ChainShape, CircleShape, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// This tests bullet collision and provides an example of a gameplay scenario.
// This also uses a loop shape.
testbed('Pinball', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    // Ground body
    const ground = world.createBody();
    ground.createFixture(new ChainShape([
        new Vec2(0.0, -2.0),
        new Vec2(8.0, 6.0),
        new Vec2(8.0, 20.0),
        new Vec2(-8.0, 20.0),
        new Vec2(-8.0, 6.0)
    ], true));

    // Flippers
    const pLeft = new Vec2(-2.0, 0.0);
    const pRight = new Vec2(2.0, 0.0);

    const leftFlipper = world.createBody({type: Body.DYNAMIC, position: new Vec2(-2.0, 0.0)});
    const rightFlipper = world.createBody({type: Body.DYNAMIC, position: new Vec2(2.0, 0.0)});

    leftFlipper.createFixture(new BoxShape(1.75, 0.1), {density: 1});
    rightFlipper.createFixture(new BoxShape(1.75, 0.1), {density: 1});

    const jd = {
        enableMotor: true,
        maxMotorTorque: 1000.0,
        enableLimit: true,
        motorSpeed: 0.0,
        lowerAngle: -30.0 * Math.PI / 180.0,
        upperAngle: 5.0 * Math.PI / 180.0,
    };

    const leftJoint = new RevoluteJoint(Object.assign({
        bodyA: ground,
        bodyB: leftFlipper,
        anchor: leftFlipper.getPosition()
    }, jd));
    world.createJoint(leftJoint);

    jd.lowerAngle = -5.0 * Math.PI / 180.0;
    jd.upperAngle = 30.0 * Math.PI / 180.0;
    const rightJoint = new RevoluteJoint(Object.assign({
        bodyA: ground,
        bodyB: rightFlipper,
        anchor: rightFlipper.getPosition()
    }, jd));
    world.createJoint(rightJoint);

    // Circle character
    const ball = world.createBody({
        position: new Vec2(1.0, 15.0),
        type: Body.DYNAMIC,
        bullet: true
    });
    ball.createFixture(new CircleShape(0, 0, 0.2), {density: 1});

    testbed.step = function () {
        if (testbed.activeKeys.right) {
            rightJoint.setMotorSpeed(-20.0);
        } else {
            rightJoint.setMotorSpeed(10.0);
        }

        if (testbed.activeKeys.left) {
            leftJoint.setMotorSpeed(20.0);
        } else {
            leftJoint.setMotorSpeed(-10.0);
        }
    }

    return world;
});
