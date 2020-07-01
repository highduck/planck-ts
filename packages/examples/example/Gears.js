import {
    Body,
    BoxShape,
    CircleShape,
    EdgeShape,
    GearJoint,
    PrismaticJoint,
    RevoluteJoint,
    Vec2,
    World
} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Gears', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(50.0, 0.0), new Vec2(-50.0, 0.0)));

    const radius1 = 1.0;
    const radius2 = 2.0;

    const gearA1 = world.createBody({position: new Vec2(10.0, 9.0)});
    gearA1.createFixture(new CircleShape(0, 0, radius1), {density: 5});

    const plankA1 = world.createBody({type: Body.DYNAMIC, position: new Vec2(10.0, 8.0)});
    plankA1.createFixture(new BoxShape(0.5, 5.0), {density: 5});

    const gearA2 = world.createBody({type: Body.DYNAMIC, position: new Vec2(10.0, 6.0)});
    gearA2.createFixture(new CircleShape(0, 0, radius2), {density: 5});

    const jointA1 = world.createJoint(new RevoluteJoint({bodyA: plankA1, bodyB: gearA1, anchor: gearA1.getPosition()}));
    const jointA2 = world.createJoint(new RevoluteJoint({bodyA: plankA1, bodyB: gearA2, anchor: gearA2.getPosition()}));

    world.createJoint(new GearJoint({
        bodyA: gearA1,
        bodyB: gearA2,
        joint1: jointA1,
        joint2: jointA2,
        ratio: radius2 / radius1
    }));

    const gearB1 = world.createBody({type: Body.DYNAMIC, position: new Vec2(-3.0, 12.0)});
    gearB1.createFixture(new CircleShape(0, 0, 1), {density: 5});

    const jointB1 = world.createJoint(new RevoluteJoint({bodyA: ground, bodyB: gearB1, anchor: gearB1.getPosition()}));

    const gearB2 = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 12.0)});
    gearB2.createFixture(new CircleShape(0, 0, 2.0), {density: 5});

    const jointB2 = world.createJoint(new RevoluteJoint({bodyA: ground, bodyB: gearB2, anchor: gearB2.getPosition()}));

    const plankB1 = world.createBody({type: Body.DYNAMIC, position: new Vec2(2.5, 12.0)});
    plankB1.createFixture(new BoxShape(0.5, 5.0), {density: 5});

    const jointB3 = world.createJoint(new PrismaticJoint({
        lowerTranslation: -5.0,
        upperTranslation: 5.0,
        enableLimit: true,
        bodyA: ground, bodyB: plankB1,
        anchor: plankB1.getPosition(),
        axis: Vec2.UNIT_Y
    }));

    const jointB4 = world.createJoint(new GearJoint({
        bodyA: gearB1,
        bodyB: gearB2,
        joint1: jointB1,
        joint2: jointB2,
        ratio: radius2 / radius1
    }));
    const jointB5 = world.createJoint(new GearJoint({
        bodyA: gearB2,
        bodyB: plankB1,
        joint1: jointB2,
        joint2: jointB3,
        ratio: -1.0 / radius2
    }));

    testbed.step = function Step(settings) {
        let ratio, value;

        ratio = jointB4.getRatio();
        value = jointB1.getJointAngle() + ratio * jointB2.getJointAngle();
        testbed.status("ratio1", ratio);
        testbed.status("theta1 + ratio * delta", value);

        ratio = jointB5.getRatio();
        value = jointB2.getJointAngle() + ratio * jointB3.getJointTranslation();

        testbed.status("ratio2", ratio);
        testbed.status("theta2 + ratio * delta", value);
    };

    return world;
});
