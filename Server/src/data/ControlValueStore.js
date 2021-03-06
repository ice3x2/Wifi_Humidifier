/**
 * Created by ice3x2 on 2015. 9. 13..
 */


var persist = require('node-persist');
var log = include('ColorLog');
var path = require('path');

const KEY_CONTROL_VALUE = "KEY_CONTROL_VALUE";
const PWM_MIN_POWER = 120;
const PWM_MAX_POWER = 255;
const PWM_MIN_FAN = 2;
const PWM_MAX_FAN = 255;

const CHECK_DELAY_LIMIT = 60000;
const NIL_VALUE = -100;

var ControlValueStore = function () {
    var _controlValue =  {
        minHumidity : 20,
        maxHumidity : 45,
        thresholdDiscomfort : 80,
        power : 100,
        fan : 100
    };
    var dir = path.join(path.resolve(__properties.database), 'persist') + '';
    var _this = this;
    var _humidificationMode = false;
    var _lastCheckMillis = 0;
    var _lastSendValue = {
        power : 0,
        fan : 0
    };
    persist.initSync({
        dir : dir
    });
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
        _controlValue.minHumidity = value || _controlValue.minHumidity;
        _lastCheckMillis = 0;
        return _this;
    };

    this.getMinHumidity = function() {
        return _controlValue.minHumidity;
    };

    this.setMaxHumidity = function(value) {
        _controlValue.maxHumidity = value || _controlValue.maxHumidity;
        _lastCheckMillis = 0;
        return _this;
    };

    this.getMaxHumidity = function() {
        return _controlValue.maxHumidity;
    };

    this.setThresholdDiscomfort = function(value) {
        _controlValue.thresholdDiscomfort = value || _controlValue.thresholdDiscomfort;
        _lastCheckMillis = 0;
        return _this;
    };

    this.getThresholdDiscomfort = function() {
        return _controlValue.thresholdDiscomfort;
    };

    this.isHumidificationMode = function() {
        return _humidificationMode;
    };

    this.getPWMValue = function(currentTemp, currentHumidity) {
        var value = {};
        var currentDiscomfortIndex = calcDiscomfortIndex(currentTemp,currentHumidity);
        if(currentTemp <= NIL_VALUE || currentHumidity <= NIL_VALUE) {
            return _lastSendValue;
        } else if(currentHumidity > _controlValue.maxHumidity || currentDiscomfortIndex > _controlValue.thresholdDiscomfort ) {
            _humidificationMode = false;
        } else if(currentHumidity <  _controlValue.minHumidity || Date.now() - _lastCheckMillis > CHECK_DELAY_LIMIT) {
            _humidificationMode = true;
        }
        value.power = _humidificationMode?getPowerPWM():0;
        value.fan = _humidificationMode?getFanPWM():0;
        _lastSendValue = _.cloneDeep(value);
        _lastCheckMillis = Date.now();
        return value;
    };



    this.setPower = function(value) {
        if(_.isUndefined(value)) return;
        _controlValue.power = (value > 100)?100:value;
        return _this;
    };

    this.getPower = function() {
        return _controlValue.power;
    };

    this.setFan = function(value) {
        if(_.isUndefined(value)) return;
        _controlValue.fan = (value > 100)?100:value;
        return _this;
    };

    this.getFan = function() {
        return _controlValue.fan;
    };

    this.commitControlValue = function() {
        persist.initSync({
            dir: dir
        });
        persist.setItem(KEY_CONTROL_VALUE,_controlValue);
        log.i("ControlValueStore::commit()")
        log.v(JSON.stringify(_controlValue));
    }

    this.getControlValue = function() {
        return _.cloneDeep(_controlValue);
    }

    function getPowerPWM() {
        if(_controlValue.power == 0) return 0;
        return parseInt(map(_controlValue.power,0,100,PWM_MIN_POWER,PWM_MAX_POWER));
    };

    function getFanPWM() {
        if(_controlValue.fan == 0) return 0;
        return parseInt(map(_controlValue.fan,0,100,PWM_MIN_FAN,PWM_MAX_FAN));
    };

    function map(x,in_min, in_max, out_min, out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }



    function calcDiscomfortIndex(temp,humi) {
        temp = parseFloat(temp);
        humi = parseFloat(humi);
        return toSecondDecimalPlace((1.8*temp)-(0.55*(1-humi/100.0)*(1.8*temp-26))+32);
    }


    function toSecondDecimalPlace(value) {
        return Math.floor(value * 100) / 100;
    }

    return this;
}();

module.exports = ControlValueStore;