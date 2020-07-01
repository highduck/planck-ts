import {Body, BoxShape, CircleShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('EdgeTest', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const ground = world.createBody();

    const v1 = new Vec2(-10.0, 0.0);
    const v2 = new Vec2(-7.0, -2.0);
    const v3 = new Vec2(-4.0, 0.0);
    const v4 = new Vec2(0.0, 0.0);
    const v5 = new Vec2(4.0, 0.0);
    const v6 = new Vec2(7.0, 2.0);
    const v7 = new Vec2(10.0, 0.0);

    const shape1 = new EdgeShape(v1, v2);
    shape1.setNext(v3);
    ground.createFixture(shape1);

    const shape2 = new EdgeShape(v2, v3);
    shape2.setPrev(v1);
    shape2.setNext(v4);
    ground.createFixture(shape2);

    const shape3 = new EdgeShape(v3, v4);
    shape3.setPrev(v2);
    shape3.setNext(v5);
    ground.createFixture(shape3);

    const shape4 = new EdgeShape(v4, v5);
    shape4.setPrev(v3);
    shape4.setNext(v6);
    ground.createFixture(shape4);

    const shape5 = new EdgeShape(v5, v6);
    shape5.setPrev(v4);
    shape5.setNext(v7);
    ground.createFixture(shape5);

    const shape6 = new EdgeShape(v6, v7);
    shape6.setPrev(v5);
    ground.createFixture(shape6);

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(-0.5, 0.6),
        allowSleep: false
    }).createFixture(new CircleShape(0, 0, 0.5), {density: 1});

    world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(1.0, 0.6),
        allowSleep: false
    }).createFixture(new BoxShape(0.5, 0.5, Vec2.ZERO, 0), {density: 1});

    return world;
});
