/**
 * Created by ice3x2 on 2015. 6. 5..
 */
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
//var plumber = require('gulp-plumber');


gulp.task('demon:server', function() {
    nodemon({
        script : 'bin/www',
        ext: 'js',
        // View 와, 빌드된 파일, 그리고 gulp 스크립트는 무시한다.
        ignore : ['src/test/**/*',  'libhost/**/*','node_modules/**/*','.git/**/*','gulp*', 'gulp/**/*', 'build/**/*']
    });
})