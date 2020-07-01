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


testbed('SphereStack', function(testbed) {

  var world = new World({gravity: new Vec2(0, -10)});

  var COUNT = 10;
  var bodies = [];

  var ground = world.createBody();
  ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), 0.0);

  var circle = new CircleShape(0, 0, 1);

  for (let i = 0; i < COUNT; ++i) {
    bodies[i] = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 4.0 + 3.0 * i)});
    bodies[i].createFixture(circle, 1.0);
    bodies[i].setLinearVelocity(new Vec2(0.0, -50.0));
  }

  return world;
});
