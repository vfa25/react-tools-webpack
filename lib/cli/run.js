#!/usr/bin/env node

'use strict'

require('colorful').colorful();
const gulp = require('gulp');
const program = require('commander');
const gulpfile = require('../gulpfile');

program.on('--help', () => {
  console.log('  Usage:'.to.bold.blue.color);
  console.log();
})

program.parse(process.argv);

function runTask(toRun) {
  const metadata = { task: toRun };
  if (gulpfile[toRun] === undefined) {
    gulp.emit('task_not_found', metadata);
    return;
  }
  const start = process.hrtime();
  gulp.emit('task_start', metadata);
  try {
    gulpfile[toRun].apply(gulp);
    metadata.hrDuration = process.hrtime(start);
    gulp.emit('task_stop', metadata);
    gulp.emit('stop');
  } catch (err) {
    err.hrDuration = process.hrtime(start);
    err.task = metadata.task;
    gulp.emit('task_err', err);
  }
}

const task = program.args[0];

if (!task) {
  program.help();
} else {
  console.log('bubai run', task);
  runTask(task);
}
