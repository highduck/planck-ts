import {
    Body,
    BoxShape,
    CircleShape,
    EdgeShape,
    PolygonShape,
    RevoluteJoint,
    Vec2,
    WheelJoint,
    World
} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// This is a fun demo that shows off the wheel joint
testbed('Car', function (testbed) {
    testbed.speed = 1.3;
    testbed.hz = 50;

    const world = new World({
        gravity: new Vec2(0, -10)
    });

    // wheel spring settings
    let HZ = 4.0;
    const ZETA = 0.7;
    const SPEED = 50.0;

    const ground = world.createBody();

    const groundFD = {
        density: 0.0,
        friction: 0.6
    };

    ground.createFixture(new EdgeShape(new Vec2(-20.0, 0.0), new Vec2(20.0, 0.0)), groundFD);

    const hs = [0.25, 1.0, 4.0, 0.0, 0.0, -1.0, -2.0, -2.0, -1.25, 0.0];

    let x = 20.0;
    let y1 = 0.0;
    let dx = 5.0;

    for (let i = 0; i < 10; ++i) {
        const y2 = hs[i];
        ground.createFixture(new EdgeShape(new Vec2(x, y1), new Vec2(x + dx, y2)), groundFD);
        y1 = y2;
        x += dx;
    }

    for (let i = 0; i < 10; ++i) {
        const y2 = hs[i];
        ground.createFixture(new EdgeShape(new Vec2(x, y1), new Vec2(x + dx, y2)), groundFD);
        y1 = y2;
        x += dx;
    }

    ground.createFixture(new EdgeShape(new Vec2(x, 0.0), new Vec2(x + 40.0, 0.0)), groundFD);

    x += 80.0;
    ground.createFixture(new EdgeShape(new Vec2(x, 0.0), new Vec2(x + 40.0, 0.0)), groundFD);

    x += 40.0;
    ground.createFixture(new EdgeShape(new Vec2(x, 0.0), new Vec2(x + 10.0, 5.0)), groundFD);

    x += 20.0;
    ground.createFixture(new EdgeShape(new Vec2(x, 0.0), new Vec2(x + 40.0, 0.0)), groundFD);

    x += 40.0;
    ground.createFixture(new EdgeShape(new Vec2(x, 0.0), new Vec2(x, 20.0)), groundFD);

    // Teeter
    const teeter = world.createBody({type: Body.DYNAMIC, position: new Vec2(140.0, 1.0)});
    teeter.createFixture(new BoxShape(10.0, 0.25, Vec2.ZERO, 0), {density: 1.0});
    world.createJoint(new RevoluteJoint({
        lowerAngle: -8.0 * Math.PI / 180.0,
        upperAngle: 8.0 * Math.PI / 180.0,
        enableLimit: true,
        bodyA: ground,
        bodyB: teeter,
        anchor: teeter.getPosition()
    }));

    teeter.applyAngularImpulse(100.0, true);

    // Bridge
    const bridgeFD = {
        density: 1.0,
        friction: 0.6
    };

    let prevBody = ground;
    let i = 0;
    for (; i < 20; ++i) {
        const bridgeBlock = world.createBody({type: Body.DYNAMIC, position: new Vec2(161.0 + 2.0 * i, -0.125)});
        bridgeBlock.createFixture(new BoxShape(1.0, 0.125, Vec2.ZERO, 0), bridgeFD);

        world.createJoint(new RevoluteJoint({
            bodyA: prevBody,
            bodyB: bridgeBlock,
            anchor: new Vec2(160.0 + 2.0 * i, -0.125)
        }));

        prevBody = bridgeBlock;
    }

    world.createJoint(new RevoluteJoint({bodyA: prevBody, bodyB: ground, anchor: new Vec2(160.0 + 2.0 * i, -0.125)}));

    // Boxes
    const box = new BoxShape(0.5, 0.5, Vec2.ZERO, 0);

    world.createBody({type: Body.DYNAMIC, position: new Vec2(230.0, 0.5)})
        .createFixture(box, {density: 0.5});

    world.createBody({type: Body.DYNAMIC, position: new Vec2(230.0, 1.5)})
        .createFixture(box, {density: 0.5});

    world.createBody({type: Body.DYNAMIC, position: new Vec2(230.0, 2.5)})
        .createFixture(box, {density: 0.5});

    world.createBody({type: Body.DYNAMIC, position: new Vec2(230.0, 3.5)})
        .createFixture(box, {density: 0.5});

    world.createBody({type: Body.DYNAMIC, position: new Vec2(230.0, 4.5)})
        .createFixture(box, {density: 0.5});

    // Car
    const car = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(0.0, 1.0)
    });
    car.createFixture(new PolygonShape([
        new Vec2(-1.5, -0.5),
        new Vec2(1.5, -0.5),
        new Vec2(1.5, 0.0),
        new Vec2(0.0, 0.9),
        new Vec2(-1.15, 0.9),
        new Vec2(-1.5, 0.2)
    ]), {density: 1});

    const wheelFD = {
        density: 1.0,
        friction: 0.9
    };

    const wheelBack = world.createBody({type: Body.DYNAMIC, position: new Vec2(-1.0, 0.35)});
    wheelBack.createFixture(new CircleShape(0, 0, 0.4), wheelFD);

    const wheelFront = world.createBody({type: Body.DYNAMIC, position: new Vec2(1.0, 0.4)});
    wheelFront.createFixture(new CircleShape(0, 0, 0.4), wheelFD);

    const springBack = world.createJoint(new WheelJoint({
        motorSpeed: 0.0,
        maxMotorTorque: 20.0,
        enableMotor: true,
        frequencyHz: HZ,
        dampingRatio: ZETA,
        bodyA: car,
        bodyB: wheelBack,
        anchor: wheelBack.getPosition(),
        axis: new Vec2(0, 1)
    }));

    const springFront = world.createJoint(new WheelJoint({
        motorSpeed: 0.0,
        maxMotorTorque: 10.0,
        enableMotor: false,
        frequencyHz: HZ,
        dampingRatio: ZETA,
        bodyA: car,
        bodyB: wheelFront,
        anchor: wheelFront.getPosition(),
        axis: new Vec2(0, 1)
    }));

    testbed.keydown = function () {
        if (testbed.activeKeys.down) {
            HZ = Math.max(0.0, HZ - 1.0);
            springBack.setSpringFrequencyHz(HZ);
            springFront.setSpringFrequencyHz(HZ);

        } else if (testbed.activeKeys.up) {
            HZ += 1.0;
            springBack.setSpringFrequencyHz(HZ);
            springFront.setSpringFrequencyHz(HZ);
        }
    };

    testbed.step = function () {
        if (testbed.activeKeys.right && testbed.activeKeys.left) {
            springBack.setMotorSpeed(0);
            springBack.enableMotor(true);

        } else if (testbed.activeKeys.right) {
            springBack.setMotorSpeed(-SPEED);
            springBack.enableMotor(true);

        } else if (testbed.activeKeys.left) {
            springBack.setMotorSpeed(+SPEED);
            springBack.enableMotor(true);

        } else {
            springBack.setMotorSpeed(0);
            springBack.enableMotor(false);
        }

        const cp = car.getPosition();
        if (cp.x > testbed.x + 10) {
            testbed.x = cp.x - 10;
        } else if (cp.x < testbed.x - 10) {
            testbed.x = cp.x + 10;
        }
    };

    testbed.info('←/→: Accelerate car, ↑/↓: Change spring frequency');

    return world;
});
