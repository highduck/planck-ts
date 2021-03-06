import {Sweep} from "../common/Sweep";
import {Distance, DistanceInput, DistanceOutput, DistanceProxy, SimplexCache} from "./Distance";
import {Settings} from "../Settings";
import {assert} from "../util/common";
import {Transform} from "../common/Transform";
import {Vec2} from "../common/Vec2";
import {Rot} from "../common/Rot";

// SeparationFunction Type
const enum SeparationFunctionType {
    e_points = 1,
    e_faceA = 2,
    e_faceB = 3
}

class SeparationFunction {
    m_proxyA = new DistanceProxy();
    m_proxyB = new DistanceProxy();
    m_sweepA!: Sweep;// Sweep
    m_sweepB!: Sweep;// Sweep
    indexA: number = 0;// integer
    indexB: number = 0;// integer
    m_type = SeparationFunctionType.e_faceA;
    m_localPoint = Vec2.zero();
    m_axis = Vec2.zero();

// TODO_ERIN might not need to return the separation

    /**
     * @param {SimplexCache} cache
     * @param {DistanceProxy} proxyA
     * @param {Sweep} sweepA
     * @param {DistanceProxy} proxyB
     * @param {Sweep} sweepB
     * @param {float} t1
     */
    initialize(cache: SimplexCache,
               proxyA: DistanceProxy, sweepA: Sweep,
               proxyB: DistanceProxy, sweepB: Sweep,
               t1: number) {
        this.m_proxyA = proxyA;
        this.m_proxyB = proxyB;
        const count = cache.count;
        PLANCK_ASSERT && assert(0 < count && count < 3);

        this.m_sweepA = sweepA;
        this.m_sweepB = sweepB;

        const xfA = Transform.identity();
        const xfB = Transform.identity();
        this.m_sweepA.getTransform(xfA, t1);
        this.m_sweepB.getTransform(xfB, t1);

        if (count === 1) {
            this.m_type = SeparationFunctionType.e_points;
            const localPointA = this.m_proxyA.getVertex(cache.indexA[0]);
            const localPointB = this.m_proxyB.getVertex(cache.indexB[0]);
            const pointA = Transform.mulVec2(xfA, localPointA);
            const pointB = Transform.mulVec2(xfB, localPointB);
            this.m_axis.setCombine(1, pointB, -1, pointA);
            const s = this.m_axis.normalize();
            return s;

        } else if (cache.indexA[0] === cache.indexA[1]) {
            // Two points on B and one on A.
            this.m_type = SeparationFunctionType.e_faceB;
            const localPointB1 = proxyB.getVertex(cache.indexB[0]);
            const localPointB2 = proxyB.getVertex(cache.indexB[1]);

            Vec2._crossVS(Vec2.sub(localPointB2, localPointB1), 1.0, this.m_axis);
            this.m_axis.normalize();
            const normal = Rot.mulVec2(xfB, this.m_axis);

            this.m_localPoint = Vec2.mid(localPointB1, localPointB2);
            const pointB = Transform.mulVec2(xfB, this.m_localPoint);

            const localPointA = proxyA.getVertex(cache.indexA[0]);
            const pointA = Transform.mulVec2(xfA, localPointA);

            let s = Vec2.dot(pointA, normal) - Vec2.dot(pointB, normal);
            if (s < 0.0) {
                this.m_axis.neg();
                s = -s;
            }
            return s;

        } else {
            // Two points on A and one or two points on B.
            this.m_type = SeparationFunctionType.e_faceA;
            const localPointA1 = this.m_proxyA.getVertex(cache.indexA[0]);
            const localPointA2 = this.m_proxyA.getVertex(cache.indexA[1]);

            Vec2._sub(localPointA2, localPointA1, this.m_axis);
            Vec2._crossVS(this.m_axis, 1.0, this.m_axis);
            this.m_axis.normalize();
            const normal = Rot.mulVec2(xfA, this.m_axis);

            Vec2._mid(localPointA1, localPointA2, this.m_localPoint);
            const pointA = Transform.mulVec2(xfA, this.m_localPoint);

            const localPointB = this.m_proxyB.getVertex(cache.indexB[0]);
            const pointB = Transform.mulVec2(xfB, localPointB);

            let s = Vec2.dot(pointB, normal) - Vec2.dot(pointA, normal);
            if (s < 0.0) {
                this.m_axis.neg();
                s = -s;
            }
            return s;
        }
    }

