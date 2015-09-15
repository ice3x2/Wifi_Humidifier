/**
 * Created by ice3x2 on 2015. 9. 15..
 */

var express = require('express');
var router = express.Router();
var controlValues = include('ControlValueStore');
var dataStore = include('DataStore');// include('DataStore');
var log = include('ColorLog');

const SESSION_FAIL = 0;
const SESSION_EXPIRED = 1;
const SESSION_CONFIRMED = 2;

router.post('/value', function(req, res, next) {
    log.i("post : " + req.path);
    res.json(controlValues.getControlValue());
});

router.post('/setting', function(req, res, next) {
    log.i("post : " + req.path);
    var sessionStatus = checkAuth(req.cookies);
    if(sessionStatus == SESSION_CONFIRMED) {
        controlValues.setMinHumidity(req.body.minHumidity);
        controlValues.setMaxHumidity(req.body.maxHumidity);
        controlValues.setThresholdDiscomfort(req.body.thresholdDiscomfort);
        controlValues.setPower(req.body.power);
        controlValues.setFan(req.body.fan);
        controlValues.commitControlValue();
        res.json({auth : 1});
    } else if(sessionStatus == SESSION_EXPIRED) {
        res.status(401).json({auth : 0});
    } else if(sessionStatus == SESSION_FAIL) {
        res.status(401).json({auth : -1});
    }

});

function checkAuth(cookies) {
    if(_.isUndefined(cookies) || _.isUndefined(cookies.sid)) {
        return SESSION_FAIL;
    }
    return dataStore.renewSession(cookies.sid)?SESSION_CONFIRMED:SESSION_EXPIRED;
}


module.exports = router;


