import {AABB, Body, BoxShape, CircleShape, EdgeShape, PolygonShape, Transform, Vec2, World, testOverlap} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('PolyShapes', function (testbed) {

    const world = new World({gravity: new Vec2(0, -10)});

    const MAX_BODIES = 256;

    const bodies = [];

    const shapes = [];

    const ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    shapes[0] = new PolygonShape([
        new Vec2(-0.5, 0.0),
        new Vec2(0.5, 0.0),
        new Vec2(0.0, 1.5)
    ]);

    shapes[1] = new PolygonShape([
        new Vec2(-0.1, 0.0),
        new Vec2(0.1, 0.0),
        new Vec2(0.0, 1.5)
    ]);

    {
        const w = 1.0;
        const b = w / (2.0 + Math.sqrt(2.0));
        const s = Math.sqrt(2.0) * b;

        shapes[2] = new PolygonShape([
            new Vec2(0.5 * s, 0.0),
            new Vec2(0.5 * w, b),
            new Vec2(0.5 * w, b + s),
            new Vec2(0.5 * s, w),
            new Vec2(-0.5 * s, w),
            new Vec2(-0.5 * w, b + s),
            new Vec2(-0.5 * w, b),
            new Vec2(-0.5 * s, 0.0),
        ]);
    }

    shapes[3] = new BoxShape(0.5, 0.5, Vec2.ZERO, 0);

    shapes[4] = new CircleShape(0, 0, 0.5);

    function createBody(index) {
        if (bodies.length > MAX_BODIES) {
            world.destroyBody(bodies.shift());
        }

        const bd = {};
        bd.type = Body.DYNAMIC;

        const x = Math.random() * 0.4 - 2.0;
        bd.position = new Vec2(x, 10.0);
        bd.angle = Math.random() * 2 * Math.PI - Math.PI;

        if (index === 4) {
            bd.angularDamping = 0.02;
        }

        const body = world.createBody(bd);

        body.createFixture(shapes[index % shapes.length], {
            density: 1.0,
            friction: 0.3,
        });

        bodies.push(body);
    }

    function destroyBody() {
        world.destroyBody(bodies.shift());
    }

    testbed.keydown = function (code, char) {
        switch (char) {
            case '1':
                createBody(1);
                break;

            case '2':
                createBody(2);
                break;

            case '3':
                createBody(3);
                break;

            case '4':
                createBody(4);
                break;

            case '5':
                createBody(5);
                break;

            case 'Z':
                for (let i = 0; i < bodies.length; i += 2) {
                    const body = bodies[i];
                    body.setActive(!body.isActive());
                }
                break;

            case 'X':
                destroyBody();
                break;
        }
    };

    testbed.info("1-5: Drop new objects, Z: Activate/deactivate some bodies, X: Destroy an object");

    testbed.step = function () {
        AABBQueryListener.reset();
        const aabb = AABB.zero();
        AABBQueryListener.circle.computeAABB(aabb, AABBQueryListener.transform, 0);

        world.queryAABB(aabb, AABBQueryListener.callback);

        testbed.drawCircle(AABBQueryListener.circle.m_p, AABBQueryListener.circle.m_radius, testbed.color(0.4, 0.7, 0.8));
    };

    function drawFixture(fixture) {
        const color = testbed.color(0.95, 0.95, 0.6);
        const xf = fixture.getBody().getTransform();

        switch (fixture.getType()) {
            case 'circle': {
                const circle = fixture.getShape();

                const center = Transform.mulVec2(xf, circle.getCenter());
                const radius = circle.getRadius();

                testbed.drawCircle(center, radius, color);
            }
                break;

            case 'polygon': {
                const poly = fixture.getShape();
                const vertexCount = poly.m_count;
                // assert(vertexCount <= b2_maxPolygonVertices);
                const vertices = poly.m_vertices.map((v) => Transform.mulVec2(xf, v));
                testbed.drawPolygon(vertices, color);
            }
                break;

            default:
                break;
        }
    }

    // This tests stacking. It also shows how to use World.query and TestOverlap.
    // This callback is called by World.queryAABB. We find all the fixtures
    // that overlap an AABB. Of those, we use TestOverlap to determine which fixtures
    // overlap a circle. Up to 4 overlapped fixtures will be highlighted with a
    // yellow border.
    const AABBQueryListener = (function () {
        const def = {};

        def.circle = new CircleShape(0.0, 1.1, 2.0);
        def.transform = Transform.identity();
        let count = 0;

        const MAX_COUNT = 40;

        def.reset = function () {
            count = 0;
        };
        // Called for each fixture found in the query AABB.
        // return false to terminate the query.
        def.callback = function (fixture) {
            if (count === MAX_COUNT) {
                return false;
            }

            const body = fixture.getBody();
            const shape = fixture.getShape();

            const overlap = testOverlap(shape, 0, def.circle, 0, body.getTransform(), def.transform);

            if (overlap) {
                drawFixture(fixture);
                ++count;
            }

            return true;
        };

        return def;
    })();

    return world;
});
