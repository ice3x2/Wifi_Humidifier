/**
 * Created by ice3x2 on 2015. 9. 8..
 */
var clc = require('cli-color');

function log() {
    this.i = function(message) {
        var msg = "[" + getCurrentTimeString() + "/info] " + clc.green(message);
        console.log(msg);
    }
    this.d = function(message) {
        var msg = "[" + getCurrentTimeString() + "/debug] " + clc.blue(message);
        console.log(msg);
    }
    this.e = function(message) {
        var msg = "[" + getCurrentTimeString() + "/error] " + clc.red(message);
        console.log(msg);
    }
    this.w = function(message) {
        var msg = "[" + getCurrentTimeString() + "/wrong] " + clc.yellow(message);
        console.log(msg);

    }
    this.v = function(message) {
        var msg = "[" + getCurrentTimeString() + "/value] " + clc.cyan(message);
        console.log(msg);
    }

    var getCurrentTimeString = function() {
        var date = new Date();
        var timeStr = date.getFullYear() + "." + date.getMonth() + "." + date.getDay() + "-"  + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        return timeStr;
    }
};

module.exports = new log();