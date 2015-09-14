/**
 * Created by ice3x2 on 2015. 9. 13..
 */


var persist = require('node-persist');
var log = include('ColorLog');


const KEY_CONTROL_VALUE = "KEY_CONTROL_VALUE";
const PWM_MIN_POWER = 220;
const PWM_MAX_POWER = 255;
const PWM_MIN_FAN = 220;
const PWM_MAX_FAN = 255;

var ControlValueStore = function () {
    var _controlValue =  {
        minHumidity : 20,
        maxHumidity : 45,
        thresholdDiscomfort : 80,
        power : 100,
        fan : 100
    }
    var _this = this;

    persist.initSync();
    log.i("ControlValueStore::load file");
    var loadedControlValue = persist.getItem(KEY_CONTROL_VALUE);
    log.v(JSON.stringify(_controlValue));
    if(loadedControlValue == undefined) {
        persist.setItem(KEY_CONTROL_VALUE,_controlValue);
        log.i("ControlValueStore::create file");
    } else {
        _controlValue = loadedControlValue;
    }

    this.setMinHumidity = function(value) {
        _controlValue.minHumidity = value;
        return _this;
    };

    this.setMaxHumidity = function(value) {
        _controlValue.maxHumidity = value;
        return _this;
    };

    this.setThresholdDiscomfort = function(value) {
        _controlValue.thresholdDiscomfort = value;
        return _this;
    };


    this.getPowerPWM = function() {
        if(_controlValue.power == 0) return 0;
        return parseInt(map(_controlValue.power,0,100,PWM_MIN_POWER,PWM_MAX_POWER));
    };

    this.getFanPWM = function() {
        if(_controlValue.fan == 0) return 0;
        return parseInt(map(_controlValue.fan,0,100,PWM_MIN_FAN,PWM_MAX_FAN));
    };

    this.setPower = function(value) {

        _controlValue.power = (value > 100)?100:value;
        return _this;
    };
    this.setFan = function(value) {
        _controlValue.fan = (value > 100)?100:value;
        return _this;
    };

    this.commit = function() {
        persist.initSync();
        persist.setItem(KEY_CONTROL_VALUE,_controlValue);
        log.i("ControlValueStore::commit()")
        log.v(JSON.stringify(_controlValue));
    }

    this.getControlValue = function() {
        return _.cloneDeep(_controlValue);
    }

    function map(x,in_min, in_max, out_min, out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }
    return this;
}();

module.exports = ControlValueStore;