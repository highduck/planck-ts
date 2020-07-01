import {
    Body,
    BoxShape,
    CircleShape,
    DistanceJoint,
    EdgeShape,
    PolygonShape,
    RevoluteJoint,
    Vec2,
    World
} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// Inspired by a contribution by roman_m
// Dimensions scooped from APE (http://www.cove.org/ape/index.htm)
testbed('Theo Jansen\'s Walker', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const motorSpeed = 2.0;
    const motorOn = true;

    const offset = new Vec2(0.0, 8.0);
    const pivot = new Vec2(0.0, 0.8);

    // Ground
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-50.0, 0.0), new Vec2(50.0, 0.0)));
    ground.createFixture(new EdgeShape(new Vec2(-50.0, 0.0), new Vec2(-50.0, 10.0)));
    ground.createFixture(new EdgeShape(new Vec2(50.0, 0.0), new Vec2(50.0, 10.0)));

    // Balls
    for (let i = 0; i < 40; ++i) {
        world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(-40.0 + 2.0 * i, 0.5)
        }).createFixture(new CircleShape(0, 0, 0.25), 1.0);
    }

    // Chassis
    const chassis = world.createBody({type: Body.DYNAMIC, position: Vec2.add(pivot, offset)});
    chassis.createFixture(new BoxShape(2.5, 1.0), {
        density: 1.0,
        filterGroupIndex: -1
    });

    const wheel = world.createBody({type: Body.DYNAMIC, position: Vec2.add(pivot, offset)});
    wheel.createFixture(new CircleShape(0, 0, 1.6), {
        density: 1.0,
        filterGroupIndex: -1
    });

    const motorjoint = world.createJoint(new RevoluteJoint({
        bodyA: wheel,
        bodyB: chassis,
        anchor: Vec2.add(pivot, offset),
        collideConnected: false,
        motorSpeed: motorSpeed,
        maxMotorTorque: 400.0,
        enableMotor: motorOn
    }));

    const wheelAnchor = new Vec2(0.0, -0.8).add(pivot);

    CreateLeg(-1.0, wheelAnchor);
    CreateLeg(1.0, wheelAnchor);

    wheel.setTransform(wheel.getPosition(), 120.0 * Math.PI / 180.0);
    CreateLeg(-1.0, wheelAnchor);
    CreateLeg(1.0, wheelAnchor);

    wheel.setTransform(wheel.getPosition(), -120.0 * Math.PI / 180.0);
    CreateLeg(-1.0, wheelAnchor);
    CreateLeg(1.0, wheelAnchor);

    function CreateLeg(s, wheelAnchor) {

        const p1 = new Vec2(5.4 * s, -6.1);
        const p2 = new Vec2(7.2 * s, -1.2);
        const p3 = new Vec2(4.3 * s, -1.9);
        const p4 = new Vec2(3.1 * s, 0.8);
        const p5 = new Vec2(6.0 * s, 1.5);
        const p6 = new Vec2(2.5 * s, 3.7);

        let poly1;
        let poly2;
        if (s > 0.0) {
            poly1 = new PolygonShape([p1, p2, p3]);
            poly2 = new PolygonShape([Vec2.zero(), Vec2.sub(p5, p4), Vec2.sub(p6, p4)]);

        } else {
            poly1 = new PolygonShape([p1, p3, p2]);
            poly2 = new PolygonShape([Vec2.zero(), Vec2.sub(p6, p4), Vec2.sub(p5, p4)]);
        }

        const body1 = world.createBody({
            type: Body.DYNAMIC,
            position: offset,
            angularDamping: 10.0
        });
        body1.createFixture(poly1, {
            density: 1.0,
            filterGroupIndex: -1
        });

        const body2 = world.createBody({
            type: Body.DYNAMIC,
            position: Vec2.add(p4, offset),
            angularDamping: 10.0
        });
        body2.createFixture(poly2, {
            density: 1.0,
            filterGroupIndex: -1
        });

        // Using a soft distance constraint can reduce some jitter.
        // It also makes the structure seem a bit more fluid by
        // acting like a suspension system.
        const djd = {
            dampingRatio: 0.5,
            frequencyHz: 10.0
        };
        world.createJoint(new DistanceJoint(Object.assign({
            bodyA: body1, bodyB: body2, anchorA: Vec2.add(p2, offset), anchorB: Vec2.add(p5, offset)
        }, djd)));
        world.createJoint(new DistanceJoint(Object.assign({
            bodyA: body1, bodyB: body2, anchorA: Vec2.add(p3, offset), anchorB: Vec2.add(p4, offset)
        }, djd)));
        world.createJoint(new DistanceJoint(Object.assign({
            bodyA: body1, bodyB: wheel, anchorA: Vec2.add(p3, offset), anchorB: Vec2.add(wheelAnchor, offset)
        }, djd)));
        world.createJoint(new DistanceJoint(Object.assign({
            bodyA: body2, bodyB: wheel, anchorA: Vec2.add(p6, offset), anchorB: Vec2.add(wheelAnchor, offset)
        }, djd)));
        world.createJoint(new RevoluteJoint({
            bodyA: body2, bodyB: chassis, anchor: Vec2.add(p4, offset)
        }));
    }

    testbed.step = function () {

        if (testbed.activeKeys.right && testbed.activeKeys.left) {
            motorjoint.setMotorSpeed(0.0);
            motorjoint.enableMotor(false);

        } else if (testbed.activeKeys.right) {
            motorjoint.setMotorSpeed(motorSpeed);
            motorjoint.enableMotor(true);

        } else if (testbed.activeKeys.left) {
            motorjoint.setMotorSpeed(-motorSpeed);
            motorjoint.enableMotor(true);

        } else {
            motorjoint.setMotorSpeed(0.0);
            motorjoint.enableMotor(true);
        }

        if (wheel.getPosition().x > testbed.x + 10) {
            testbed.x = wheel.getPosition().x - 10;

        } else if (wheel.getPosition().x < testbed.x - 10) {
            testbed.x = wheel.getPosition().x + 10;
        }
    };

    return world;
});
