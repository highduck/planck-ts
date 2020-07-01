import {Body, BoxShape, CircleShape, DistanceJoint, EdgeShape, RevoluteJoint, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Dominos', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    testbed.width = 40;
    testbed.height = 40;

    const b1 = world.createBody();
    b1.createFixture(new EdgeShape(new Vec2(-40, 0), new Vec2(40, 0)));

    let ground = world.createBody({position: new Vec2(-1.5, 10)});
    ground.createFixture(new BoxShape(6, 0.25));

    const columnShape = new BoxShape(0.1, 1);

    let fd = {
        density: 20,
        friction: 0.1,
    };

    for (let i = 0; i < 10; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-6 + i, 11.25)});
        body.createFixture(columnShape, fd);
    }

    ground = world.createBody({position: new Vec2(1, 6)});
    ground.createFixture(new BoxShape(7, 0.25, Vec2.zero(), 0.3));

    const b2 = world.createBody({position: new Vec2(-7, 4)});
    b2.createFixture(new BoxShape(0.25, 1.5));

    const b3 = world.createBody({type: Body.DYNAMIC, position: new Vec2(-0.9, 1), angle: -0.15});
    b3.createFixture(new BoxShape(6, 0.125), {density: 10});

    world.createJoint(new RevoluteJoint({collideConnected: true, bodyA: b1, bodyB: b3, anchor: new Vec2(-2, 1)}));

    const b4 = world.createBody({type: Body.DYNAMIC, position: new Vec2(-10, 15)});
    b4.createFixture(new BoxShape(0.25, 0.25), {density: 10});

    world.createJoint(new RevoluteJoint({collideConnected: true, bodyA: b2, bodyB: b4, anchor: new Vec2(-7, 15)}));

    const b5 = world.createBody({type: Body.DYNAMIC, position: new Vec2(6.5, 3)});

    fd = {
        density: 10,
        friction: 0.1
    };

    b5.createFixture(new BoxShape(1, 0.1, new Vec2(0, -0.9), 0), fd);
    b5.createFixture(new BoxShape(0.1, 1, new Vec2(-0.9, 0), 0), fd);
    b5.createFixture(new BoxShape(0.1, 1, new Vec2(0.9, 0), 0), fd);

    world.createJoint(new RevoluteJoint({collideConnected: true, bodyA: b1, bodyB: b5, anchor: new Vec2(6, 2)}));

    const b6 = world.createBody({type: Body.DYNAMIC, position: new Vec2(6.5, 4.1)});
    b6.createFixture(new BoxShape(1, 0.1), {density: 30});

    world.createJoint(new RevoluteJoint({collideConnected: true, bodyA: b5, bodyB: b6, anchor: new Vec2(7.5, 4)}));

    const b7 = world.createBody({type: Body.DYNAMIC, position: new Vec2(7.4, 1)});
    b7.createFixture(new BoxShape(0.1, 1), {density: 10});

    world.createJoint(new DistanceJoint({
        bodyA: b3,
        localAnchorA: new Vec2(6, 0),
        bodyB: b7,
        localAnchorB: new Vec2(0, -1)
    }));

    const radius = 0.2;
    const circleShape = new CircleShape(0, 0, radius);
    for (let i = 0; i < 4; ++i) {
        const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(5.9 + 2 * radius * i, 2.4)});
        body.createFixture(circleShape, {density: 10});
    }

    return world;
});
