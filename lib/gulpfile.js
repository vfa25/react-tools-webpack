/* eslint-disable import/order */
const { getProjectPath, getConfig } = require('./utils/projectHelper');

// const fs = require('fs');
// const path = require('path');

const webpack = require('webpack');
const merge2 = require('merge2');
const rimraf = require('rimraf');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const stripCode = require('gulp-strip-code');
const babel = require('gulp-babel');
const argv = require('minimist')(process.argv.slice(2)); // 去掉 包名 和 run关键字
// 经常被用于处理node的stream。底层是对node的transform stream转换流做了二次封装
// 参考 https://segmentfault.com/a/1190000011740894
const through2 = require('through2');
const transformLess = require('./transformLess');
const tsConfig = require('./getTSCommonConfig')();
const replaceLib = require('./replaceLib');
const { cssInjection } = require('./utils/styleUtil');
const getBabelCommonConfig = require('./getBabelCommonConfig');

const tsDefaultReporter = ts.reporter.defaultReporter();
const libDir = getProjectPath('lib');
const esDir = getProjectPath('es');

function dist(done) {
  rimraf.sync(getProjectPath('dist'));
  process.env.RUN_ENV = 'PRODUCTION';
  const webpackConfig = require(getProjectPath('webpack.config.js'));
  webpack(webpackConfig, (err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
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

exports.dist = gulp.series(done => {
  dist(done);
})

function babelify(js, modules) {
  const babelConfig = getBabelCommonConfig(modules);
  delete babelConfig.cacheDirectory;
  if (modules === false) {
    babelConfig.plugins.push(replaceLib);
  }
  let stream = js.pipe(babel(babelConfig)).pipe(
    through2.obj(function z(file, encoding, next) {
      this.push(file.clone());
      if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
        const content = file.contents.toString(encoding);
        file.contents = Buffer.from(cssInjection(content));
        file.path = file.path.replace(/index\.js/, 'css.js');
        this.push(file);
        next();
      } else {
        next();
      }
    })
  );
  if (modules === false) {
    stream = stream.pipe(
      // 条形码
      stripCode({
        start_comment: '@remove-on-es-build-begin',
        end_comment: '@remove-on-es-build-end',
      })
    );
  }
  return stream.pipe(gulp.dest(modules === false ? esDir : libDir));
}

function compile(modules) {
  rimraf.sync(modules !== false ? libDir : esDir);
  const less = gulp
    .src(['components/**/*.less'])
    .pipe(
      through2.obj(function(file, encoding, next) {
        this.push(file.clone());
        if (
          file.path.match(/(\/|\\)style(\/|\\)index\.less$/) ||
          file.path.match(/(\/|\\)style(\/|\\)v2-compatible-reset\.less$/)
        ) {
          transformLess(file.path)
            .then(css => {
              file.contents = Buffer.from(css);
              file.path = file.path.replace(/\.less$/, '.css');
              this.push(file);
              next();
            })
            .catch(e => {
              console.error(e);
            });
        } else {
          next();
        }
      })
    )
    .pipe(gulp.dest(modules === false ? esDir: libDir));
  const assets = gulp
    .src(['components/**/*.@(png|svg)'])
    .pipe(gulp.dest(module === false ? esDir : libDir));
  let error = 0;
  const source = ['components/**/*.tsx', 'components/**/*.ts', 'typings/**/*.d.ts'];
  // allow jsx file in components/xxx/
  if (tsConfig.allowJs) {
    source.unshift('components/**/*.jsx');
  }
  const tsResult = gulp.src(source).pipe(
    ts(tsConfig, {
      error(e) {
        tsDefaultReporter.error(e);
        error = 1
      },
      finish: tsDefaultReporter.finish,
    })
  );

  function check() {
    if (error && !argv['ignore-error']) {
      process.exit(1);
    }
    console.log(`${modules === false ? 'es模块编译完成' : 'lib/commonjs模块编译完成'}`);
  }

  tsResult.on('finish', check);
  tsResult.on('end', check);
  const tsFilesStream = babelify(tsResult.js, modules);
  const tsd = tsResult.dts.pipe(gulp.dest(modules === false ? esDir : libDir));
  return merge2([less, tsFilesStream, tsd, assets]);
}

exports['compile-with-es'] = done => {
  console.log('[Parallel] Compile to es...');
  compile(false).on('finish', done);
}

exports['compile-with-lib'] = done => {
  console.log('[Parallel] Compile to js...');
  compile().on('finish', done);
}

exports['compile-finalize'] = done => {
  // Additional process o compile finalize
  const { compile: { finalize } = {} } = getConfig();
  if (finalize) {
    console.log('[Compile] Finalization...');
    finalize();
  }
  done();
}

exports.compile = gulp.series(
  gulp.parallel('compile-with-es', 'compile-with-lib'), 'compile-finalize'
)
