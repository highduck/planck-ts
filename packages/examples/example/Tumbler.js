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

testbed('Tumbler', function(testbed) {

  var world = new World({gravity: new Vec2(0, -10)});

  testbed.hz = 40;

  var COUNT = 150;

  var ground = world.createBody();

  var container = world.createBody({type:Body.DYNAMIC,
    allowSleep: false,
    position: new Vec2(0, 10)
  });

  container.createFixture(new BoxShape(0.5, 10, new Vec2(10, 0), 0), 5);
  container.createFixture(new BoxShape(0.5, 10, new Vec2(-10, 0), 0), 5);
  container.createFixture(new BoxShape(10, 0.5, new Vec2(0, 10), 0), 5);
  container.createFixture(new BoxShape(10, 0.5, new Vec2(0, -10), 0), 5);

  world.createJoint(new RevoluteJoint({
    motorSpeed: 0.08 * Math.PI,
    maxMotorTorque: 1e8,
    enableMotor: true,
  }, ground, container, new Vec2(0, 10)));

  var shape = new BoxShape(0.125, 0.125);
  var count = 0;
  while (count < COUNT) {
    var body = world.createBody({type:Body.DYNAMIC});
    body.setPosition(new Vec2(MathUtil.random(-2, 2), 10 + MathUtil.random(-2, 2)));
    body.createFixture(shape, 1);
    ++count;
  }

  return world;
});
