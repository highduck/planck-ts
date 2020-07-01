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

testbed('Rope', function (testbed) {


    const world = new World({gravity: new Vec2(0, -10)});

    testbed.info('Not implemented!');
    return world;

    let /* Rope */rope;
    let /* float32 */angle;

    const N = 40;
    const vertices = [];
    const masses = [];

    for (let i = 0; i < N; ++i) {
        vertices[i].set(0.0, 20.0 - 0.25 * i);
        masses[i] = 1.0;
    }
    masses[0] = 0.0;
    masses[1] = 0.0;

    const def = {
        vertices: vertices,
        count: N,
        gravity: new Vec2(0.0, -10.0),
        masses: masses,
        damping: 0.1,
        k2: 1.0,
        k3: 0.5,
    };

    rope.initialize(def);

    angle = 0.0;
    rope.setAngle(angle);

    testbed.keydown = function (code, char) {
        switch (char) {
            case 'Z':
                angle = Math.max(-Math.PI, angle - 0.05 * Math.PI);
                rope.setAngle(angle);
                break;

            case 'X':
                angle = Math.min(Math.PI, angle + 0.05 * Math.PI);
                rope.setAngle(angle);
                break;
        }
    };

    testbed.step = function (settings) {
        let dt = settings.hz > 0.0 ? 1.0 / settings.hz : 0.0;

        if (settings.pause === 1 && settings.singleStep == 0) {
            dt = 0.0;
        }

        rope.step(dt, 1);

        testbed.status('Target angle', (angle * 180.0 / Math.PI) + degrees);
    };
    testbed.info("Z/X to adjust target angle");

    return world;
});
