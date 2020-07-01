import {PolygonShape, Vec2, World, MathUtil} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('ConvexHull', function (testbed) {
    const world = new World();

    testbed.x = 0;
    testbed.y = 0;

    const COUNT = 8;

    let auto = false;
    const points = [];

    let shape;

    Generate();

    function Generate() {

        const lowerBound = new Vec2(-8.0, -8.0);
        const upperBound = new Vec2(8.0, 8.0);

        points.length = 0;
        for (let i = 0; i < COUNT; ++i) {
            const x = 10.0 * Math.random() - 5;
            const y = 10.0 * Math.random() - 5;

            // Clamp onto a square to help create collinearities.
            // This will stress the convex hull algorithm.
            const v = new Vec2(
                MathUtil.clamp(x, lowerBound.x, upperBound.x),
                MathUtil.clamp(y, lowerBound.y, upperBound.y),
            );
            points.push(v);
        }

        shape = new PolygonShape(points);
    }

    testbed.keydown = function (code, char) {
        switch (char) {
            case 'Z':
                auto = !auto;
                break;

            case 'X':
                Generate();
                break;
        }
    };

    testbed.info('X: Generate a new random convex hull, Z: Auto-generate');

    testbed.step = function () {
        testbed.drawPolygon(shape.m_vertices, testbed.color(0.9, 0.9, 0.9));

        for (let i = 0; i < points.length; ++i) {
            testbed.drawPoint(points[i], 3.0, testbed.color(0.3, 0.9, 0.3));
            // testbed.drawString(points[i] + Vec2(0.05, 0.05), "%d", i);
        }

        // if (shape.validate() == false) {
        //   m_textLine += 0;
        // }

        if (auto) {
            Generate();
        }
    };

    return world;
});
