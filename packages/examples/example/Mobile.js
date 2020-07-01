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

testbed('Mobile', function(testbed) {

  var world = new World({gravity: new Vec2(0, -1)});

  testbed.y = -15;
  testbed.width = 20;
  testbed.height = 20;
  testbed.ratio = 40;

  var DEPTH = 4;
  var DENSITY = 20.0;

  var ground = world.createBody(new Vec2(0.0, 20.0));

  var a = 0.5;
  var h = new Vec2(0.0, a);

  var root = addNode(ground, new Vec2.zero(), 0, 3.0, a);

  world.createJoint(new RevoluteJoint({
    bodyA: ground,
    bodyB: root,
    localAnchorA: Vec2.zero(),
    localAnchorB: h,
  }, ground, root));

  function addNode(parent, localAnchor, depth, offset, a) {

    var h = new Vec2(0.0, a);

    var parent = world.createBody({
      type: Body.DYNAMIC,
      position : Vec2.add(parent.getPosition(), localAnchor).sub(h)
    });

    parent.createFixture(new BoxShape(0.25 * a, a), DENSITY);

    if (depth === DEPTH) {
      return parent;
    }

    var left = new Vec2(offset, -a);
    var right = new Vec2(-offset, -a);
    var leftChild = addNode(parent, left, depth + 1, 0.5 * offset, a);
    var rightChild = addNode(parent, right, depth + 1, 0.5 * offset, a);

    world.createJoint(new RevoluteJoint({
      bodyA: parent,
      bodyB: leftChild,
      localAnchorA: left,
      localAnchorB: h,
    }, parent, leftChild));

    world.createJoint(new RevoluteJoint({
      bodyA: parent,
      bodyB: rightChild,
      localAnchorA: right,
      localAnchorB: h,
    }, parent, rightChild));

    return parent;
  }

  return world;
});
