import {Body, BoxShape, CircleShape, EdgeShape, PolygonShape, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Bridge', function (_) {
    const world = new World({gravity: new Vec2(0, -4)});
    const COUNT = 30;
    let middle;
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), {});

    const bridgeRect = new BoxShape(0.5, 0.125, Vec2.ZERO, 0);

    const bridgeFD = {
        density: 20.0,
        friction: 0.2
    };

    let prevBody = ground;
    for (let i = 0; i < COUNT; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(-14.5 + i, 5.0)
        });
        body.createFixture(bridgeRect, bridgeFD);

        const anchor = new Vec2(-15.0 + i, 5.0);
        world.createJoint(new RevoluteJoint({bodyA: prevBody, bodyB: body, anchor}));

        if (i * 2 === COUNT) {
            middle = body;
        }
        prevBody = body;
    }

    const anchor = new Vec2(-15.0 + COUNT, 5.0);
    world.createJoint(new RevoluteJoint({bodyA: prevBody, bodyB: ground, anchor}));

    for (let i = 0; i < 2; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-8.0 + 8.0 * i, 12.0)});

        const vertices = [
            new Vec2(-0.5, 0.0),
            new Vec2(0.5, 0.0),
            new Vec2(0.0, 1.5)
        ];
        body.createFixture(new PolygonShape(vertices), {density: 1.0});
    }

    const shape = new CircleShape(0, 0, 0.5);
    for (let i = 0; i < 3; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(-6.0 + 6.0 * i, 10.0)
        });
        body.createFixture(shape, {density: 1.0});
    }

    return world;
});
