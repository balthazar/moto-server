const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const dotenv = require('dotenv').config({ path: resolve('./.env') })

module.exports = {
  entry: {
    app: './app/index.js',
  },

  devtool: process.env.NODE_ENV === 'production' ? undefined : 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [/node_modules/],
        options: {
          presets: ['@babel/preset-react'],
        },
      },
    ],
  },

  resolve: {
    alias: {
      'mapbox-gl$': resolve('./node_modules/mapbox-gl/dist/mapbox-gl.js'),
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      __MAPBOX__: JSON.stringify(dotenv.parsed.MAPBOX),
      __APP__: JSON.stringify(process.argv[4].slice(2)),
    }),
    new HtmlWebpackPlugin({ template: 'app/index.html' }),
  ],
}
