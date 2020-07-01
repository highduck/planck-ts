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
} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('VerticalStack', function(testbed) {
  var world = new World({
    gravity: new Vec2(0, -10),
    blockSolve: true,
  });

  var columnCount = 2;
  var rowCount = 15;

  var bullet;
  var bodies = [];
  var indices = [];

  var ground = world.createBody();
  ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));
  ground.createFixture(new EdgeShape(new Vec2(20.0, 0.0), new Vec2(20.0, 20.0)));

  var xs = [ 0.0, -10.0, -5.0, 5.0, 10.0 ];

  var shape = new BoxShape(0.5, 0.5, Vec2.ZERO, 0);

  for (let j = 0; j < columnCount; ++j) {
    for (let i = 0; i < rowCount; ++i) {
      var n = j * rowCount + i;
      indices[n] = n;
      var x = 0.0;
      // var x = MathUtil.random(-0.02, 0.02);
      // var x = i % 2 == 0 ? -0.01 : 0.01;

      var body = world.createBody({type:Body.DYNAMIC});
      body.setUserData(indices[n]);
      body.setPosition(new Vec2(xs[j] + x, 0.55 + 1.1 * i));
      body.createFixture(shape, {
        density : 1.0,
        friction : 0.3
      });

      bodies[n] = body;
    }
  }

  testbed.keydown = function(code, char) {
    switch (char) {
    case 'X':
      if (bullet != null) {
        world.destroyBody(bullet);
        bullet = null;
      }

      bullet = world.createBody({
        type: Body.DYNAMIC,
        bullet: true,
        position: new Vec2(-31.0, 5.0),
      });

      bullet.createFixture({
        shape: new CircleShape(0, 0, 0.25),
        density: 20.0,
        restitution: 0.05,
      });

      bullet.setLinearVelocity(new Vec2(400.0, 0.0));
      break;

    case 'Z':
      world.m_blockSolve = !world.m_blockSolve;
      break;
    }
  };

  testbed.info("X: Launch a bullet");

  testbed.step = function() {
    testbed.status("Blocksolve", world.m_blockSolve);

    // if (stepCount++ == 300) {
    // if (bullet != null)
    // {
    // world.destroyBody(bullet);
    // bullet = null;
    // }

    // {
    // var shape = new CircleShape(0, 0, 0.25);

    // var fd = {};
    // fd.shape = shape;
    // fd.density = 20.0;
    // fd.restitution = 0.05;

    // var bd = {};
    // bd.type = Body.DYNAMIC;
    // bd.bullet = true;
    // bd.position.set(-31.0, 5.0);

    // bullet = world.createBody(bd);
    // bullet.createFixture(fd);

    // bullet.setLinearVelocity(new Vec2(400.0, 0.0));
    // }
    // }
  };

  return world;
});
