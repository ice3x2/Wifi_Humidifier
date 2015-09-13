/**
 * Created by ice3x2 on 2015. 6. 5..
 **/

var fs = require('fs');
var gulp = require('gulp');


gulp.task('auto:dev', ['demon:server']);


fs.readdirSync(__dirname + '/gulp').forEach(function(task) {
   console.log("load gulp : " +  task);
   require('./gulp/' + task);
});
