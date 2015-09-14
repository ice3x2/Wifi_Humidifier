/**
 * Created by ice3x2 on 2015. 6. 5..
 */
var gulp = require('gulp')
var concat = require('gulp-concat');
var livereload = require('gulp-livereload');
var minifyCss = require('gulp-minify-css');


gulp.task('css',function() {
    taskCss(['views/css/app.css', 'views/css/**/*.css'], 'build/css');
});


function taskCss(srcPaths,destPath) {
    var gulpObj = gulp.src(srcPaths)
        .pipe(concat('app.css'))
        //gulpObj = gulpObj.pipe(minifyCss())


    gulpObj.pipe(gulp.dest(destPath))
           .pipe(livereload({ start: true }));
};


gulp.task('watch:css',['css'] ,function() {
    livereload.listen();
    gulp.watch(['views/css/**/*.css'] , ['css']);
});

