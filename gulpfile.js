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

gulp.task('test', ['lint'], function () {
  return gulp.src(['tests/*.test.js'], {read: false})
    .pipe(mocha({}));
});

gulp.task('dev', function(){
  nodemon({ script: './server/server.js', ext: 'js'})
    .on('start', ['test']);
});

gulp.task('default', ['dev']);
