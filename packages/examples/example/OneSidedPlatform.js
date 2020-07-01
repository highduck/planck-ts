import {Body, BoxShape, CircleShape, EdgeShape, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('OneSidedPlatform', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    const radius = 0.5;
    const top = 10.0 + 0.5;
    const bottom = 10.0 - 0.5;

    const UNKNOWN = 0, ABOVE = +1, BELOW = -1;

    const state = UNKNOWN;

    // Ground
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-20.0, 0.0), new Vec2(20.0, 0.0)));

    // Platform
    const platform = world.createBody(new Vec2(0.0, 10.0));
    const platformFix = platform.createFixture(new BoxShape(3.0, 0.5));

    // Actor
    const character = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 12.0)});
    const characterFix = character.createFixture(new CircleShape(0, 0, radius), {density: 20.0});
    character.setLinearVelocity(new Vec2(0.0, -50.0));

    world.on('pre-solve', function (contact, oldManifold) {
        const fixA = contact.getFixtureA();
        const fixB = contact.getFixtureB();

        const isCharPlatformContact =
            fixA === platformFix && fixB === characterFix ||
            fixB === platformFix && fixA === characterFix;

        if (!isCharPlatformContact) {
            return;
        }

        if (0) {
            const p = character.getPosition();

            if (p.y < top + radius - 3.0 * /*linearSlop*/ 0.005) {
                contact.setEnabled(false);
            }
        } else {
            const v = character.getLinearVelocity();
            if (v.y > 0.0) {
                contact.setEnabled(false);
            }
        }
    });

    testbed.step = function (settings) {
        const v = character.getLinearVelocity();
        testbed.status("Character Linear Velocity", v.y);
    };

    return world;
});
