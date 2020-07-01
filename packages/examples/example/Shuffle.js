import {Body, ChainShape, CircleShape, MathUtil, Settings, Vec2, World} from 'planck-ts-core';
import {testbed} from "planck-ts-testbed";

testbed('Shuffle', function (testbed) {
    const SPI4 = Math.sin(Math.PI / 4);
    const SPI3 = Math.sin(Math.PI / 3);

    const width = 10.00;
    const height = 10.00;

    const BALL_R = 0.3;
    const BALL_D = 1;

    testbed.x = 0;
    testbed.y = 0;
    testbed.width = width * 1.5;
    testbed.height = height * 1.5;
    testbed.ratio = 50;
    testbed.mouseForce = -100;

    Settings.velocityThreshold = 0;

    const world = new World();

    const walls = [
        new Vec2(-width * .5, -height * .5),
        new Vec2(-width * .5, +height * .5),
        new Vec2(+width * .5, +height * .5),
        new Vec2(+width * .5, -height * .5)
    ];

    const wallFixDef = {
        userData: 'wall'
    };
    const ballFixDef = {
        friction: 0.1,
        restitution: 0.98,
        density: 0.8,
        userData: 'ball'
    };
    const ballBodyDef = {
        type: Body.DYNAMIC,
        bullet: true,
        linearDamping: 1.6,
        angularDamping: 1.6
    };

    world.createBody().createFixture(new ChainShape(walls, true), wallFixDef);

    row(1, 8, BALL_R, BALL_D)
        .map((v) => new Vec2(v.x + height * 0.4, v.y))
        .forEach(function (p) {
            const ball = world.createBody(ballBodyDef);
            ball.setPosition(p);
            ball.setAngle(Math.PI);
            ball.createFixture(new CircleShape(0, 0, BALL_R), ballFixDef);
            ball.render = {fill: '#ff411a', stroke: 'black'};
        });

    row(1, 8, BALL_R, BALL_D)
        .map((v) => new Vec2(v.x - height * 0.4, v.y))
        .forEach(function (p) {
            const ball = world.createBody(ballBodyDef);
            ball.setPosition(p);
            ball.createFixture(new CircleShape(0, 0, BALL_R), ballFixDef);
            ball.render = {fill: '#0077ff', stroke: 'black'};
        });

    world.on('post-solve', function (contact) {
        const fA = contact.getFixtureA();
        const bA = fA.getBody();

        const fB = contact.getFixtureB();
        const bB = fB.getBody();

        const wall = fA.getUserData() === wallFixDef.userData ? bA : fB.getUserData() === wallFixDef.userData ? bB : null;
        const ball = fA.getUserData() === ballFixDef.userData ? bA : fB.getUserData() === ballFixDef.userData ? bB : null;

        // do not change world immediately
        setTimeout(function () {
            if (ball && wall) {
                world.destroyBody(ball);
            }
        }, 1);
    });

    return world;

    function row(n, m, r, l) {
        const d = r * 2;
        const balls = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                balls.push(new Vec2(i * l - (n - 1) * .5 * l + MathUtil.random(r * 0.02), j * l - (m - 1) * .5 * l + MathUtil.random(r * 0.02)));
            }
        }
        return balls;
    }
});
