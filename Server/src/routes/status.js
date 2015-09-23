/**
 * Created by ice3x2 on 2015. 9. 15..
 */

var express = require('express');
var path = require('path');
var router = express.Router();
var dataStore = include('DataStore');
var log = include('ColorLog');
var controlValues = include('ControlValueStore');

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
    var data = dataStore.getLatestData();

    if(data.water == -1) {
        data.operation = 'Off';
    } else if(data.water == 0) {
        data.operation = 'No water';
    }
    else if(data.water == 1 && !controlValues.isHumidificationMode()) {
        data.operation = 'Idle';
    } else if(data.water == 1) {
        data.operation = 'On';
    }

    res.json(data);
});


router.post('/first', function(req, res, next) {
    log.i("post : " + req.path);
    res.json({time : dataStore.getFirstUpdateTime()});
});





module.exports = router;


