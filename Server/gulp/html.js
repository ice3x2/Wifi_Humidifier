/**
 * Created by ice3x2 on 2015. 6. 5..
 */
var gulp = require('gulp');
var minifyHTML = require('gulp-minify-html');
var livereload = require('gulp-livereload');


gulp.task('html', function() {
    taskHtml(['views/html/**/*'], './build')
});


function taskHtml(srcPaths,destPath) {
    var opts = {
        conditionals: true,
        spare:true
    };
    var gulpObj = gulp.src(srcPaths);
    //gulpObj = gulpObj.pipe(minifyHTML(opts))
    gulpObj.pipe(gulp.dest(destPath))
           .pipe(livereload({ start: true }));
}


gulp.task('watch:html',['html'], function() {
    livereload.listen();
    gulp.watch(['views/html/**/*'] ,['html']);
});