import {
    FrictionJoint,
    Body,
    BoxShape,
    CircleShape,
    EdgeShape,
    Vec2,
    World,
    Transform,
    PolygonShape
} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Apply Force', function (testbed) {
    testbed.y = -20;

    const world = new World();

    const ground = world.createBody({position: new Vec2(0.0, 20.0)});

    const wallFD = {
        density: 0.0,
        restitution: 0.4,
    };

    // Left vertical
    ground.createFixture(new EdgeShape(new Vec2(-20.0, -20.0), new Vec2(-20.0, 20.0)), wallFD);

    // Right vertical
    ground.createFixture(new EdgeShape(new Vec2(20.0, -20.0), new Vec2(20.0, 20.0)), wallFD);

    // Top horizontal
    ground.createFixture(new EdgeShape(new Vec2(-20.0, 20.0), new Vec2(20.0, 20.0)), wallFD);

    // Bottom horizontal
    ground.createFixture(new EdgeShape(new Vec2(-20.0, -20.0), new Vec2(20.0, -20.0)), wallFD);

    const xf1 = Transform.identity();
    xf1.q.setAngle(0.3524 * Math.PI);
    xf1.p.copyFrom(xf1.q.getXAxis());

    const poly1 = new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 0.5)
    ].map((v) => Transform.mulVec2(xf1, v)));

    const xf2 = Transform.identity();
    xf2.q.setAngle(-0.3524 * Math.PI);
    xf2.p.copyFrom(Vec2.neg(xf2.q.getXAxis()));

    const poly2 = new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 0.5)
    ].map((v) => Transform.mulVec2(xf2, v)));

    const jet = world.createBody({
        type: Body.DYNAMIC,
        angularDamping: 2.0,
        linearDamping: 0.5,
        position: new Vec2(0.0, 2.0),
        angle: Math.PI,
        allowSleep: false
    });

    jet.createFixture(poly1, {density: 2.0});
    jet.createFixture(poly2, {density: 2.0});

    const boxFD = {
        density: 1.0,
        friction: 0.3,
    };

    for (let i = 0; i < 10; ++i) {
        const box = world.createBody({
            type: Body.DYNAMIC,
            position: new Vec2(0.0, 5.0 + 1.54 * i)
        });

        box.createFixture(new BoxShape(0.5, 0.5, Vec2.ZERO, 0), boxFD);

        const gravity = 10.0;
        const I = box.getInertia();
        const mass = box.getMass();

        // For a circle: I = 0.5 * m * r * r ==> r = sqrt(2 * I / m)
        const radius = Math.sqrt(2.0 * I / mass);

        world.createJoint(new FrictionJoint({
            bodyA: ground,
            bodyB: box,
            collideConnected: true,
            maxForce: mass * gravity,
            maxTorque: mass * radius * gravity
        }));
    }

    testbed.step = function () {
        if (testbed.activeKeys.right && !testbed.activeKeys.left) {
            jet.applyAngularImpulse(-0.2, true);

        } else if (testbed.activeKeys.left && !testbed.activeKeys.right) {
            jet.applyAngularImpulse(+0.2, true);
        }

        if (testbed.activeKeys.up) {
            const f = jet.getWorldVector(new Vec2(0.0, -1.0));
            const p = jet.getWorldPoint(new Vec2(0.0, 2.0));
            jet.applyLinearImpulse(f, p, true);
        }
    };

    return world;
});
