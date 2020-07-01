/// <reference path="../global.d.ts" />
import {ShapeType} from "../Shape";
import {expect} from "chai";

import {World} from "../World";
import {BodyType} from "../Body";
import {CircleShape} from "../shape/CircleShape";
import {Vec2} from '../common/Vec2';
import '../shape/CollideCircle';

(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;

describe('Basic', () => {

    it('World', () => {

        const world = new World();

        const circle = new CircleShape(0, 0, 1);

        const b1 = world.createBody({
            position: new Vec2(0, 0),
            type: BodyType.DYNAMIC
        });

        b1.createFixture(circle, {});

        expect(b1.getFixtureList()!.getType()).equal(ShapeType.CIRCLE);
        expect(b1.getWorld()).equal(world);
        expect(world.getBodyList()).equal(b1);

        b1.applyForceToCenter(new Vec2(1, 0), true);

        const b2 = world.createBody({
            position: new Vec2(2, 0),
            type: BodyType.DYNAMIC
        });
        b2.createFixture(circle, {});
        b2.applyForceToCenter(new Vec2(-1, 0), true);

        world.step(1 / 20);

        // console.log(b2.getPosition());

        const p = b1.getPosition();
        expect(p.x).closeTo(0.0, 1e-12);
        expect(p.y).closeTo(0.0, 1e-12);
    });

});
