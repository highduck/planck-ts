import {Vec2} from "./Vec2";
import {Rot} from "./Rot";
import {Transform} from "./Transform";

/**
 * @prop {Vec2} c location
 * @prop {float} a angle
 */
export class Position {
    readonly c = Vec2.zero();
    a = 0.0;

    getTransform(xf: Transform, p: Vec2) {
        Rot.setAngle(xf, this.a);
        Vec2._sub(this.c, Rot.mulVec2(xf, p), xf);
        return xf;
    }
}