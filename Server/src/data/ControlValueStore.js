/**
 * Created by ice3x2 on 2015. 9. 13..
 */


var persist = require('node-persist');
var dataStore = require('./DataStore')
var log = include('ColorLog');


const KEY_CONTROL_VALUE = "updateInfo";

var ControlValueStore = function () {
    var _controlValue =  {
        minHumidity : 20,
        maxHumidity : 45,
        thresholdDiscomfort : 80,
        powerPWM : 255,
        fanPWM : 255,
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

    this.setPowerPWM = function(value) {
        _controlValue.powerPWM = value;
        dataStore.putPowerPWM(value);
        return _this;
    };
    this.setFanPWM = function(value) {
        _controlValue.fanPWM = value;
        dataStore.putFanPWM(value);
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

    return this;
}();

module.exports = ControlValueStore;