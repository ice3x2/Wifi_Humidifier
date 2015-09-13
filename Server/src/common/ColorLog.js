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
        var day  = date.getDate();
        day = (day < 10 ? "0" : "") + day;
        var timeStr = getDateTime();
        return timeStr;
    }

    function getDateTime() {

        var date = new Date();

        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min  = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec  = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = date.getFullYear();

        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day  = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        return year + "." + month + "." + day + "/" + hour + ":" + min + ":" + sec;
    }

};

module.exports = new log();