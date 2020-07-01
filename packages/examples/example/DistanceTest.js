import {BoxShape, Transform, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";
import {SimplexCache, DistanceInput, DistanceOutput, Distance} from "planck-ts";

testbed('DistanceTest', function (testbed) {
    const world = new World();

    const transformA = Transform.identity();
    transformA.p.set(0.0, -0.2);

    const polygonA = new BoxShape(10.0, 0.2);

    const positionB = new Vec2(12.017401, 0.13678508);
    let angleB = -0.0109265;
    const transformB = Transform.identity();
    transformB.setPosAngle(positionB, angleB);

    const polygonB = new BoxShape(2.0, 0.1);

    const bodyA = world.createBody();
    const fixA = bodyA.createFixture(polygonA);

    const bodyB = world.createBody();
    const fixB = bodyB.createFixture(polygonB);

    testbed.step = function () {
        const input = new DistanceInput();
        input.proxyA.set(polygonA, 0);
        input.proxyB.set(polygonB, 0);
        input.transformA = transformA;
        input.transformB = transformB;
        input.useRadii = true;

        const cache = new SimplexCache();

        const output = new DistanceOutput();

        Distance(output, cache, input);

        testbed.status("Distance", output.distance);
        testbed.status("Iterations", output.iterations);

        bodyA.setTransform2(transformA);
        bodyB.setTransform2(transformB);

        const x1 = output.pointA;
        const x2 = output.pointB;

        testbed.drawPoint(x1, 4.0, testbed.color(1.0, 0.0, 0.0));
        testbed.drawPoint(x2, 4.0, testbed.color(1.0, 1.0, 0.0));
    };

    testbed.keydown = function () {
        if (testbed.activeKeys['left']) {
            positionB.x -= 0.1;
        }

        if (testbed.activeKeys['right']) {
            positionB.x += 0.1;
        }

        if (testbed.activeKeys['down']) {
            positionB.y -= 0.1;
        }

        if (testbed.activeKeys['up']) {
            positionB.y += 0.1;
        }

        if (testbed.activeKeys['Z']) {
            angleB += 0.1;
        }

        if (testbed.activeKeys['X']) {
            angleB -= 0.1;
        }

        transformB.set(positionB, angleB);
    };

    return world;
});
