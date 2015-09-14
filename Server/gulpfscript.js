/**
 * Created by ice3x2 on 2015. 6. 5..
 */
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');


gulp.task('js', function() {
    var path = ['views/javascript/app.js','views/javascript/service/*.js','views/javascript/directives/*.js'];
    taskJs(path, 'build/js');
});


function taskJs(srcPaths,destPath) {
    var gulpObj = gulp.src(srcPaths)
        .pipe(ngAnnotate())
        .pipe(concat('app.js'));
    //.pipe(sourcemaps.init())

    //gulpObj = gulpObj.pipe(uglify());

    gulpObj.pipe(gulp.dest(destPath))
            .pipe(livereload());

}


gulp.task('watch:js',['js'], function() {
    livereload.listen();
    gulp.watch(['views/javascript/**/*.js'],['js']);
});