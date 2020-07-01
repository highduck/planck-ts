import {Body, BoxShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('VaryingFriction', function (_) {
    const world = new World({gravity: new Vec2(0, -10)});

    world.createBody().createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    world.createBody({
        position: new Vec2(-4.0, 22.0), angle: -0.25
    }).createFixture(new BoxShape(13.0, 0.25, Vec2.ZERO, 0));

    world.createBody({
        position: new Vec2(10.5, 19.0)
    }).createFixture(new BoxShape(0.25, 1.0, Vec2.ZERO, 0));

    world.createBody({
        position: new Vec2(4.0, 14.0),
        angle: 0.25
    }).createFixture(new BoxShape(13.0, 0.25, Vec2.ZERO, 0));

    world.createBody({
        position: new Vec2(-10.5, 11.0)
    }).createFixture(new BoxShape(0.25, 1.0, Vec2.ZERO, 0));

    world.createBody({
        position: new Vec2(-4.0, 6.0),
        angle: -0.25
    }).createFixture(new BoxShape(13.0, 0.25, Vec2.ZERO, 0));

    const friction = [0.75, 0.5, 0.35, 0.1, 0.0];

    const circle = new BoxShape(0.5, 0.5, Vec2.ZERO, 0);

    for (let i = 0; i < friction.length; ++i) {
        const ball = world.createBody({type: Body.DYNAMIC, position: new Vec2(-15.0 + 4.0 * i, 28.0)});
        ball.createFixture(circle, {
            density: 25.0,
            friction: friction[i]
        });
    }

    return world;
});
