var gulp    = require('gulp');
var jshint  = require('gulp-jshint');
var nodemon = require('gulp-nodemon');

gulp.task('default', function () {
  nodemon({
    script: './server/server.js',
    ext: 'js'
  })
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
