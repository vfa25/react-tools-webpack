const { getProjectPath, injectRequire, getConfig } = require('./utils/projectHelper');

const fs = require('fs');

const webpack = require('webpack');
const rimraf = require('rimraf');
const gulp = require('gulp');

const series = gulp.series;

function dist(done) {
  rimraf.sync(getProjectPath('dist'));
  process.env.RUN_ENV = 'PRODUCTION';
  const webpackConfig = require(getProjectPath('webpack.config.js'));
  webpack(webpackConfig, (err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.err(err.details);
      }
      return;
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
      console.error(info.errors);
    }

    if (stats.hasWarnings()) {
      console.warn(info.warnings);
    }

    const buildInfo = stats.toString({
      colors: true,
      children: true,
      chunks: false,
      modules: false,
      chunkModules: false,
      hash: false,
      version: false,
    })
    console.log(buildInfo);

    // Additional process of dist finalize
    const { dist: { finalize } = {}} = getConfig();
    if (finalize) {
      console.log('[Dist] Finalization...');
      finalize();
    }
    done(0);
  })
}

exports.clean = () => {
  rimraf.sync(getProjectPath('_site'));
  rimraf.sync(getProjectPath('_data'));
}

exports.dist = series(done => {
  this.dist(done);
})