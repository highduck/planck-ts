import {Body, BoxShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('ConveyorBelt', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    // Ground
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-20.0, 0.0), new Vec2(20.0, 0.0)));

    // Platform
    const platform = world
        .createBody({position: new Vec2(-5.0, 5.0)})
        .createFixture(new BoxShape(10.0, 0.5), {friction: 0.8});

    // Boxes
    for (let i = 0; i < 5; ++i) {
        world.createBody({type: Body.DYNAMIC, position: new Vec2(-10.0 + 2.0 * i, 7.0)})
            .createFixture(new BoxShape(0.5, 0.5, Vec2.ZERO, 0), {density: 20});
    }

    world.on('pre-solve', function (contact, oldManifold) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        if (fixtureA === platform) {
            contact.setTangentSpeed(5.0);
        }

        if (fixtureB === platform) {
            contact.setTangentSpeed(-5.0);
        }
    });

    return world;
});
