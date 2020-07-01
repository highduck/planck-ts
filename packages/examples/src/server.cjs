const Path = require('path');
const FS = require('fs');
const Express = require('express');
// var ServeIndex = require('serve-index');
const Webpack = require('webpack');
const WebpackMiddleware = require('webpack-dev-middleware');
const Handlebars = require('handlebars');

const compiler = Webpack([
    {
        entry: {
            'planck-with-testbed': 'planck-ts-testbed',
            "8-Ball":"./example/8-Ball.js",
            "AddPair":"./example/AddPair.js",
            "ApplyForce":"./example/ApplyForce.js",
            "Asteroid":"./example/Asteroid.js",
            "BasicSliderCrank":"./example/BasicSliderCrank.js",
            "BodyTypes":"./example/BodyTypes.js",
            "Boxes":"./example/Boxes.js",
            "Breakable":"./example/Breakable.js",
            "Breakout":"./example/Breakout.js",
            "Bridge":"./example/Bridge.js",
            "BulletTest":"./example/BulletTest.js",
            "Cantilever":"./example/Cantilever.js",
            "Car":"./example/Car.js",
            "Chain":"./example/Chain.js",
            "CharacterCollision":"./example/CharacterCollision.js",
            "CollisionFiltering":"./example/CollisionFiltering.js",
            "CollisionProcessing":"./example/CollisionProcessing.js",
            "CompoundShapes":"./example/CompoundShapes.js",
            "Confined":"./example/Confined.js",
            "ContinuousTest":"./example/ContinuousTest.js",
            "ConvexHull":"./example/ConvexHull.js",
            "ConveyorBelt":"./example/ConveyorBelt.js",
            "DistanceTest":"./example/DistanceTest.js",
            "Dominos":"./example/Dominos.js",
            "DynamicTreeTest":"./example/DynamicTreeTest.js",
            "EdgeShapes":"./example/EdgeShapes.js",
            "EdgeTest":"./example/EdgeTest.js",
            "Gears":"./example/Gears.js",
            "HeavyOnLight":"./example/HeavyOnLight.js",
            "HeavyOnLightTwo":"./example/HeavyOnLightTwo.js",
            "Mixer":"./example/Mixer.js",
            "Mobile":"./example/Mobile.js",
            "MobileBalanced":"./example/MobileBalanced.js",
            "MotorJoint":"./example/MotorJoint.js",
            "OneSidedPlatform":"./example/OneSidedPlatform.js",
            "Pinball":"./example/Pinball.js",
            "PolyCollision":"./example/PolyCollision.js",
            "PolyShapes":"./example/PolyShapes.js",
            "Prismatic":"./example/Prismatic.js",
            "Pulleys":"./example/Pulleys.js",
            "Pyramid":"./example/Pyramid.js",
            "RayCast":"./example/RayCast.js",
            "Revolute":"./example/Revolute.js",
            "Rope":"./example/Rope.js",
            "RopeJoint":"./example/RopeJoint.js",
            "SensorTest":"./example/SensorTest.js",
            "ShapeEditing":"./example/ShapeEditing.js",
            "Shuffle":"./example/Shuffle.js",
            "SliderCrank":"./example/SliderCrank.js",
            "Soccer":"./example/Soccer.js",
            "SphereStack":"./example/SphereStack.js",
            "TheoJansen":"./example/TheoJansen.js",
            "Tiles":"./example/Tiles.js",
            "TimeOfImpact":"./example/TimeOfImpact.js",
            "Tumbler":"./example/Tumbler.js",
            "VaryingFriction":"./example/VaryingFriction.js",
            "VaryingRestitution":"./example/VaryingRestitution.js",
            "VerticalStack":"./example/VerticalStack.js",
            "Web":"./example/Web.js",
        },
        output: {
            library: 'planck',
            filename: '[name].js',
        },
        optimization: {
            minimize: false
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }
            ]
        },
        plugins: [
            new Webpack.DefinePlugin({
                DEBUG: JSON.stringify(false),
                ASSERT: JSON.stringify(true),
                PLANCK_DEBUG: JSON.stringify(false),
                PLANCK_ASSERT: JSON.stringify(true),
            }),
        ],
    }
]);
var app = Express();

app.set('port', process.env.PORT || 6587);

app.use(WebpackMiddleware(compiler, {
    publicPath: '/dist/',
    compress: false,
}));

app.use(Express.static(Path.resolve(__dirname, '..')));

app.get('/example/:name?', function (req, res, next) {
    var pname = req.params.name || '';
    var script = '';
    var examples = FS.readdirSync('./example/')
        .filter(function (file) {
            return file.endsWith('.js');
        })
        .map(function (file) {
            var name = file.replace(/\.[^.]+$/, '');
            var url = '/example/' + name;
            var selected = false;
            if (name.toLowerCase() == pname.toLowerCase()) {
                script = '/dist/' + file;
                selected = true;
            }
            return {name: name, url: url, selected: selected};
        });

    var page = Handlebars.compile(FS.readFileSync('./src/index.hbs') + '');
    res.send(page({
        script: script,
        examples: examples
    }));
});

app.get('/', function (req, res, next) {
    res.redirect('/example/')
});

// app.use(ServeIndex(__dirname, {
//   icons : true,
//   css : 'ul#files li{float:none;}' // not actually working!
// }));

app.listen(app.get('port'), function () {
    console.log('Checkout http://localhost:' + app.get('port'));
});
