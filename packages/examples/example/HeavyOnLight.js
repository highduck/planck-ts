import {Body, CircleShape, EdgeShape, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('HeavyOnLight', function (_) {
    const world = new World({gravity: new Vec2(0, -10)});

    world.createBody().createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(0.0, 4.5)
    }).createFixture(new CircleShape(0, 0, 0.5), {density: 10});

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(0.0, 10.0)
    }).createFixture(new CircleShape(0, 0, 5.0), {density: 10});

    return world;
});
