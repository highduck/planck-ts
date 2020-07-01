import {Body, BoxShape, CircleShape, EdgeShape, PolygonShape, PrismaticJoint, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('CollisionFiltering', function (testbed) {
    // This is a test of collision filtering.
    // There is a triangle, a box, and a circle.
    // There are 6 shapes. 3 large and 3 small.
    // The 3 small ones always collide.
    // The 3 large ones never collide.
    // The boxes don't collide with triangles (except if both are small).
    const SMALL_GROUP = 1;
    const LARGE_GROUP = -1;

    const TRIANGLE_CATEGORY = 0x0002;
    const BOX_Category = 0x0004;
    const CIRCLE_CATEGORY = 0x0008;

    const TRIANGLE_MASK = 0xFFFF;
    const BOX_MASK = 0xFFFF ^ TRIANGLE_CATEGORY;
    const CIRCLE_MAX = 0xFFFF;

    const world = new World({gravity: new Vec2(0, -10)});

    // Ground body
    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), {friction: 0.3});

    const triangleShapeDef = {};
    triangleShapeDef.density = 1.0;

    // Small triangle
    triangleShapeDef.filterGroupIndex = SMALL_GROUP;
    triangleShapeDef.filterCategoryBits = TRIANGLE_CATEGORY;
    triangleShapeDef.filterMaskBits = TRIANGLE_MASK;

    const body1 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(-5.0, 2.0)
    });
    body1.createFixture(new PolygonShape([
        new Vec2(-1.0, 0.0),
        new Vec2(1.0, 0.0),
        new Vec2(0.0, 2.0)
    ]), triangleShapeDef);

    // Large triangle (recycle definitions)
    triangleShapeDef.filterGroupIndex = LARGE_GROUP;

    const body2 = world.createBody({
        type: Body.DYNAMIC,
        position: new Vec2(-5.0, 6.0),
        fixedRotation: true // look at me!
    });
    body2.createFixture(new PolygonShape([
        new Vec2(-2.0, 0.0),
        new Vec2(2.0, 0.0),
        new Vec2(0.0, 4.0)
    ]), triangleShapeDef);

    const body = world.createBody({type: Body.DYNAMIC, position: new Vec2(-5.0, 10.0)});
    body.createFixture(new BoxShape(0.5, 1.0, Vec2.ZERO, 0), {density: 1.0});

    world.createJoint(new PrismaticJoint({
        enableLimit: true,
        localAnchorA: new Vec2(0.0, 4.0),
        localAnchorB: Vec2.zero(),
        localAxisA: new Vec2(0.0, 1.0),
        lowerTranslation: -1.0,
        upperTranslation: 1.0,
        bodyA: body2,
        bodyB: body
    }));

    const boxShapeDef = {
        density: 1.0,
        restitution: 0.1,
        // Small box
        filterGroupIndex: SMALL_GROUP,
        filterCategoryBits: BOX_Category,
        filterMaskBits: BOX_MASK,
    };

    const body3 = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 2.0)});
    body3.createFixture(new BoxShape(1.0, 0.5, Vec2.ZERO, 0), boxShapeDef);

    // Large box (recycle definitions)
    boxShapeDef.filterGroupIndex = LARGE_GROUP;

    const body4 = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 6.0)});
    body4.createFixture(new BoxShape(2.0, 1.0, Vec2.ZERO, 0), boxShapeDef);

    const circleShapeDef = {
        // Small circle
        density: 1.0,
        filterGroupIndex: SMALL_GROUP,
        filterCategoryBits: CIRCLE_CATEGORY,
        filterMaskBits: CIRCLE_MAX,
    };

    const body5 = world.createBody({type: Body.DYNAMIC, position: new Vec2(5.0, 2.0)});
    body5.createFixture(new CircleShape(0, 0, 1), circleShapeDef);

    // Large circle
    circleShapeDef.filterGroupIndex = LARGE_GROUP;

    const body6 = world.createBody({type: Body.DYNAMIC, position: new Vec2(5.0, 6.0)});
    body6.createFixture(new CircleShape(0, 0, 2.0), circleShapeDef);

    return world;
});
