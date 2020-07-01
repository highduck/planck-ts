import {Body, BoxShape, CircleShape, EdgeShape, Vec2, World} from 'planck-ts';
import {testbed} from "planck-ts-testbed";

testbed('ShapeEditing', function (testbed) {
    testbed.info('C: Create a shape, X: Destroy a shape, Z: Sensor');


    var world = new World({gravity: new Vec2(0, -10)});

    var sensor = true;

    var ground = world.createBody();
    ground.createFixture(new EdgeShape(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));

    var body = world.createBody({type: Body.DYNAMIC, position: new Vec2(0.0, 10.0)});

    var fixture1 = body.createFixture(new BoxShape(4.0, 4.0, new Vec2(0.0, 0.0), 0.0), {density: 10.0});
    var fixture2 = null;

    testbed.keydown = function (code, char) {
        switch (char) {
            case 'C':
                if (fixture2 == null) {
                    var shape = new CircleShape(0.5, -4.0, 3.0);
                    fixture2 = body.createFixture(shape, {density: 10.0});
                    body.setAwake(true);
                    fixture2.setSensor(sensor);
                }
                break;

            case 'X':
                if (fixture2 != null) {
                    body.destroyFixture(fixture2);
                    fixture2 = null;
                    body.setAwake(true);
                }
                break;

            case 'Z':
                if (fixture2 != null) {
                    sensor = !sensor;
                    fixture2.setSensor(sensor);
                }
                break;
        }

        updateStatus();
    };

    function updateStatus() {
        testbed.status('Sensor', sensor);
    }

    updateStatus();

    return world;
});
