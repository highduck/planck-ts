import {Body, BoxShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

// This is used to test sensor shapes.
testbed('Breakable', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    let breakVelocity;
    let breakAngularVelocity;

    let broke = false;

    // Ground body
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    // Breakable dynamic body
    const body1 = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 40.0), angle: 0.25 * Math.PI});

    const shape1 = new BoxShape(0.5, 0.5, new Vec2(-0.5, 0.0), 0.0);
    let piece1 = body1.createFixture(shape1, {density: 1});

    const shape2 = new BoxShape(0.5, 0.5, new Vec2(0.5, 0.0), 0.0);
    let piece2 = body1.createFixture(shape2, {density: 1});

    world.on('post-solve', function (contact, impulse) {
        if (broke) {
            // The body already broke.
            return;
        }

        // Should the body break?
        const count = contact.getManifold().pointCount;

        let maxImpulse = 0.0;
        for (let i = 0; i < count; ++i) {
            maxImpulse = Math.max(maxImpulse, impulse.normalImpulses[i]);
        }

        if (maxImpulse > 40.0) {
            setTimeout(function () {
                Break();
                broke = true;
            });
        }
    });

    function Break() {
        // Create two bodies from one.
        const center = body1.getWorldCenter();

        body1.destroyFixture(piece2);

        const body2 = world.createBody({
            type: Body.DYNAMIC,
            position: body1.getPosition(),
            angle: body1.getAngle()
        });

        piece2 = body2.createFixture(shape2, {density: 1});

        // Compute consistent velocities for new bodies based on
        // cached velocity.
        const center1 = body1.getWorldCenter();
        const center2 = body2.getWorldCenter();

        const velocity1 = Vec2.add(breakVelocity, Vec2.crossSV(breakAngularVelocity, Vec2.sub(center1, center)));
        const velocity2 = Vec2.add(breakVelocity, Vec2.crossSV(breakAngularVelocity, Vec2.sub(center2, center)));

        console.log(velocity1, velocity2);

        body1.setAngularVelocity(breakAngularVelocity);
        body1.setLinearVelocity(velocity1);

        body2.setAngularVelocity(-breakAngularVelocity);
        body2.setLinearVelocity(velocity2);
    }

    testbed.step = function () {
        // Cache velocities to improve movement on breakage.
        if (!broke) {
            breakVelocity = body1.getLinearVelocity();
            breakAngularVelocity = body1.getAngularVelocity();
        }
    };

    return world;
});
