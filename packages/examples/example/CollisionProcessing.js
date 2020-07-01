import {Body, BoxShape, CircleShape, EdgeShape, MathUtil, PolygonShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// This test shows collision processing and tests
// deferred body destruction.
testbed('CollisionProcessing', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    // Ground body
    world.createBody().createFixture(new EdgeShape(new Vec2(-50.0, 0.0), new Vec2(50.0, 0.0)));

    const xLo = -5.0, xHi = 5.0;
    const yLo = 2.0, yHi = 35.0;

    // Small triangle
    const body1 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body1.createFixture(new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 2.0)
    ]), {density: 1});

    // Large triangle (recycle definitions)
    const body2 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body2.createFixture(new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 2.0)
    ]), {density: 1});

    // Small box
    const body3 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body3.createFixture(new BoxShape(1.0, 0.5), {density: 1.0});

    // Large box (recycle definitions)
    const body4 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body4.createFixture(new BoxShape(2.0, 1.0), {density: 1.0});

    // Small circle
    const body5 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body5.createFixture(new CircleShape(0, 0, 1), {density: 1.0});

    // Large circle
    const body6 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(MathUtil.random(xLo, xHi), MathUtil.random(yLo, yHi))
    });
    body6.createFixture(new CircleShape(0, 0, 2.0), {density: 1.0});

    const points = [];

    world.on('pre-solve', function (contact, oldManifold) {
        const manifold = contact.getManifold();

        if (manifold.pointCount === 0) {
            return;
        }

        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        const worldManifold = contact.getWorldManifold();

        for (let i = 0; i < manifold.pointCount; ++i) {
            const cp = {
                fixtureA: fixtureA,
                fixtureB: fixtureB,
                position: worldManifold.points[i],
                normal: worldManifold.normal,
                normalImpulse: manifold.points[i].normalImpulse,
                tangentImpulse: manifold.points[i].tangentImpulse,
                separation: worldManifold.separations[i],
                // state: state2[i],
            };
            points.push(cp);
        }
    });

    const bomb = null;
    const MAX_NUKE = 6;

    testbed.step = function () {

        // We are going to destroy some bodies according to contact
        // points. We must buffer the bodies that should be destroyed
        // because they may belong to multiple contact points.
        const nuke = [];

        // Traverse the contact results. Destroy bodies that
        // are touching heavier bodies.
        for (let i = 0; i < points.length && nuke.length < MAX_NUKE; ++i) {
            const point = points[i];

            const body1 = point.fixtureA.getBody();
            const body2 = point.fixtureB.getBody();
            const mass1 = body1.getMass();
            const mass2 = body2.getMass();

            if (mass1 > 0.0 && mass2 > 0.0) {
                if (mass2 > mass1) {
                    nuke.push(body1);
                } else {
                    nuke.push(body2);
                }
            }
        }

        for (let i = 0; i < nuke.length; i++) {
            const b = nuke[i];
            if (b !== bomb) {
                world.destroyBody(b);
            }
        }

        points.length = 0;
    };

    return world;
});
