import {Body, BoxShape, PrismaticJoint, RevoluteJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

// A basic slider crank created for GDC tutorial: Understanding Constraints
testbed('BasicSliderCrank', function (_) {
    const world = new World({gravity: new Vec2(0, -10)});

    const ground = world.createBody({
        position: new Vec2(0.0, 17.0)
    });

    // Define crank.
    const crank = world.createBody({type: Body.DYNAMIC, position: new Vec2(-8.0, 20.0)});
    crank.createFixture(new BoxShape(4.0, 1.0, Vec2.ZERO, 0), {density: 2.0});
    world.createJoint(new RevoluteJoint({bodyA: ground, bodyB: crank, anchor: new Vec2(-12.0, 20.0)}));

    // Define connecting rod
    const rod = world.createBody({type: Body.DYNAMIC, position: new Vec2(4.0, 20.0)});
    rod.createFixture(new BoxShape(8.0, 1.0, Vec2.ZERO, 0), {density: 2.0});
    world.createJoint(new RevoluteJoint({bodyA: crank, bodyB: rod, anchor: new Vec2(-4.0, 20.0)}));

    // Define piston
    const piston = world.createBody({
        type: Body.DYNAMIC,
        fixedRotation: true,
        position: new Vec2(12.0, 20.0)
    });
    piston.createFixture(new BoxShape(3.0, 3.0, Vec2.ZERO, 0), {density: 2.0});
    world.createJoint(new RevoluteJoint({bodyA: rod, bodyB: piston, anchor: new Vec2(12.0, 20.0)}));
    world.createJoint(new PrismaticJoint({
        bodyA: ground,
        bodyB: piston,
        anchor: new Vec2(12.0, 17.0),
        axis: new Vec2(1.0, 0.0)
    }));

    return world;
});