    compute(find: boolean, t: number): number {
        // It was findMinSeparation and evaluate
        const xfA = Transform.identity();
        const xfB = Transform.identity();
        this.m_sweepA.getTransform(xfA, t);
        this.m_sweepB.getTransform(xfB, t);

        const type = this.m_type;
        if (type === SeparationFunctionType.e_points) {
            if (find) {
                // const axisA = Rot.mulTVec2(xfA, this.m_axis);
                // const axisB = Rot.mulTVec2(xfB, Vec2.neg(this.m_axis));

                // INLINE:
                // Rot.mulTVec2(xfA, this.m_axis) =>
                // x: xfA.c * this.m_axis.x + xfA.s * this.m_axis.y
                // y: -xfA.s * this.m_axis.x + xfA.c * this.m_axis.y

                // Rot.mulTVec2(xfB, Vec2.neg(this.m_axis)) =>
                // x: -xfB.c * this.m_axis.x - xfB.s * this.m_axis.y
                // y: xfB.s * this.m_axis.x - xfB.c * this.m_axis.y

                // this.indexA = this.m_proxyA.getSupport(axisA);
                // this.indexB = this.m_proxyB.getSupport(axisB);
                this.indexA = this.m_proxyA.getSupport(
                    xfA.c * this.m_axis.x + xfA.s * this.m_axis.y,
                    -xfA.s * this.m_axis.x + xfA.c * this.m_axis.y
                );
                this.indexB = this.m_proxyB.getSupport(
                    -xfB.c * this.m_axis.x - xfB.s * this.m_axis.y,
                    xfB.s * this.m_axis.x - xfB.c * this.m_axis.y
                );
            }

            const localPointA = this.m_proxyA.getVertex(this.indexA);
            const localPointB = this.m_proxyB.getVertex(this.indexB);

            const pointA = Transform.mulVec2(xfA, localPointA);
            const pointB = Transform.mulVec2(xfB, localPointB);

            const sep = Vec2.dot(pointB, this.m_axis) - Vec2.dot(pointA, this.m_axis);
            return sep;
        } else if (type === SeparationFunctionType.e_faceA) {
            const normal = Rot.mulVec2(xfA, this.m_axis);
            const pointA = Transform.mulVec2(xfA, this.m_localPoint);

            if (find) {
                // const axisB = Rot.mulTVec2(xfB, Vec2.neg(normal));
                // INLINE:
                // Rot.mulTVec2(xfB, Vec2.neg(normal)) =>
                // new Vec2(-xfB.c * normal.x - xfB.s * normal.y, xfB.s * normal.x - xfB.c * normal.y);

                this.indexA = -1;
                this.indexB = this.m_proxyB.getSupport(
                    -xfB.c * normal.x - xfB.s * normal.y,
                    xfB.s * normal.x - xfB.c * normal.y
                );
            }

            const localPointB = this.m_proxyB.getVertex(this.indexB);
            const pointB = Transform.mulVec2(xfB, localPointB);

            const sep = Vec2.dot(pointB, normal) - Vec2.dot(pointA, normal);
            return sep;
        } else if (type === SeparationFunctionType.e_faceB) {
            const normal = Rot.mulVec2(xfB, this.m_axis);
            const pointB = Transform.mulVec2(xfB, this.m_localPoint);

            if (find) {
                // const axisA = Rot.mulTVec2(xfA, Vec2.neg(normal));
                // INLINE:
                // Rot.mulTVec2(xfA, Vec2.neg(normal)) =>
                // new Vec2(-xfA.c * normal.x - xfA.s * normal.y, xfA.s * normal.x - xfA.c * normal.y);

                this.indexB = -1;
                // this.indexA = this.m_proxyA.getSupport(axisA);
                this.indexA = this.m_proxyA.getSupport(
                    -xfA.c * normal.x - xfA.s * normal.y,
                    xfA.s * normal.x - xfA.c * normal.y
                );
            }

            const localPointA = this.m_proxyA.getVertex(this.indexA);
            const pointA = Transform.mulVec2(xfA, localPointA);

            const sep = Vec2.dot(pointA, normal) - Vec2.dot(pointB, normal);
            return sep;
        } else {
            PLANCK_ASSERT && assert(false);
            if (find) {
                this.indexA = -1;
                this.indexB = -1;
            }
            return 0.0;
        }
    }

