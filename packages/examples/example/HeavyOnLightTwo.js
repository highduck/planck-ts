import {Body, CircleShape, EdgeShape, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('HeavyOnLightTwo', function (testbed) {
    const world = new World({gravity: new Vec2(0, -10)});

    world.createBody().createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(0.0, 2.5)
    }).createFixture(new CircleShape(0, 0, 0.5), {density: 10.0});

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(0.0, 3.5)
    }).createFixture(new CircleShape(0, 0, 0.5), {density: 10.0});

    var heavy = null;

    function toggleHeavy() {
        if (heavy) {
            world.destroyBody(heavy);
            heavy = null;
        } else {
            heavy = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 9.0)});
            heavy.createFixture(new CircleShape(0, 0, 5.0), {density: 10.0});
        }
    }

    testbed.keydown = function (code, char) {
        switch (char) {
            case 'X':
                toggleHeavy();
                break;
        }
    };


    testbed.info('X: Add/Remove heavy circle');

    return world;
});
