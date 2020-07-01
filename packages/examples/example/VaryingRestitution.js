import {Body, CircleShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// Note: even with a restitution of 1.0, there is some energy change
// due to position correction.
testbed('VaryingRestitution', function (_) {
    const world = new World({gravity: new Vec2(0, -10)});

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    const restitution = [0.0, 0.1, 0.3, 0.5, 0.75, 0.9, 1.0];

    const circle = new CircleShape(0, 0, 1);

    for (let i = 0; i < restitution.length; ++i) {
        const ball = world.createBody({type: Body.DYNAMIC, position: new Vec2(-10.0 + 3.0 * i, 20.0)});
        ball.createFixture(circle, {
            density: 1.0,
            restitution: restitution[i]
        });
    }

    return world;
});