    findMinSeparation(t: number) {
        return this.compute(true, t);
    }

    evaluate(t: number) {
        return this.compute(false, t);
    }
}

// reuse
//const s_distanceInput = new DistanceInput();
const s_distanceOutput = new DistanceOutput();
const s_simplexCache = new SimplexCache();
const s_axisSeparationFunction = new SeparationFunction();

export const TOIStats = {
    time: 0,
    maxTime: 0,
    calls: 0,
    iters: 0,
    maxIters: 0,
    rootIters: 0,
    maxRootIters: 0
};

/**
 * Input parameters for TimeOfImpact.
 *
 * @prop {DistanceProxy} proxyA
 * @prop {DistanceProxy} proxyB
 * @prop {Sweep} sweepA
 * @prop {Sweep} sweepB
 * @prop tMax defines sweep interval [0, tMax]
 */
export class TOIInput {
    proxyA = new DistanceProxy();
    proxyB = new DistanceProxy();
    sweepA = new Sweep();
    sweepB = new Sweep();
    tMax = 0;
}

// TOIOutput State
export const enum TOIOutputState {
    e_unknown = 0,
    e_failed = 1,
    e_overlapped = 2,
    e_touching = 3,
    e_separated = 4
}

/**
 * Output parameters for TimeOfImpact.
 *
 * @prop state
 * @prop t
 */
export class TOIOutput {
    state = TOIOutputState.e_unknown;
    t = 0;
}

/**
 * Compute the upper bound on time before two shapes penetrate. Time is
 * represented as a fraction between [0,tMax]. This uses a swept separating axis
 * and may miss some intermediate, non-tunneling collision. If you change the
 * time interval, you should call this function again.
 *
 * Note: use Distance to compute the contact point and normal at the time of
 * impact.
 *
 * CCD via the local separating axis method. This seeks progression by computing
 * the largest time at which separation is maintained.
 */
