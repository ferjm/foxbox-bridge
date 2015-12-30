var gulp    = require('gulp');
var jshint = require('gulp-jshint');
var server  = require('./server/server.js');

gulp.task('default', function() {
  server.run();
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
