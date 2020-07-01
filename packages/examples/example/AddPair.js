import {Body, BoxShape, CircleShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";
import {MathUtil} from "planck-ts";

testbed('AddPair', function (testbed) {
    const world = new World();

    testbed.y = 0;
    testbed.hz = 60;
    testbed.speed = 0.5;

    const circle = new CircleShape(0, 0, 0.1);

    for (let i = 0; i < 50; ++i) {
        const pos = new Vec2(MathUtil.random(0.0, -6.0), MathUtil.random(-1.0, 1.0));
        world.createBody({position: pos, type: Body.DYNAMIC}).createFixture(circle, {density: 0.01});
    }

    const box = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(-40.0, 0.0),
        bullet: true
    });

    box.createFixture(new BoxShape(1.5, 1.5, Vec2.ZERO, 0), {density: 1.0});
    box.setLinearVelocity(new Vec2(100.0, 0.0));

    return world;
});