export function timeOfImpact(output: TOIOutput, input: TOIInput) {
    const timer = Date.now();

    ++TOIStats.calls;

    output.state = TOIOutputState.e_unknown;
    output.t = input.tMax;

    const proxyA = input.proxyA; // DistanceProxy
    const proxyB = input.proxyB; // DistanceProxy

    const sweepA = input.sweepA; // Sweep
    const sweepB = input.sweepB; // Sweep

    // Large rotations can make the root finder fail, so we normalize the
    // sweep angles.
    sweepA.normalize();
    sweepB.normalize();

    const tMax = input.tMax;

    const totalRadius = proxyA.m_radius + proxyB.m_radius;
    const target = Math.max(Settings.linearSlop, totalRadius - 3.0 * Settings.linearSlop);
    const tolerance = 0.25 * Settings.linearSlop;
    PLANCK_ASSERT && assert(target > tolerance);

    let t1 = 0.0;
    const k_maxIterations = Settings.maxTOIIterations;
    let iter = 0;

    // Prepare input for distance query.

    // const cache = new SimplexCache();
    const cache = s_simplexCache;
    cache.count = 0;

    // TODO: optimize
    // const distanceInput = s_distanceInput;
    const distanceInput = new DistanceInput();
    distanceInput.proxyA = input.proxyA;
    distanceInput.proxyB = input.proxyB;
    distanceInput.useRadii = false;

    const xfA = Transform.identity();
    const xfB = Transform.identity();

    // The outer loop progressively attempts to compute new separating axes.
    // This loop terminates when an axis is repeated (no progress is made).
    for (; ;) {
        sweepA.getTransform(xfA, t1);
        sweepB.getTransform(xfB, t1);

        // Get the distance between shapes. We can also use the results
        // to get a separating axis.
        distanceInput.transformA = xfA;
        distanceInput.transformB = xfB;

        // TODO: optimize
        const distanceOutput = s_distanceOutput;
        // const distanceOutput = new DistanceOutput();
        Distance(distanceOutput, cache, distanceInput);

        // If the shapes are overlapped, we give up on continuous collision.
        if (distanceOutput.distance <= 0.0) {
            // Failure!
            output.state = TOIOutputState.e_overlapped;
            output.t = 0.0;
            break;
        }

        if (distanceOutput.distance < target + tolerance) {
            // Victory!
            output.state = TOIOutputState.e_touching;
            output.t = t1;
            break;
        }

        // Initialize the separating axis.
        // const fcn = new SeparationFunction();
        const fcn = s_axisSeparationFunction;
        fcn.initialize(cache, proxyA, sweepA, proxyB, sweepB, t1);

        // if (false) {
        //   // Dump the curve seen by the root finder
        //   var N = 100;
        //   var dx = 1.0 / N;
        //   var xs = []; // [ N + 1 ];
        //   var fs = []; // [ N + 1 ];
        //   var x = 0.0;
        //   for (var i = 0; i <= N; ++i) {
        //     sweepA.getTransform(xfA, x);
        //     sweepB.getTransform(xfB, x);
        //     var f = fcn.evaluate(xfA, xfB) - target;
        //     printf("%g %g\n", x, f);
        //     xs[i] = x;
        //     fs[i] = f;
        //     x += dx;
        //   }
        // }

        // Compute the TOI on the separating axis. We do this by successively
        // resolving the deepest point. This loop is bounded by the number of
        // vertices.
        let done = false;
        let t2 = tMax;
        let pushBackIter = 0;
        for (; ;) {
            // Find the deepest point at t2. Store the witness point indices.
            let s2 = fcn.findMinSeparation(t2);
            let indexA = fcn.indexA;
            let indexB = fcn.indexB;

            // Is the final configuration separated?
            if (s2 > target + tolerance) {
                // Victory!
                output.state = TOIOutputState.e_separated;
                output.t = tMax;
                done = true;
                break;
            }

            // Has the separation reached tolerance?
            if (s2 > target - tolerance) {
                // Advance the sweeps
                t1 = t2;
                break;
            }

            // Compute the initial separation of the witness points.
            let s1 = fcn.evaluate(t1);
            indexA = fcn.indexA;
            indexB = fcn.indexB;

            // Check for initial overlap. This might happen if the root finder
            // runs out of iterations.
            if (s1 < target - tolerance) {
                output.state = TOIOutputState.e_failed;
                output.t = t1;
                done = true;
                break;
            }

            // Check for touching
            if (s1 <= target + tolerance) {
                // Victory! t1 should hold the TOI (could be 0.0).
                output.state = TOIOutputState.e_touching;
                output.t = t1;
                done = true;
                break;
            }

            // Compute 1D root of: f(x) - target = 0
            let rootIterCount = 0;
            let a1 = t1;
            let a2 = t2;
            for (; ;) {
                // Use a mix of the secant rule and bisection.
                let t;
                if (rootIterCount & 1) {
                    // Secant rule to improve convergence.
                    t = a1 + (target - s1) * (a2 - a1) / (s2 - s1);
                } else {
                    // Bisection to guarantee progress.
                    t = 0.5 * (a1 + a2);
                }

                ++rootIterCount;
                ++TOIStats.rootIters;

                const s = fcn.evaluate(t);
                indexA = fcn.indexA;
                indexB = fcn.indexB;

                if (Math.abs(s - target) < tolerance) {
                    // t2 holds a tentative value for t1
                    t2 = t;
                    break;
                }

                // Ensure we continue to bracket the root.
                if (s > target) {
                    a1 = t;
                    s1 = s;
                } else {
                    a2 = t;
                    s2 = s;
                }

                if (rootIterCount == 50) {
                    break;
                }
            }

            TOIStats.maxRootIters = Math.max(TOIStats.maxRootIters, rootIterCount);

            ++pushBackIter;

            if (pushBackIter == Settings.maxPolygonVertices) {
                break;
            }
        }

        ++iter;
        ++TOIStats.iters;

        if (done) {
            break;
        }

        if (iter == k_maxIterations) {
            // Root finder got stuck. Semi-victory.
            output.state = TOIOutputState.e_failed;
            output.t = t1;
            break;
        }
    }

    TOIStats.maxIters = Math.max(TOIStats.maxIters, iter);

    const time = Date.now() - timer;
    TOIStats.maxTime = Math.max(TOIStats.maxTime, time);
    TOIStats.time += time;
}