/// <reference path="../../global.d.ts" />
import {BoxShape, CircleShape, Vec2} from "../..";
import {expect} from "chai";
import {World} from "../../World";
import {BodyType} from "../../Body";
import {DistanceJoint} from "../DistanceJoint";

(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;

describe('DistanceJoint', function () {

    it('calculates local anchors from global', function () {
        const world = new World({});

        const circle = new CircleShape(0, 0, 1);
        const box = new BoxShape(1, 1, new Vec2(0, 0), 0);

        const bodyA = world.createBody({
            position: new Vec2(0, 0),
            type: BodyType.DYNAMIC
        });
        bodyA.createFixture(circle, {});

        const bodyB = world.createBody({
            position: new Vec2(10, 0),
            type: BodyType.DYNAMIC
        });
        bodyB.createFixture(box, {});

        const joint = new DistanceJoint({
            bodyA, bodyB,
            anchorA: new Vec2(1, 0),
            anchorB: new Vec2(9, -1)
        });
        world.createJoint(joint);

        expect(joint.getLocalAnchorA()).deep.equal(new Vec2(1, 0));
        expect(joint.getLocalAnchorB()).deep.equal(new Vec2(-1, -1));

        expect(joint.getAnchorA()).deep.equal(new Vec2(1, 0));
        expect(joint.getAnchorB()).deep.equal(new Vec2(9, -1));

    });

    it('moves attached body', function () {
        const world = new World({});

        const circle = new CircleShape(0, 0, 1);
        const box = new BoxShape(1, 1, new Vec2(0, 0), 0);

        const bodyA = world.createBody({
            position: new Vec2(0, 0),
            type: BodyType.DYNAMIC
        });
        bodyA.createFixture(circle, {});

        const bodyB = world.createBody({
            position: new Vec2(10, 0),
            type: BodyType.DYNAMIC
        });
        bodyB.createFixture(box, {});

        const joint = new DistanceJoint({
            bodyA, anchorA: new Vec2(1, 0),
            bodyB, anchorB: new Vec2(9, -1)
        });
        world.createJoint(joint);

        bodyB.applyForceToCenter(new Vec2(500, 0), true);
        world.step(1 / 10);

        expect(bodyA.getPosition().x).closeTo(2, 1e-1);
        expect(bodyB.getPosition().x).closeTo(12, 1e-1);
    });

});
