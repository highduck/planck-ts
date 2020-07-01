import {Body, BoxShape, EdgeShape, PrismaticJoint, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// A motor driven slider crank with joint friction.
testbed('SliderCrank', function (testbed) {

    var world = new World({gravity: new Vec2(0, -10)});

    var ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));


    // Define crank.
    var crank = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 7.0)});
    crank.createFixture(new BoxShape(0.5, 2.0), 2.0);

    var joint1 = world.createJoint(new RevoluteJoint({
        motorSpeed: Math.PI,
        maxMotorTorque: 10000.0,
        enableMotor: true
    }, ground, crank, new Vec2(0.0, 5.0)));


    // Define follower.
    var follower = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 13.0)});
    follower.createFixture(new BoxShape(0.5, 4.0), {density: 2.0});

    world.createJoint(new RevoluteJoint({enableMotor: false}, crank, follower, new Vec2(0.0, 9.0)));


    // Define piston
    var piston = world.createBody({
        type: Body.DYNAMIC,
        fixedRotation: true,
        position: new Vec2(0.0, 17.0)
    });
    piston.createFixture(new BoxShape(1.5, 1.5), {density:2.0});

    world.createJoint(new RevoluteJoint({bodyA: follower, bodyB: piston, anchor: new Vec2(0.0, 17.0)}));

    var joint2 = world.createJoint(new PrismaticJoint({
        maxMotorForce: 1000.0,
        enableMotor: true,
        bodyA: ground,
        bodyB: piston,
        anchor: new Vec2(0.0, 17.0), axis: new Vec2(0.0, 1.0)
    }));


    // Create a payload
    var payload = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 23.0)});
    payload.createFixture(new BoxShape(1.5, 1.5), {density: 2.0});


    testbed.keydown = function (code, char) {
        switch (char) {
            case 'Z':
                joint2.enableMotor(!joint2.isMotorEnabled());
                joint2.getBodyB().setAwake(true);
                break;

            case 'X':
                joint1.enableMotor(!joint1.isMotorEnabled());
                joint1.getBodyB().setAwake(true);
                break;
        }
    };

    testbed.step = function () {
        var torque = joint1.getMotorTorque(1 / 60);
        testbed.status("Motor Torque", torque);
    };

    testbed.info('Z: Toggle friction, X: Toggle motor');

    return world;
});
