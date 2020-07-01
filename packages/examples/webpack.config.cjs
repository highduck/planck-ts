const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

// var merge = require('lodash.merge');
const pkg = require('./package.json');

const license = fs.readFileSync('../../LICENSE.txt', 'utf8');

const licenseBanner = `
Planck.js v${pkg.version}

${license}
`;

module.exports = [
    {
        entry: {
            'planck-with-testbed': './src/index.js'
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].min.js',
            library: 'planck',
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
        devtool: 'source-map',
        optimization: {
            minimize: true
        },
        plugins: [
            new webpack.BannerPlugin(licenseBanner),
            new webpack.DefinePlugin({
                DEBUG: JSON.stringify(false),
                ASSERT: JSON.stringify(false),
                PLANCK_DEBUG: JSON.stringify(false),
                PLANCK_ASSERT: JSON.stringify(false),
            }),
        ],
    }
];
