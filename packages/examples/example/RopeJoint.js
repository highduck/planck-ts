import {Body, BoxShape, EdgeShape, RevoluteJoint, RopeJoint, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

/// This test shows how a rope joint can be used to stabilize a chain of
/// bodies with a heavy payload. Notice that the rope joint just prevents
/// excessive stretching and has no other effect.
/// By disabling the rope joint you can see that the Box2D solver has trouble
/// supporting heavy bodies with light bodies. Try playing around with the
/// densities, time step, and iterations to see how they affect stability.
/// This test also shows how to use contact filtering. Filtering is configured
/// so that the payload does not collide with the chain.
testbed('RopeJoint', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), 0.0);

    const segmentDef = {
        density: 20.0,
        friction: 0.2,
        filterCategoryBits: 0x0001,
        filterMaskBits: 0xFFFF & ~0x0002,
    };

    const segmentJointDef = {
        collideConnected: false
    };

    const N = 10;
    const y = 15.0;

    let prevBody = ground;
    for (let i = 0; i < N; ++i) {
        let shape = new BoxShape(0.5, 0.125);
        const bd = {
            type: Body.DYNAMIC,
            position: new Vec2(0.5 + i, y)
        }
        if (i === N - 1) {
            shape = new BoxShape(1.5, 1.5);
            segmentDef.density = 100.0;
            segmentDef.filterCategoryBits = 0x0002;
            bd.position = new Vec2(i, y);
            bd.angularDamping = 0.4;
        }

        const body = world.createBody(bd);
        body.createFixture(shape, segmentDef);
        const anchor = new Vec2(i, y);
        world.createJoint(new RevoluteJoint(Object.assign({bodyA: prevBody, bodyB: body, anchor}, segmentJointDef)));

        prevBody = body;
    }

    const ropeJointDef = {
        maxLength: N - 1.0 + 0.01,
        localAnchorA: new Vec2(0.0, y),
        localAnchorB: new Vec2(0, 0),
    }
    let rope = world.createJoint(new RopeJoint(
        Object.assign({
            bodyA: ground, bodyB: prevBody
        }, ropeJointDef)));

    testbed.info('X: Toggle the rope joint');

    testbed.keydown = function (code, char) {
        if (char === 'X') {
            if (rope) {
                world.destroyJoint(rope);
                rope = null;
            } else {
                rope = world.createJoint(new RopeJoint(
                    Object.assign({bodyA: ground, bodyB: prevBody}, ropeJointDef)
                ));
            }
        }

        updateStatus();
    };

    function updateStatus() {
        testbed.status('Rope', !!rope);
    }

    updateStatus();

    return world;
});
