/**
 * Created by ice3x2 on 2015. 9. 12..
 */

var SimpleDb = require('simple-node-db');
var persist = require('node-persist');
var log = include('ColorLog');

const KEY_UPDATE_INFO = "KEY_UPDATE_INFO";

const KEY_DATA = "data";


var DBController = function() {
    var DataModel = function(){
        this.temperature = 0;
        this.humidity = 0;
        this.water = 0;
        this.discomfort = 0;
        this.ctrlPower = 0;
        this.ctrlFan = 0;
        this.time = 0;
        this.arvCount = 0;
    };

    var _realTimeDatas = [];
    var _db = new SimpleDb('../../data_base');
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
        _updateInfo.firstUpdateMs = Date.now();
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
        _data.ctrlPower = value || 0;
        return _this;

    };
    /**
     *
     * @param valued 200-255 사이의 값.
     */
    this.putFanPWM = function(value) {
        _data.ctrlFan = value || 0;
        return _this;
    };

    this.putWater = function(value) {
        log.i('DataStore::putWater() -> ' + value);
        _data.water = value;
        return _this;
    };

    this.commitData = function() {
        // 물이 없거나 또는 전원이 꺼져있는 경우.
        if(_data.water <= 0) {
            _data.ctrlFan = 0;
            _data.ctrlPower = 0;
        }
        _data.discomfort = calcDiscomfortIndex(_data.temperature, _data.humidity);
        _data.time = Date.now();
        log.i('DataStore::commit() -> '  + JSON.stringify(_data));
        updateData(_.cloneDeep(_data));
    };

    /**
     * 최근 데이터를 가져온다.
     * @returns {*} connection 이라는 멤버가 추가되었는데, 0 일경우 연결이 끊어진 상태다. 그 밖에 1 : 나쁨, 2 : 보통, 3: 좋음.
     */
    this.getLatestData = function(){
        invalidateOldRealTimeData(Date.now());
        if(_realTimeDatas.length == 0) return {
            connection : 0
        };
        var data = _.cloneDeep(_.takeRight(_realTimeDatas)[0]);
        delete data['arvCount'];
        delete data['ctrlPower'];
        delete data['ctrlFan'];
        if(_realTimeDatas.length > 5) {
            data.connection = '3';
        } else if(_realTimeDatas.length >= 3) {
            data.connection = '2';
        } else {
            data.connection = '1';
        }
        return data;
    }


    this.getFirstUpdateTime = function(){
        return _updateInfo.firstUpdateMs;
    }


    this.readHourRx = function(startTime) {
        startTime = parseInt(startTime / 3600000) * 3600000;
        var endTime = startTime + 3600000;
        return readDataListRx(startTime, endTime).map(function(list) {
            var resultList = _.cloneDeep(list);
            _.forEach(resultList, function(n) {
                delete  n['lastUpdated'];
                delete  n['dateCreated'];
                delete  n['version'];
                n.temperature = toSecondDecimalPlace(n.temperature);
                n.humidity = toSecondDecimalPlace(n.humidity);
                n.ctrlFan  = toSecondDecimalPlace(n.ctrlFan);
                n.ctrlPower  = toSecondDecimalPlace(n.ctrlPower);
                n.discomfort  = toSecondDecimalPlace(n.discomfort);
            });
            return resultList;
        });
    };

    /**
     * 아래로 세 함수(날짜, 월, 년도별) 는 코드 중복이지만, 줄이면 조건문이 더 늘어나게 된다.
     */
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
         sumData.water = 1;
         var count = 0;
         var offset = (offset == undefined)?0:offsetWrapObj.offset;
         for(var i = offset, n = list.length; i < n; ++i) {
             if(list[i].time >= startTime && list[i].time < endTime) {
                 sumData.humidity += parseFloat(list[i].humidity);
                 sumData.temperature += parseFloat(list[i].temperature);
                 sumData.ctrlPower += parseInt(list[i].ctrlPower) || 0;
                 sumData.ctrlFan += parseInt(list[i].ctrlFan) || 0;
                 sumData.discomfort += parseFloat(list[i].discomfort) || calcDiscomfortIndex(list[i].temperature,list[i].humidity);
                 // 물 없음 상태(0) > 전원이 꺼져있는 상태(-1) > 전원 켜짐 상태(1)
                 list[i].water  = list[i].water || 0;
                 sumData.water = (list[i].water == -1)?-1:sumData.water;
                 sumData.water = (list[i].water == 0 || sumData.water == 0)?0:1;
                 sumData.arvCount += list[i].arvCount;
                 count++;
             }
         }
         if(count == 0) {
             return null;
         }
         sumData.humidity = toSecondDecimalPlace(sumData.humidity / count);
         sumData.temperature = toSecondDecimalPlace(sumData.temperature / count);
         sumData.ctrlPower = toSecondDecimalPlace(sumData.ctrlPower / count);
         sumData.ctrlFan = toSecondDecimalPlace(sumData.ctrlFan / count);
         sumData.water = toSecondDecimalPlace(sumData.water / count);
         sumData.discomfort = toSecondDecimalPlace(sumData.discomfort / count);
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

    /**
     * 불쾌지수를 구한다.
     * @param temp 온도
     * @param humi 습도
     * @returns {number} 불쾌지수
     */
    function calcDiscomfortIndex(temp,humi) {
        temp = parseFloat(temp);
        humi = parseFloat(humi);
        return toSecondDecimalPlace((1.8*temp)-(0.55*(1-humi/100.0)*(1.8*temp-26))+32);
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

    function toSecondDecimalPlace(value) {
        return Math.floor(value * 100) / 100;
    }

    return this;

}();



module.exports = DBController;


