/**
 * Created by ice3x2 on 2015. 9. 15..
 */

var express = require('express');
var path = require('path');
var router = express.Router();
var dataStore = include('DataStore');
var log = include('ColorLog');

router.post('/list', function(req, res, next) {
    if(_.isEmpty(req.body)) {
        res.json([]);
        return;
    }
    function subscriber(list) {
        log.d(list.length)
        res.json(list);
    }
    function error(err) {
        next(err);
    }
    var time = (parseInt(req.body.time) + '' == 'NaN')?Date.now():parseInt(req.body.time);

    if(req.body.type == 'h') {
        dataStore.readHourRx(time).subscribe(subscriber, error);
    } else if(req.body.type == 'd') {
        dataStore.readDayRx(time).subscribe(subscriber, error);
    } else if(req.body.type == 'm') {
        dataStore.readMonthRx(time).subscribe(subscriber, error);
    } else if(req.body.type == 'y') {
        dataStore.readYearRx(time).subscribe(subscriber, error);
    } else {
        res.json([]);
    }
});



router.post('/now', function(req, res, next) {
    log.i("post : " + req.path);
    res.json(dataStore.getLatestData());
});



module.exports = router;


