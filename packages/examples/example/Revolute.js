import {
    FrictionJoint,
    Body,
    BoxShape,
    CircleShape,
    EdgeShape,
    Vec2,
    World,
    Transform,
    PolygonShape, RevoluteJoint
} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Revolute', function(testbed) {

  var world = new World({gravity: new Vec2(0, -10)});

  var ground = world.createBody();

  var groundFD = {
    filterCategoryBits: 2,
    filterMaskBits: 0xFFFF,
    filterGroupIndex: 0,
  };
  ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)), groundFD);

  var rotator = world.createBody({type: Body.DYNAMIC, position: new Vec2(-10.0, 20.0)});
  rotator.createFixture(new CircleShape(0, 0, 0.5), {density:5.0});

  var w = 100.0;
  rotator.setAngularVelocity(w);
  rotator.setLinearVelocity(new Vec2(-8.0 * w, 0.0));

  var joint = world.createJoint(new RevoluteJoint({
    motorSpeed: Math.PI,
    maxMotorTorque: 10000.0,
    enableMotor: true,
    lowerAngle: -0.25 * Math.PI,
    upperAngle: 0.5 * Math.PI,
    enableLimit: false,
    collideConnected: true,
      bodyA: ground,
      bodyB: rotator,
      anchor:  new Vec2(-10.0, 12.0)
  }));

  var ball = world.createBody({type: Body.DYNAMIC, position: new Vec2(5.0, 30.0)});
  ball.createFixture(new CircleShape(0, 0, 3.0), {
    density: 5.0,
    // filterMaskBits: 1,
  });

  var platform = world.createBody({
    position: new Vec2(20.0, 10.0),
    type: Body.DYNAMIC,
    bullet: true,
  });
  platform.createFixture(new BoxShape(10.0, 0.2, new Vec2(-10.0, 0.0), 0.0), {density:2.0});

  world.createJoint(new RevoluteJoint({
    lowerAngle: -0.25 * Math.PI,
    upperAngle: 0,
    enableLimit: true,
      bodyA: ground,
      bodyB:platform,
      anchor:new Vec2(20.0, 10.0)
  }));

  // Tests mass computation of a small object far from the origin
  const triangle = world.createBody({type:Body.DYNAMIC});

  triangle.createFixture(new PolygonShape([
    new Vec2(17.63, 36.31),
    new Vec2(17.52, 36.69),
    new Vec2(17.19, 36.36)
  ]), {density:1}); // assertion hits inside here

  testbed.keydown = function(code, char) {
    switch (char) {
    case 'Z':
      joint.enableLimit(!joint.isLimitEnabled());
      break;

    case 'X':
      joint.enableMotor(!joint.isMotorEnabled());
      break;
    }
  };

  testbed.step = function(settings) {
    // if (stepCount++ == 360) {
    //   ball.setTransform(new Vec2(0.0, 0.5), 0.0);
    // }

    testbed.status('Motor Torque', joint.getMotorTorque(testbed.hz));
    // testbed.status('Motor Force', joint.getMaxForce());
  };

  testbed.info('Z: Limits, X: Motor');

  return world;
});
