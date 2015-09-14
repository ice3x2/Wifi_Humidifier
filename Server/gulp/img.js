/**
 * Created by ice3x2 on 2015. 6. 5..
 */
var gulp = require('gulp');
var livereload = require('gulp-livereload');

gulp.task('img', function() {
    taskImg(['views/img/**/*.png','views/img/**/*.jpg','views/img/**/*.svg'],'build/img');
});




function taskImg(srcPaths,destPath) {
    gulp.src(srcPaths)
        .pipe(gulp.dest(destPath))
        .pipe(livereload());
}



gulp.task('watch:img',['img'] ,function() {
    livereload.listen();
    gulp.watch(['views/img/**/*.*'],['img','img']);
})