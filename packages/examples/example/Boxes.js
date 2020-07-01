import {BoxShape, EdgeShape, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Boxes', function (_) {

    const world = new World({gravity: new Vec2(0, -10)});

    const bar = world.createBody();
    bar.createFixture(new EdgeShape(new Vec2(-20, 5), new Vec2(20, 5)));
    bar.setAngle(0.2);

    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            const box = world.createBody().setDynamic();
            box.createFixture(new BoxShape(0.5, 0.5, Vec2.ZERO, 0));
            box.setPosition(new Vec2(i * 1, -j * 1 + 20));
            box.setMassData({
                mass: 1,
                center: Vec2.zero(),
                I: 1
            });
        }
    }

    return world;
});