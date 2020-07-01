import {Body, BoxShape, EdgeShape, Vec2, World, MathUtil} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('BulletTest', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    // TODO:
    // const stats = pl.internal.stats;

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-10.0, 0.0), new Vec2(10.0, 0.0)));
    ground.createFixture(new BoxShape(0.2, 1.0, new Vec2(0.5, 1.0), 0.0));

    const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 4.0)});
    body.createFixture(new BoxShape(2.0, 0.1, Vec2.ZERO, 0), {density: 1.0});

    // x = MathUtil.random(-1.0, 1.0);
    let x = 0.20352793;

    const bullet = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(x, 10.0),
        bullet: true,
    });
    bullet.createFixture(new BoxShape(0.25, 0.25, Vec2.ZERO, 0), {density: 100.0});

    bullet.setLinearVelocity(new Vec2(0.0, -50.0));

    function Launch() {
        body.setTransform(new Vec2(0.0, 4.0), 0.0);
        body.setLinearVelocity(new Vec2.zero());
        body.setAngularVelocity(0.0);

        x = MathUtil.random(-1.0, 1.0);
        bullet.setTransform(new Vec2(x, 10.0), 0.0);
        bullet.setLinearVelocity(new Vec2(0.0, -50.0));
        bullet.setAngularVelocity(0.0);

        // TODO:
        // stats.gjkCalls = 0;
        // stats.gjkIters = 0;
        // stats.gjkMaxIters = 0;
        //
        // stats.toiCalls = 0;
        // stats.toiIters = 0;
        // stats.toiMaxIters = 0;
        // stats.toiRootIters = 0;
        // stats.toiMaxRootIters = 0;
    }

    let stepCount = 0;
    testbed.step = function () {
        // TODO:
        // testbed.status(stats);

        // if (stats.gjkCalls > 0) {
        //   "gjk calls = %d, ave gjk iters = %3.1, max gjk iters = %d",
        //   stats.gjkCalls, stats.gjkIters / float32(stats.gjkCalls), stats.gjkMaxIters);
        // }

        // if (stats.toiCalls > 0) {
        //   "toi calls = %d, ave toi iters = %3.1, max toi iters = %d",
        //   stats.toiCalls, stats.toiIters / float32(stats.toiCalls), stats.toiMaxRootIters);
        //
        //   "ave toi root iters = %3.1, max toi root iters = %d", stats.toiRootIters
        //       / float32(stats.toiCalls), stats.toiMaxRootIters);
        // }

        if (stepCount++ % 60 === 0) {
            Launch();
        }
    };

    return world;
});
