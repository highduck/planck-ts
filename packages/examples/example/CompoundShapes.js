import {Body, BoxShape, CircleShape, EdgeShape, MathUtil, PolygonShape, Transform, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// TODO_ERIN test joints on compounds.
testbed('CompoundShapes', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    world.createBody({position: new Vec2(0.0, 0.0)})
        .createFixture(new EdgeShape(new Vec2(50.0, 0.0), new Vec2(-50.0, 0.0)));

    const circle1 = new CircleShape(-0.5, 0.5, 0.5);
    const circle2 = new CircleShape(0.5, 0.5, 0.5);

    for (let i = 0; i < 10; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(MathUtil.random(-0.1, 0.1) + 5.0, 1.05 + 2.5 * i),
            angle: MathUtil.random(-Math.PI, Math.PI)
        });
        body.createFixture(circle1, {density: 2});
        body.createFixture(circle2, {density: 0});
    }

    const polygon1 = new BoxShape(0.25, 0.5);
    const polygon2 = new BoxShape(0.25, 0.5, new Vec2(0.0, -0.5), 0.5 * Math.PI);

    for (let i = 0; i < 10; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(MathUtil.random(-0.1, 0.1) - 5.0, 1.05 + 2.5 * i),
            angle: MathUtil.random(-Math.PI, Math.PI)
        });
        body.createFixture(polygon1, {density: 2});
        body.createFixture(polygon2, {density: 2});
    }

    const xf1 = Transform.identity();
    xf1.q.setAngle(0.3524 * Math.PI);
    xf1.p = xf1.q.getXAxis();

    const triangle1 = new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 0.5)
    ].map((v) => Transform.mulVec2(xf1, v)));

    const xf2 = Transform.identity();
    xf2.q.setAngle(-0.3524 * Math.PI);
    xf2.p = Vec2.neg(xf2.q.getXAxis());

    const triangle2 = new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 0.5)
    ].map((v) => Transform.mulVec2(xf2, v)));

    for (let i = 0; i < 10; ++i) {
        const body = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(MathUtil.random(-0.1, 0.1), 2.05 + 2.5 * i),
            angle: 0.0
        });
        body.createFixture(triangle1, {density: 2});
        body.createFixture(triangle2, {density: 2});
    }

    const bottom = new BoxShape(1.5, 0.15);
    const left = new BoxShape(0.15, 2.7, new Vec2(-1.45, 2.35), 0.2);
    const right = new BoxShape(0.15, 2.7, new Vec2(1.45, 2.35), -0.2);

    const container = world.createBody({position: new Vec2(0.0, 2.0)});
    container.createFixture(bottom, {density: 4});
    container.createFixture(left, {density: 4});
    container.createFixture(right, {density: 4});

    return world;
});
