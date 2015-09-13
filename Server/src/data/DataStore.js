/**
 * Created by ice3x2 on 2015. 9. 12..
 */

var SimpleDb = require('simple-node-db');
var persist = require('node-persist');
var log = include('ColorLog');

const KEY_UPDATE_INFO = "updateInfo";
const KEY_DATA = "data";

var DBController = function() {
    var DataModel = function(){
        this.temperature = 0;
        this.humidity = 0;
        this.warter = 0;
        this.discomfort = 0;
        this.ctrlPower = 0;
        this.ctrlFan = 0;
        this.time = 0;
        this.arvCount = 0;

    };

    var _realTimeDatas = [];
    var _db = new SimpleDb('../../database');
    var _data = new DataModel();
    var _offsetWrap = {
        offset : 0
    }
    var _updateInfo = {
        lastUpdateMs : 0,
    };
    var _this = this;


    persist.initSync();
    var loadedUpdateInfo = persist.getItem(KEY_UPDATE_INFO);
    if(loadedUpdateInfo == undefined || loadedUpdateInfo.lastUpdateMs == undefined) {
        _updateInfo.lastUpdateMs = Date.now();
        persist.setItem(KEY_UPDATE_INFO,_updateInfo);
    } else {
        _updateInfo = loadedUpdateInfo;
    }

    this.getCurrentData = function() {
        return _.cloneDeep(_data);
    };


    /**
     *
     * @param value 실수 형태의 습도 값.
     */
    this.putHumidity = function(value) {
        log.i("DataStore::putHumidity()");
        _data.humidity = value;
        log.v(_data.humidity);
        return _this;
    };

    /**
     *
     * @param value 실수 형태의 습도 값.
     */
    this.putTemperature = function(value) {
        log.i("DataStore::putTemperature()");
        _data.temperature = value;
        log.v(_data.temperature);
        return _this;
    };

    /**
     *
     * @param value 200-255 사이의 값.
     */
    this.putPowerPWM = function(value) {
        _data.ctrlPower = value;
        return _this;

    };
    /**
     *
     * @param valued 200-255 사이의 값.
     */
    this.putFanPWM = function(value) {
        _data.ctrlFan = value;
        return _this;
    };

    this.putWater = function(value) {
        log.i("DataStore::putWater()");
        _data.warter = value;
        log.v(_data.warter);
        return _this;
    };

    this.commitData = function() {
        // 물이 없거나 또는 전원이 꺼져있는 경우.
        if(_data.warter <= 0) {
            _data.ctrlFan = 0;
            _data.ctrlPower = 0;
        }
        _data.time = Date.now();
        log.i('DataStore::commit() -> '  + JSON.stringify(_data))
        updateData(_.cloneDeep(_data));
    };



    this.readHourRx = function(startTime) {
        startTime = parseInt(startTime / 3600000) * 3600000;
        var endTime = startTime + 3600000;
        return readDataListRx(startTime, endTime);

    };
    this.readDayRx = function(startTime) {
        var leftDate = removeHours(new Date(startTime));
        var rightDate = removeHours(new Date(startTime));
        var date = leftDate.getDate();
        _offsetWrap.offset = 0;
        rightDate.setDate(leftDate.getDate() + 1);
        return readDataListRx(leftDate.getTime(),rightDate.getTime()).map(function(list) {
            var resultList = [];
            do{
                var leftTime = leftDate.getTime();
                var rightDate = removeHours(new Date(leftTime));
                rightDate.setHours(leftDate.getHours() + 1);
                var hourData = averageData(list, leftTime, rightDate.getTime(), _offsetWrap);
                if(hourData != null) {
                    hourData.time = leftTime;
                    resultList.push(hourData);
                }
                leftDate = rightDate;
            } while(rightDate.getDate() == date);
            return resultList;
        });
    };

    this.readMonthRx = function(startTime) {
        var leftDate = removeHours(new Date(startTime));
        var rightDate = removeHours(new Date(startTime));
        leftDate.setDate(1);
        rightDate.setDate(1);
        var month = leftDate.getMonth();
        _offsetWrap.offset = 0;
        rightDate.setMonth(leftDate.getMonth() + 1);
        return readDataListRx(leftDate.getTime(),rightDate.getTime()).map(function(list) {
            var resultList = [];
            do{
                var leftTime = leftDate.getTime();
                var rightDate = removeHours(new Date(leftTime));
                rightDate.setDate(leftDate.getDate() + 1);
                var hourData = averageData(list, leftTime, rightDate.getTime(), _offsetWrap);
                if(hourData != null) {
                    hourData.time = leftTime;
                    resultList.push(hourData);
                }
                leftDate = rightDate;
            } while(rightDate.getMonth() == month);
            return resultList;
        });
    };

    this.readYearRx = function(startTime) {
        var leftDate = removeHours(new Date(startTime));
        var rightDate = removeHours(new Date(startTime));
        leftDate.setDate(1); leftDate.setMonth(0);
        rightDate.setDate(1); rightDate.setMonth(0);
        var year = leftDate.getFullYear();
        _offsetWrap.offset = 0;
        rightDate.setMonth(leftDate.getYear() + 1);
        return readDataListRx(leftDate.getTime(),rightDate.getTime()).map(function(list) {
            var resultList = [];
            do{
                var leftTime = leftDate.getTime();
                var rightDate = removeHours(new Date(leftTime));
                rightDate.setDate(1);
                rightDate.setMonth(leftDate.getMonth() + 1);
                var hourData = averageData(list, leftTime, rightDate.getTime(), _offsetWrap);
                if(hourData != null) {
                    hourData.time = leftTime;
                    resultList.push(hourData);
                }
                leftDate = rightDate;
            } while(rightDate.getFullYear() == year);
            return resultList;
        });
    };
    function readDataListRx(startTime, endTime) {
        var startParam = KEY_DATA + ":" + ((startTime == undefined)?appendZero(0):appendZero(startTime));
        var endParam = KEY_DATA + ":" + ((endTime == undefined)?'~':appendZero(endTime - 1));
        var subject = new _rx.AsyncSubject();
        var params_ = {
            start: startParam,
            end: endParam
        };
        var completeCallback = function(err, list) {
            if(err) {
               subject.onError(err);
            }
            subject.onNext(list);
            subject.onCompleted();
        };
        var rowCallback = function(key, value) {
            return value;
        };
        _db.query(params_, rowCallback, completeCallback);
        return subject.asObservable();
    }

    function updateData(data) {
         persist.initSync();
        _updateInfo =  persist.getItem(KEY_UPDATE_INFO);
        var currentMs = Date.now();
        _realTimeDatas.push(data);
        invalidateOldRealTimeData(currentMs);
        // 초를 제거해준다.
        try {
            var currentUpMin = parseInt(currentMs / 60000);
            if(_updateInfo.lastUpdateMs == undefined) {

            }
            var lastUpMin = parseInt(_updateInfo.lastUpdateMs / 60000);
            if (currentUpMin != lastUpMin) {
                var arvData = averageData(_realTimeDatas, lastUpMin * 60000, (lastUpMin * 60000) + 60000, undefined);
                if (arvData != null) {
                    insertData(arvData);
                }
            }
        } catch(err) {
            log.e(err.stack);
        }
        _updateInfo.lastUpdateMs = currentMs;
        persist.setItem(KEY_UPDATE_INFO,_updateInfo);
    }

    function insertData(data) {
        var key = _db.createDomainKey(KEY_DATA, appendZero(data.time));
        var funcThis = this;
        var callback = function(err, model) {
            if (err) {
                log.e(err);
                // 실패할 경우 재시도한다.
                // 주로 lock 이 걸려있는 경우 에러가 발생한다. 이름 그대로 그냥 simple db. 이름값한다.
                timeout(funcThis,1500);
            } else {
                log.i('DataStore::insertData()')
                log.v(JSON.stringify(model));
            }
        };
        _db.insert(key, data, callback);
    }

    /**
     * 데이터들의 평균 값을 분 단위로 구하여 반환한다.
     * @param list 데이터 리스트
     * @param startTime 시작시간
     * @param endTime 종료시간
     * @returns Model 시작시간 <= 데이터 < 종료시간 의 데이터를 가져온다.
     */
    function averageData(list, startTime, endTime, offsetWrapObj) {
         var sumData = new DataModel();
         sumData.warter = 1;
         var count = 0;
         var offset = (offset == undefined)?0:offsetWrapObj.offset;
         for(var i = offset, n = list.length; i < n; ++i) {
             if(list[i].time >= startTime && list[i].time < endTime) {
                 sumData.humidity += list[i].humidity;
                 sumData.temperature += list[i].temperature;
                 sumData.ctrlPower += list[i].ctrlPower;
                 sumData.ctrlFan += list[i].ctrlFan;
                 sumData.discomfort += list[i].discomfort;
                 // 물 없음 상태(0) > 전원이 꺼져있는 상태(-1) > 전원 켜짐 상태(1)
                 sumData.warter = (list[i].warter == -1)?-1:sumData.warter;
                 sumData.warter = (list[i].warter == 0 || sumData.warter == 0)?0:1;
                 sumData.arvCount += list[i].arvCount;
                 count++;
             }
         }
         if(count == 0) {
             return null;
         }
         sumData.humidity = sumData.humidity / count;
         sumData.temperature = sumData.temperature / count;
         sumData.ctrlPower = sumData.ctrlPower / count;
         sumData.ctrlFan = sumData.ctrlFan / count;
         sumData.warter = sumData.warter / count;
         sumData.discomfort = sumData.discomfort / count;
         if(sumData.arvCount == 0) {
             sumData.arvCount = count;
         }
         // 초 단위가 제거된 값을 넣어준다.
         sumData.time = startTime;
         if(offsetWrapObj != undefined) {
             offsetWrapObj.offset += count;
         }
         return sumData;
     }

    /**
     * 현재시간으로부터 1분이 지난 값들은 제거한다.
     * @param currentMs 밀리세컨드. 현재시간.
     */
    function invalidateOldRealTimeData(currentMs) {
        _.remove(_realTimeDatas, function(value) {
            return currentMs - value.time > 60000;
        });
        log.i('dataStore::invalidateOldRealTimeData(' + currentMs + ') -> ' + _realTimeDatas.length);
    }

    function removeHours(dateObj) {
        dateObj.setHours(0);
        dateObj.setMinutes(0);
        dateObj.setSeconds(0);
        dateObj.setMilliseconds(0);
        return dateObj;
    }


    function appendZero(number) {
        var result = number + "";
        var divider = 1000000000000000;
        while(Math.floor(number / divider) == 0) {
            result = "0" + result;
            divider = Math.floor(divider / 10);
        }
        return result;
    }

    return this;

}();



module.exports = DBController;


