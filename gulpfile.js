var gulp    = require('gulp');
var jshint  = require('gulp-jshint');
var nodemon = require('gulp-nodemon');
var mocha   = require('gulp-spawn-mocha');

gulp.task('serve', function () {
  nodemon({
    script: './server/server.js',
    ext: 'js'
  });
});

function lint() {
  return gulp.src(['**/*.js', '!node_modules/**', '!test/**'])
             .pipe(jshint())
             .pipe(jshint.reporter('default'));
}

gulp.task('lint', function() {
  return lint().on('error', function(e) {
    throw e;
  });
});

gulp.task('run-tests', ['lint'], function () {
  return gulp.src(['tests/*.test.js'], {read: false})
    .pipe(mocha({}));
});

gulp.task('test', function() {
  process.env.NODE_ENV = 'test';
  nodemon({ script: './server/server.js', ext: 'js'})
    .on('start', ['run-tests']);
});

gulp.task('default', ['serve']);
