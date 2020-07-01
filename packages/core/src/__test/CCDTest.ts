/// <reference path="../global.d.ts" />
(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;

import {expect} from "chai";
import {CircleShape} from "..";
import {Distance, DistanceInput, DistanceOutput, SimplexCache} from "../collision/Distance";
import {Transform} from "../common/Transform";
import {timeOfImpact, TOIInput, TOIOutput} from "../collision/TimeOfImpact";
import {Sweep} from "../common/Sweep";

describe('CCD', function () {

    it('Distance', function () {
        const c1 = new CircleShape(0, 0, 1);

        let input = new DistanceInput();
        c1.computeDistanceProxy(input.proxyA, 0);
        c1.computeDistanceProxy(input.proxyB, 0);
        input.transformA = Transform.create(0, 0, 0);
        input.transformB = Transform.create(1.9, 0, 0);
        input.useRadii = true;
        let cache = new SimplexCache();
        let output = new DistanceOutput();
        Distance(output, cache, input);

        expect(output.distance).equal(0);
        console.log(output);

        input = new DistanceInput();
        c1.computeDistanceProxy(input.proxyA, 0);
        c1.computeDistanceProxy(input.proxyB, 0);
        input.transformA = Transform.create(0, 0, 0);
        input.transformB = Transform.create(2.1, 0, 0);
        input.useRadii = true;
        cache = new SimplexCache();
        output = new DistanceOutput();
        Distance(output, cache, input);

        expect(output.distance).closeTo(0.1, 1e-12)
        console.log(output);
    });

    it('TimeOfImpact', function () {
        const c1 = new CircleShape(0, 0, 1);

        const input = new TOIInput();
        c1.computeDistanceProxy(input.proxyA, 0);
        c1.computeDistanceProxy(input.proxyB, 0);

        input.sweepA = new Sweep();
        input.sweepA = new Sweep();

        input.sweepA.setTransform(Transform.create(0, 0, 0));
        input.sweepB.setTransform(Transform.create(1.9, 0, 0));

        input.tMax = 1.0;

        const output = new TOIOutput();

        timeOfImpact(output, input);
        console.log(output.t, output.state);

        input.sweepB.setTransform(Transform.create(2, 0, 0));

        timeOfImpact(output, input);
        console.log(output.t, output.state);

        input.sweepB.setTransform(Transform.create(2.1, 0, 0));

        timeOfImpact(output, input);
        console.log(output.t, output.state);
    });
});
