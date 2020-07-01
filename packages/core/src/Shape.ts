import {DistanceProxy} from "./collision/Distance";
import {MassData} from "./MassData";
import {Transform} from "./common/Transform";
import {Vec2} from "./common/Vec2";
import {RayCastInput, RayCastOutput} from "./collision/RayCastOptions";
import {AABB} from "./collision/AABB";

export const enum ShapeType {
    CIRCLE = 1,
    POLYGON = 2,
    EDGE = 3,
    CHAIN = 4
}

export class Shape {

    static CIRCLE = ShapeType.CIRCLE;
    static POLYGON = ShapeType.POLYGON;
    static EDGE = ShapeType.EDGE;
    static CHAIN = ShapeType.CHAIN;

    m_type: ShapeType;
    m_radius: number = 0;

    constructor(type: ShapeType, radius: number) {
        this.m_type = type;
        this.m_radius = radius;
    }

    _reset() {
    }

    // _serialize() {
    //     return {};
    // }

    static TYPES = new Map<ShapeType, object>();

    // static register(typeA: ShapeType, typeB: ShapeType, fn: object) {
    //     Shape.TYPES.set((typeA << 4) | typeB, fn);
    //     Shape.TYPES.set((typeB << 4) | typeA, fn);
    // }
    //
    // static resolve(typeA: ShapeType, typeB: ShapeType): object {
    //     return Shape.TYPES.get((typeA << 4) | typeB)!;
    // }

    // static _deserialize(data, context, restore) {
    //     const clazz = Shape.TYPES[data.type];
    //     return clazz && restore(clazz, data);
    // };

    static isValid(shape: any) {
        return !!shape;
    }

    getRadius() {
        return this.m_radius;
    }

    /**
     * Get the type of this shape. You can use this to down cast to the concrete
     * shape.
     *
     * @return the shape type.
     */
    getType() {
        return this.m_type;
    }

    /**
     * @deprecated Shapes should be treated as immutable.
     *
     * clone the concrete shape.
     */
    _clone() {
    }

    /**
     * Get the number of child primitives.
     */
    getChildCount() {
        return 0;
    }

    /**
     * Test a point for containment in this shape. This only works for convex
     * shapes.
     *
     * @param {Transform} xf The shape world transform.
     * @param p A point in world coordinates.
     */
    testPoint(xf: Transform, p: Vec2) {
    }

    /**
     * Cast a ray against a child shape.
     *
     * @param {RayCastOutput} output The ray-cast results.
     * @param {RayCastInput} input The ray-cast input parameters.
     * @param {Transform} xf The transform to be applied to the shape.
     * @param childIndex The child shape index
     */
    rayCast(output: RayCastOutput, input: RayCastInput, xf: Transform, childIndex: number): boolean {
        return false;
    }

    /**
     * Given a transform, compute the associated axis aligned bounding box for a
     * child shape.
     *
     * @param {AABB} aabb Returns the axis aligned box.
     * @param {Transform} xf The world transform of the shape.
     * @param childIndex The child shape
     */
    computeAABB(aabb: AABB, xf: Transform, childIndex: number) {
    }

    /**
     * Compute the mass properties of this shape using its dimensions and density.
     * The inertia tensor is computed about the local origin.
     *
     * @param {MassData} massData Returns the mass data for this shape.
     * @param density The density in kilograms per meter squared.
     */
    computeMass(massData: MassData, density: number) {
    }

    /**
     * @param {DistanceProxy} proxy
     */
    computeDistanceProxy(proxy: DistanceProxy, childIndex: number) {
    }

}