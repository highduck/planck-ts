import {Body, BoxShape, CircleShape, EdgeShape, MathUtil, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";


// This is used to test sensor shapes.
testbed('SensorTest', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const COUNT = 7;

    let sensor;
    const bodies = [];
    const touching = [];

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    if (0) {
        sensor = ground.createFixture(
            new BoxShape(10.0, 2.0, new Vec2(0.0, 20.0), 0.0), {
                isSensor: true
            });

    } else {
        sensor = ground.createFixture(
            new CircleShape(0.0, 10.0, 5.0), {
                isSensor: true,
            });
    }

    const circle = new CircleShape(0, 0, 1);

    for (let i = 0; i < COUNT; ++i) {
        touching[i] = {touching: false};

        bodies[i] = world.createBody({type: Body.DYNAMIC, position: new Vec2(-10.0 + 3.0 * i, 20.0)});
        bodies[i].setUserData(touching[i])
        bodies[i].createFixture(circle, 1.0);
    }

    // Implement contact listener.
    world.on('begin-contact', function (contact) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        if (fixtureA === sensor) {
            const userData = fixtureB.getBody().getUserData();
            if (userData) {
                userData.touching = true;
            }
        }

        if (fixtureB === sensor) {
            const userData = fixtureA.getBody().getUserData();
            if (userData) {
                userData.touching = true;
            }
        }
    });

    // Implement contact listener.
    world.on('end-contact', function (contact) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        if (fixtureA === sensor) {
            const userData = fixtureB.getBody().getUserData();
            if (userData) {
                userData.touching = false;
            }
        }

        if (fixtureB === sensor) {
            const userData = fixtureA.getBody().getUserData();
            if (userData) {
                userData.touching = false;
            }
        }
    });

    testbed.step = function () {
        // Traverse the contact results. Apply a force on shapes
        // that overlap the sensor.
        for (let i = 0; i < COUNT; ++i) {
            if (!touching[i].touching) {
                continue;
            }

            const body = bodies[i];
            const ground = sensor.getBody();

            const circle = sensor.getShape();
            const center = ground.getWorldPoint(circle.getCenter());

            const position = body.getPosition();

            const d = Vec2.sub(center, position);
            if (d.lengthSquared() < MathUtil.EPSILON * MathUtil.EPSILON) {
                continue;
            }

            d.normalize();
            const F = Vec2.mul(100, d);
            body.applyForce(F, position, false);
        }
    };

    return world;
});
