import {Body, World, Vec2, Settings, CircleShape, PolygonShape, MathUtil} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('8 Ball', function (testbed) {
    const SPI4 = Math.sin(Math.PI / 4);
    const SPI3 = Math.sin(Math.PI / 3);

    const COLORED = true;
    const BLACK = {fill: 'black', stroke: 'white'};
    const WHITE = {fill: 'white', stroke: 'black'};
    const COLORS = [
        {fill: '#ffdd00', stroke: '#000000'},
        {fill: '#ffdd00', stroke: '#ffffff'},
        {fill: '#ff3300', stroke: '#000000'},
        {fill: '#ff3300', stroke: '#ffffff'},
        {fill: '#662200', stroke: '#000000'},
        {fill: '#662200', stroke: '#ffffff'},
        {fill: '#ff8800', stroke: '#000000'},
        {fill: '#ff8800', stroke: '#ffffff'},
        {fill: '#00bb11', stroke: '#000000'},
        {fill: '#00bb11', stroke: '#ffffff'},
        {fill: '#9900ff', stroke: '#000000'},
        {fill: '#9900ff', stroke: '#ffffff'},
        {fill: '#0077ff', stroke: '#000000'},
        {fill: '#0077ff', stroke: '#ffffff'}
    ];

    const width = 8;
    const height = 4;

    const BALL_R = 0.12;
    const POCKET_R = 0.2;

    testbed.x = 0;
    testbed.y = 0;
    testbed.width = width * 1.2;
    testbed.height = height * 1.2;
    testbed.ratio = 100;
    testbed.mouseForce = -30;

    Settings.velocityThreshold = 0;

    const world = new World({});

    const railH = [
        new Vec2(POCKET_R, height * .5),
        new Vec2(POCKET_R, height * .5 + POCKET_R),
        new Vec2(width * .5 - POCKET_R / SPI4 + POCKET_R, height * .5 + POCKET_R),
        new Vec2(width * .5 - POCKET_R / SPI4, height * .5)
    ];

    const railV = [
        new Vec2(width * .5, -(height * .5 - POCKET_R / SPI4)),
        new Vec2(width * .5 + POCKET_R, -(height * .5 - POCKET_R / SPI4 + POCKET_R)),
        new Vec2(width * .5 + POCKET_R, height * .5 - POCKET_R / SPI4 + POCKET_R),
        new Vec2(width * .5, height * .5 - POCKET_R / SPI4)
    ];

    const railFixDef = {
        friction: 0.1,
        restitution: 0.9,
        userData: 'rail'
    };
    const pocketFixDef = {
        userData: 'pocket'
    };
    const ballFixDef = {
        friction: 0.1,
        restitution: 0.99,
        density: 1,
        userData: 'ball'
    };
    const ballBodyDef = {
        type: Body.DYNAMIC,
        linearDamping: 1.5,
        angularDamping: 1
    };

    world.createBody().createFixture(new PolygonShape(railV.map((v) => v.clone().scale(+1, +1))), railFixDef);
    world.createBody().createFixture(new PolygonShape(railV.map((v) => v.clone().scale(-1, +1))), railFixDef);
    world.createBody().createFixture(new PolygonShape(railH.map((v) => v.clone().scale(+1, +1))), railFixDef);
    world.createBody().createFixture(new PolygonShape(railH.map((v) => v.clone().scale(-1, +1))), railFixDef);
    world.createBody().createFixture(new PolygonShape(railH.map((v) => v.clone().scale(+1, -1))), railFixDef);
    world.createBody().createFixture(new PolygonShape(railH.map((v) => v.clone().scale(-1, -1))), railFixDef);

    world.createBody().createFixture(new CircleShape(0, -height * .5 - POCKET_R * 1.5, POCKET_R), pocketFixDef);
    world.createBody().createFixture(new CircleShape(0, +height * .5 + POCKET_R * 1.5, POCKET_R), pocketFixDef);

    world.createBody().createFixture(new CircleShape(+width * .5 + POCKET_R * .7, +height * .5 + POCKET_R * .7, POCKET_R), pocketFixDef);
    world.createBody().createFixture(new CircleShape(-width * .5 - POCKET_R * .7, +height * .5 + POCKET_R * .7, POCKET_R), pocketFixDef);

    world.createBody().createFixture(new CircleShape(+width * .5 + POCKET_R * .7, -height * .5 - POCKET_R * .7, POCKET_R), pocketFixDef);
    world.createBody().createFixture(new CircleShape(-width * .5 - POCKET_R * .7, -height * .5 - POCKET_R * .7, POCKET_R), pocketFixDef);

    const balls = rack(BALL_R).map((v) => {
        v.x += width / 4;
        return v;
    });

    balls.push({x: -width / 4, y: 0});

    if (COLORED) {
        shuffleArray(COLORS);
        for (let i = 0; i < COLORS.length; i++) {
            balls[i].render = COLORS[i];
        }
        balls[14].render = balls[4].render;
        balls[4].render = BLACK;
        balls[balls.length - 1].render = WHITE;
    }

    let i = 0;
    for (; i < balls.length; i++) {
        const ball = world.createBody(ballBodyDef);
        ball.setBullet(true);
        ball.setPosition(balls[i]);
        ball.createFixture(new CircleShape(0, 0, BALL_R), ballFixDef);
        ball.render = balls[i].render;
    }

    world.on('post-solve', function (contact) {
        const fA = contact.getFixtureA(), bA = fA.getBody();
        const fB = contact.getFixtureB(), bB = fB.getBody();

        const pocket = fA.getUserData() === pocketFixDef.userData && bA || fB.getUserData() === pocketFixDef.userData && bB;
        const ball = fA.getUserData() === ballFixDef.userData && bA || fB.getUserData() === ballFixDef.userData && bB;

        // do not change world immediately
        setTimeout(function () {
            if (ball && pocket) {
                world.destroyBody(ball);
            }
        }, 1);
    });

    return world;

    function rack(r) {
        const n = 5;
        const balls = [];
        const d = r * 2;
        const l = SPI3 * d;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                balls.push({
                    x: i * l /*- (n - 1) * 0.5 * l*/ + MathUtil.random(r * 0.02),
                    y: (j - i * 0.5) * d + MathUtil.random(r * 0.02),
                });
            }
        }
        return balls;
    }

    function shuffleArray(array) {
        // http://stackoverflow.com/a/12646864/483728
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

});
