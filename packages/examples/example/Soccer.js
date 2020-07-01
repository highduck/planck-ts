import {Body, ChainShape, CircleShape, Settings, Vec2, World,} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('Soccer', function (testbed) {
    const SPI4 = Math.sin(Math.PI / 4);
    const SPI3 = Math.sin(Math.PI / 3);

    const width = 10;
    const height = 6;

    const PLAYER_R = 0.35;
    const BALL_R = 0.23;

    testbed.x = 0;
    testbed.y = 0;
    testbed.width = width * 1.6;
    testbed.height = height * 1.6;
    testbed.ratio = 60;
    testbed.mouseForce = -120;

    Settings.velocityThreshold = 0;

    const world = new World();

    const goal = [
        new Vec2(0, -height * 0.2),
        new Vec2(0, +height * 0.2)
    ];

    const wallFixDef = {
        friction: 0,
        restitution: 0,
        userData: 'wall'
    };
    const goalFixDef = {
        friction: 0,
        restitution: 1,
        userData: 'goal'
    };

    const ballFixDef = {
        friction: .2,
        restitution: .99,
        density: .5,
        userData: 'ball'
    };
    const ballBodyDef = {
        type: Body.DYNAMIC,
        bullet: true,
        linearDamping: 3.5,
        angularDamping: 1.6
    };
    const playerFixDef = {
        friction: .1,
        restitution: .99,
        density: .8,
        userData: 'player'
    };
    const playerBodyDef = {
        type: Body.DYNAMIC,
        bullet: true,
        linearDamping: 4,
        angularDamping: 1.6
    };

    world.createBody().createFixture(new ChainShape(walls(), true), wallFixDef);

    world.createBody({position: new Vec2(-width * 0.5 - BALL_R, 0)}).createFixture(new ChainShape(goal), goalFixDef);
    world.createBody({position: new Vec2(+width * 0.5 + BALL_R, 0)}).createFixture(new ChainShape(goal), goalFixDef);

    const ball = world.createBody(ballBodyDef);
    ball.createFixture(new CircleShape(0, 0, BALL_R), ballFixDef);
    ball.render = {fill: 'white', stroke: 'black'};

    team().forEach(function (p) {
        const player = world.createBody(playerBodyDef);
        player.setPosition(p);
        player.createFixture(new CircleShape(0, 0, PLAYER_R), playerFixDef);
        player.render = {fill: '#0077ff', stroke: 'black'};
    });

    team().map((v) => v.clone().scale(-1, 1)).forEach(function (p) {
        const player = world.createBody(playerBodyDef);
        player.setPosition(p);
        player.setAngle(Math.PI);
        player.createFixture(new CircleShape(0, 0, PLAYER_R), playerFixDef);
        player.render = {fill: '#ff411a', stroke: 'black'};
    });

    world.on('post-solve', function (contact) {
        const fA = contact.getFixtureA(), bA = fA.getBody();
        const fB = contact.getFixtureB(), bB = fB.getBody();

        const wall = fA.getUserData() === wallFixDef.userData ? bA : fB.getUserData() === wallFixDef.userData ? bB : null;
        const ball = fA.getUserData() === ballFixDef.userData ? bA : fB.getUserData() === ballFixDef.userData ? bB : null;
        const goal = fA.getUserData() === goalFixDef.userData ? bA : fB.getUserData() === goalFixDef.userData ? bB : null;

        // do not change world immediately
        setTimeout(function () {
            if (ball && goal) {
                ball.setPosition(new Vec2(0, 0));
                ball.setLinearVelocity(new Vec2(0, 0));
                // world.destroyBody(ball);
            }
        }, 1);
    });

    return world;

    function team() {
        const positions = [];
        positions.push(new Vec2(-width * .45, 0));
        positions.push(new Vec2(-width * .3, -height * 0.2));
        positions.push(new Vec2(-width * .3, +height * 0.2));
        positions.push(new Vec2(-width * .1, -height * 0.1));
        positions.push(new Vec2(-width * .1, +height * 0.1));
        return positions;
    }

    function walls() {
        const chain = [
            new Vec2(-width * .5 + 0.2, -height * .5),
            new Vec2(-width * .5, -height * .5 + 0.2),
            new Vec2(-width * .5, -height * .2),
            new Vec2(-width * .6, -height * .2),
            new Vec2(-width * .6, +height * .2),
            new Vec2(-width * .5, +height * .2),
            new Vec2(-width * .5, +height * .5 - .2),
            new Vec2(-width * .5 + .2, +height * .5),
            new Vec2(+width * .5 - .2, +height * .5),
            new Vec2(+width * .5, +height * .5 - .2),
            new Vec2(+width * .5, +height * .2),
            new Vec2(+width * .6, +height * .2),
            new Vec2(+width * .6, -height * .2),
            new Vec2(+width * .5, -height * .2),
            new Vec2(+width * .5, -height * .5 + .2),
            new Vec2(+width * .5 - .2, -height * .5)
        ];
        return chain;
    }
});
