import {
    FrictionJoint,
    Body,
    BoxShape,
    CircleShape,
    EdgeShape,
    Vec2,
    World,
    Transform,
    PolygonShape
} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('PolyCollision', function(testbed) {
  var pl = planck, Vec2 = pl.Vec2, Transform = pl.Transform;
  var world = new World({gravity: new Vec2(0, -10)});

  var polygonA = new BoxShape(2, 4);
  var transformA = pl.Transform(new Vec2(0.0, 0.0), 0.0);

  var polygonB = new BoxShape(5, 5);
  var positionB = new Vec2(5, 4);
  var angleB = 1.9160721;
  var transformB = pl.Transform(positionB, angleB);

  testbed.step = function() {
      const manifold = new pl.internal.Manifold();
    pl.internal.CollidePolygons(manifold, polygonA, transformA, polygonB, transformB);

      const worldManifold = manifold.getWorldManifold(null, transformA, polygonA.getRadius(), transformB, polygonB.getRadius());

    testbed.status('point count', manifold.pointCount);

    const vA = polygonA.m_vertices.map((v) => Transform.mulVec2(transformA, v));
    testbed.drawPolygon(vA, testbed.color(0.9, 0.9, 0.9));

      const vB = polygonB.m_vertices.map((v) => Transform.mulVec2(transformB, v));
    testbed.drawPolygon(vB, testbed.color(0.9, 0.9, 0.9));

    for (let i = 0; i < manifold.pointCount; ++i) {
      testbed.drawPoint(worldManifold.points[i], 4.0, testbed.color(0.9, 0.3, 0.3));
    }
  };

  testbed.keydown = function() {
    if (testbed.activeKeys['left']) {
      positionB.x -= 0.2;
    }

    if (testbed.activeKeys['right']) {
      positionB.x += 0.2;
    }

    if (testbed.activeKeys['down']) {
      positionB.y -= 0.2;
    }

    if (testbed.activeKeys['up']) {
      positionB.y += 0.2;
    }

    if (testbed.activeKeys['Z']) {
      angleB += 0.2;
    }

    if (testbed.activeKeys['X']) {
      angleB -= 0.2;
    }

    transformB.set(positionB, angleB);
  };

  testbed.info('Use arrow keys to move and Z or X to rotate.')
  return world;
});
