import {Body, BoxShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// This stress tests the dynamic tree broad-phase. This also shows that tile
// based collision is _not_ smooth due to Box2D not knowing about adjacency.
testbed('Tiles', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const COUNT = 20;

    let fixtureCount = 0;

    const a = 0.5;
    const ground = world.createBody({
        position: new Vec2(0, -a)
    });

    if (1) {
        const N = 200;
        const M = 10;
        const position = Vec2.zero();
        position.y = 0.0;
        for (let j = 0; j < M; ++j) {
            position.x = -N * a;
            for (let i = 0; i < N; ++i) {
                ground.createFixture(new BoxShape(a, a, position, 0.0));
                ++fixtureCount;
                position.x += 2.0 * a;
            }
            position.y -= 2.0 * a;
        }

    } else {
        const N = 200;
        const M = 10;
        const position = Vec2.zero();
        position.x = -N * a;
        for (let i = 0; i < N; ++i) {
            position.y = 0.0;
            for (let j = 0; j < M; ++j) {
                ground.createFixture(new BoxShape(a, a, position, 0.0));
                position.y -= 2.0 * a;
            }
            position.x += 2.0 * a;
        }
    }

    const shape = new BoxShape(a, a);

    const x = new Vec2(-7.0, 0.75);
    const y = Vec2.zero();
    const deltaX = new Vec2(0.5625, 1.25);
    const deltaY = new Vec2(1.125, 0.0);

    for (let i = 0; i < COUNT; ++i) {
        y.copyFrom(x);

        for (let j = i; j < COUNT; ++j) {

            // bd.allowSleep = !(i == 0 && j == 0)

            const body = world.createBody({type: Body.DYNAMIC, position: y});
            body.createFixture(shape, {density: 5});
            ++fixtureCount;
            y.add(deltaY);
        }

        x.add(deltaX);
    }

    const createTime = Date.now();

    testbed.step = function () {
        const height = world.getTreeHeight();
        const leafCount = world.getProxyCount();
        const minimumNodeCount = 2 * leafCount - 1;
        const minimumHeight = Math.ceil(Math.log(minimumNodeCount) / Math.log(2.0));

        testbed.status("dynamic tree height", height);
        testbed.status("min", minimumHeight);
        testbed.status("create time", createTime + "ms");
        testbed.status("fixture count", fixtureCount);

        // var tree = world.m_broadPhase.m_tree;
        // if (stepCount++ == 400) {
        // tree.rebuildBottomUp();
        // }
    };

    return world;
});
