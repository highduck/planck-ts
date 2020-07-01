import {Body, BoxShape, CircleShape, EdgeShape, PolygonShape, Vec2, WeldJoint, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// It is difficult to make a cantilever made of links completely rigid with weld joints.
// You will have to use a high number of iterations to make them stiff.
// So why not go ahead and use soft weld joints? They behave like a revolute
// joint with a rotational spring.
testbed('Cantilever', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    const COUNT = 8;

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    let prevBody = ground;
    for (let i = 0; i < COUNT; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-14.5 + i, 5.0)});
        body.createFixture(new BoxShape(0.5, 0.125, Vec2.ZERO, 0), {density: 20.0});

        const anchor = new Vec2(-15.0 + i, 5.0);
        world.createJoint(new WeldJoint({
            bodyA: prevBody,
            bodyB: body,
            anchor
        }));

        prevBody = body;
    }

    prevBody = ground;
    for (let i = 0; i < 3; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-14.0 + 2.0 * i, 15.0)});
        body.createFixture(new BoxShape(1.0, 0.125, Vec2.ZERO, 0), {density: 20.0});

        const anchor = new Vec2(-15.0 + 2.0 * i, 15.0);
        world.createJoint(new WeldJoint({
            frequencyHz: 5.0,
            dampingRatio: 0.7,
            bodyA: prevBody,
            bodyB: body,
            anchor
        }));

        prevBody = body;
    }

    prevBody = ground;
    for (let i = 0; i < COUNT; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-4.5 + i, 5.0)});
        body.createFixture(new BoxShape(0.5, 0.125, Vec2.ZERO, 0), {density: 20.0});

        if (i > 0) {
            const anchor = new Vec2(-5.0 + i, 5.0);
            world.createJoint(new WeldJoint({bodyA: prevBody, bodyB: body, anchor}));
        }

        prevBody = body;
    }

    prevBody = ground;
    for (let i = 0; i < COUNT; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(5.5 + i, 10.0)});
        body.createFixture(new BoxShape(0.5, 0.125, Vec2.ZERO, 0), {density: 20.0});

        if (i > 0) {
            const anchor = new Vec2(5.0 + i, 10.0);
            world.createJoint(new WeldJoint({
                bodyA: prevBody,
                bodyB: body,
                anchor: anchor,
                frequencyHz: 8.0,
                dampingRatio: 0.7,
            }));
        }

        prevBody = body;
    }

    for (let i = 0; i < 2; ++i) {
        const vertices = [
            new Vec2(-0.5, 0.0),
            new Vec2(0.5, 0.0),
            new Vec2(0.0, 1.5),
        ];

        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-8.0 + 8.0 * i, 12.0)});
        body.createFixture(new PolygonShape(vertices), {density: 1.0});
    }

    for (let i = 0; i < 2; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-6.0 + 6.0 * i, 10.0)});
        body.createFixture(new CircleShape(0, 0, 0.5), {density: 1.0});
    }

    return world;
});
