import {Body, BoxShape, CircleShape, EdgeShape, GJKStats, MathUtil, TOIStats, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('ContinuousTest', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    let bullet;
    let angularVelocity;

    const ground = world.createBody({position: new Vec2(0.0, 0.0)});

    ground.createFixture(new EdgeShape(new Vec2(-10.0, 0.0), new Vec2(10.0, 0.0)));
    ground.createFixture(new BoxShape(0.2, 1.0, new Vec2(0.5, 1.0), 0.0));

    if (1) {
        // angle = 0.1;
        bullet = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 20.0)});
        bullet.createFixture(new BoxShape(2.0, 0.1, Vec2.ZERO, 0), {density: 1.0});

        angularVelocity = MathUtil.random(-50.0, 50.0);
        // angularVelocity = 46.661274;
        bullet.setLinearVelocity(new Vec2(0.0, -100.0));
        bullet.setAngularVelocity(angularVelocity);

    } else {
        const shape = new CircleShape(0, 0, 0.5);

        let body = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 2.0)});
        body.createFixture(shape, {density: 1});

        body = world.createBody({
            type: Body.DYNAMIC,
            bullet: true,
            position: new Vec2(0.0, 2.0),
        });
        body.createFixture(shape, {density: 1});
        body.setLinearVelocity(new Vec2(0.0, -100.0));
    }

    function Launch() {
        GJKStats.calls = 0;
        GJKStats.iters = 0;
        GJKStats.maxIters = 0;

        TOIStats.calls = 0;
        TOIStats.iters = 0;
        TOIStats.rootIters = 0;
        TOIStats.maxRootIters = 0;
        TOIStats.time = 0.0;
        TOIStats.maxTime = 0.0;

        bullet.setTransform(new Vec2(0.0, 20.0), 0.0);
        angularVelocity = MathUtil.random(-50.0, 50.0);
        bullet.setLinearVelocity(new Vec2(0.0, -100.0));
        bullet.setAngularVelocity(angularVelocity);
    }

    Launch();

    let stepCount = 0;
    testbed.step = function () {
        testbed.status({gkj: GJKStats, toi: TOIStats});

        if (GJKStats.calls > 0) {
            // "gjk calls = %d, ave gjk iters = %3.1, max gjk iters = %d", stats.gjkCalls, stats.gjkIters / float32(stats.gjkCalls), stats.gjkMaxIters
        }

        if (TOIStats.calls > 0) {
            // "toi calls = %d, ave [max] toi iters = %3.1 [%d]", stats.toiCalls, stats.toiIters / float32(stats.toiCalls), stats.toiMaxRootIters
            // "ave [max] toi root iters = %3.1 [%d]", stats.toiRootIters / float32(stats.toiCalls), stats.toiMaxRootIters
            // "ave [max] toi time = %.1 [%.1] (microseconds)", 1000.0 * stats.toiTime / float32(stats.toiCalls), 1000.0 * stats.toiMaxTime
        }

        if (stepCount++ % 60 == 0) {
            Launch();
        }
    };

    return world;
});
