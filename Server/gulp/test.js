/**
 * Created by ice3x2 on 2015. 6. 13..
 */
var gulp = require('gulp');
var mocha = require('gulp-mocha');

var fs = require('fs');
var colors = require('colors');
var argv = require('yargs').argv;

gulp.task('test', function () {

    if(argv.single) {
        fs.stat(argv.single, function(err, stat) {
            if(err == null) {
                return runTest(argv.single);
            } else if(err.code == 'ENOENT') {
                fs.stat('test/' + argv.single, function(err, stat) {
                    if(err == null) {
                        return runTest(['test/' + argv.single]);
                    } else if(err.code == 'ENOENT') {
                        console.log(colors.red.underline(argv.single + ' is not a file.'));
                    } else {
                        console.error(err);
                    }
                });
            } else {
                console.error(err);
            }
        });
    } else {
        runTest(['test/**/*.js']);
    }



    function runTest(srcsList) {
        return gulp.src(srcsList, {read: true})
            .pipe(mocha({reporter: 'nyan',timeout : 5000}))
            .once('error', function (err) {
                console.error(err);
                process.exit(1);
            })
            .once('end', function () {
                process.exit();
            });
    }


});
