import {Body, BoxShape, EdgeShape, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Chain', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    const shape = new BoxShape(0.6, 0.125, Vec2.ZERO, 0);

    const y = 25.0;
    let prevBody = ground;
    for (let i = 0; i < 30; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(0.5 + i, y)
        });
        body.createFixture(shape, {
            density: 20.0,
            friction: 0.2,
        });
        world.createJoint(new RevoluteJoint({
            collideConnected: false,
            bodyA: prevBody,
            bodyB: body,
            anchor: new Vec2(i, y)
        }));
        prevBody = body;
    }

    return world;
});
