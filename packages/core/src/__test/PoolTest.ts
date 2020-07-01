/// <reference path="../global.d.ts" />
(global as any).PLANCK_DEBUG = true;
(global as any).PLANCK_ASSERT = true;
import {expect} from "chai";

import {Pool} from "../util/Pool";

interface Obj {
    created: boolean;
    busy: boolean;
    discarded: boolean;
}

describe('Pool', function () {
    it('Pool', function () {

        const pool = new Pool<Obj>({
            create: function () {
                return {
                    created: true,
                    busy: false,
                    discarded: false,
                };
            },
            allocate: function (obj) {
                obj.busy = true;
            },
            release: function (obj) {
                obj.busy = false;
            },
            discard: function (obj) {
                obj.discarded = true;
                return obj;
            },
            max: 1
        });

        const a = pool.allocate();
        const b = pool.allocate();

        expect(a.created).be.true;
        expect(a.busy).be.true;
        expect(a.discarded).be.false;

        pool.release(a);
        expect(a.busy).be.false;
        expect(a.discarded).be.false;

        pool.release(b);
        expect(b.discarded).be.true;

    });
});
