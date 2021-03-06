import {PolygonShape} from "./PolygonShape";
import {ShapeType} from "../Shape";
import {Vec2} from "../common/Vec2";

/**
 * A rectangle polygon which extend PolygonShape.
 */
export class BoxShape extends PolygonShape {
    static TYPE = ShapeType.POLYGON;

    constructor(hx: number, hy: number, center?: Vec2, angle: number = 0) {
        super();
        this._setAsBox(hx, hy, center, angle);
    }
}
