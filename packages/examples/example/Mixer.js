import {Body, CircleShape, EdgeShape, MathUtil, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Mixer', function (testbed) {
    const world = new World();

    testbed.y = 0;

    const container = world.createBody({type: Body.KINEMATIC});
    container.createFixture(new EdgeShape(new Vec2(15, -5), new Vec2(25, 5)));

    container.createFixture(new EdgeShape(new Vec2(-20, -20), new Vec2(20, -20)));
    container.createFixture(new EdgeShape(new Vec2(-20, 20), new Vec2(20, 20)));
    container.createFixture(new EdgeShape(new Vec2(-20, -20), new Vec2(-20, 20)));
    container.createFixture(new EdgeShape(new Vec2(20, -20), new Vec2(20, 20)));

    for (let i = -5; i <= 5; i++) {
        for (let j = -5; j <= 5; j++) {
            const particle = world.createBody({type: Body.DYNAMIC, position: new Vec2(i * 2, j * 2)});
            particle.createFixture(new CircleShape(0, 0, 0.6));
            particle.setMassData({
                mass: 2,
                center: Vec2.zero(),
                I: 0.4
            });
            particle.applyForceToCenter(new Vec2(MathUtil.random(-100, 100), MathUtil.random(-100, 100)), false);
        }
    }

    container.setAngularVelocity(0.3);

    return world
});