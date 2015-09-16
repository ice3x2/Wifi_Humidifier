/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngCookies','ngAnimate', 'ngMaterial','angularChart']);


/**Angular Material Config*/
angular.module('app').config(["$mdThemingProvider", function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
}]);


angular.module('app').controller('MainCtrl', ["$scope", "$mdDialog", "$mdToast", "$cookies", "RestService", "WindowEventSvc", "COLOR_INDEX_TEMP", "COLOR_INDEX_HUMIDITY", "COLOR_INDEX_CT", "COLOR_INDEX_DI", "COLOR_INDEX_OP", "COLOR_INDEX_CTRL_ON", "COLOR_INDEX_CTRL_OFF", "COLOR_INDEX_CTRL_PWM", function($scope, $mdDialog,$mdToast,$cookies,RestService,WindowEventSvc,
                                                      COLOR_INDEX_TEMP,COLOR_INDEX_HUMIDITY,COLOR_INDEX_CT,COLOR_INDEX_DI,COLOR_INDEX_OP,
                                                      COLOR_INDEX_CTRL_ON,COLOR_INDEX_CTRL_OFF,COLOR_INDEX_CTRL_PWM) {










    var MOBILE_WIDTH = 819;


    var _status = {};
    var _ctrl = {};
    var _isRunNoWaterAlert = false;
    var _isAuthed = false;
    var _currentMessageOnToast = '';
    var _startDate = new Date();
    $scope.tempColorIndex = COLOR_INDEX_TEMP;
    $scope.humidityColorIndex = COLOR_INDEX_HUMIDITY;
    $scope.ctColorIndex = COLOR_INDEX_CT;
    $scope.diColorIndex = COLOR_INDEX_DI;
    $scope.opColorIndex = COLOR_INDEX_OP;

    $scope.ctrlDIColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlPowerColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlFanColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlHumidityColorIndexColorIndex = COLOR_INDEX_CTRL_OFF;

    $scope.flexStatusBox = 25;

    $scope.tempValue = 'NC ';
    $scope.humidityValue = 'NC ';
    $scope.diValue = 'NC ';
    $scope.ctValue = 'NC ';

    $scope.isShowLoading = false;

    $scope.chart = {
        select: {
            years: [],
            months: [],
            dates: [],
            hourses: []
        },
        reference: 'd',
        options: {
            data: [],
            dimensions: {
                ctrlPower: {
                    axis: 'y',
                    color: '#F48FB1',
                    type: 'area-step',
                    name: 'power',
                    postfix: '%',
                }, temperature: {
                    axis: 'y2',
                    label: true,
                    postfix: '°C',
                    type: 'spline',
                    color: '#2196F3',
                    name: 'temperature'
                }, humidity: {
                    axis: 'y',
                    label: true,
                    color: '#4A148C',
                    postfix: '%',
                    name: 'humidity',
                    type: 'spline',
                }
            }, axis: {
                y: {
                    max: 99
                },
                y2: {
                    show: false,

                }
            }
        }
    };




    $cookies.remove('sid');

    requestStatusStartRepeat();
    requestFirstStatusUpdateTime();
    requestStatusList(new Date(),$scope.chart.reference);
    requestCtrlValue(true);
    changeAuthState(false);
    changeAuthState(false);

    WindowEventSvc.addResizeCallback(function(newValue) {
        if(newValue.width > MOBILE_WIDTH) {
            $scope.flexStatusBox = 25;
            $scope.isShowConnectionStatusBox = false;
        } else {
            $scope.flexStatusBox = 33
            $scope.isShowConnectionStatusBox = true;
        }
    });

    $scope.onClickAuthLockButton = function(event) {
        if(!_isAuthed) {
            showAuthUnlockDialog(event);
        } else {
            changeAuthState(false);
            RestService.logoutRx().subscribe(function(data) {
               console.log(data);
            }, function(err) {
                console.log(err);
            });
         }
    };

    $scope.onChangeDateSelect = function() {
        var selectedDate = new Date($scope.chart.select.year,$scope.chart.select.month - 1,$scope.chart.select.date,$scope.chart.select.hours);
        invalidDateSelect(_startDate,selectedDate);
        requestStatusList(selectedDate, $scope.chart.reference);
    };


    $scope.onClickHumiditySetting = function(event) {
        console.log(event);
        showSetHumidityDialog(event);
    };

    $scope.onClickPowerPwmSetting = function(event) {
        console.log(event);
        showSetPowerPWMDialog(event);
    };

    $scope.onClickDiscomfortIndexThresholdSetting = function(event) {
        console.log(event);
        showSetDiscomfortIndexThresholdDialog(event);
    };



    function changeAuthState(show) {
        if(show) {
            $scope.authLockIcon = 'img/ic_lock_open_white_48px.svg';
            $scope.isShowCtrlButton = true;
            $scope.ctrlDIColorIndex = COLOR_INDEX_DI;
            $scope.ctrlPowerColorIndex = COLOR_INDEX_CTRL_PWM;
            $scope.ctrlFanColorIndex = COLOR_INDEX_CTRL_PWM;
            $scope.ctrlHumidityColorIndex = COLOR_INDEX_CTRL_ON;
            _isAuthed = true;
        } else {
            $scope.authLockIcon = 'img/ic_lock_white_48px.svg';
            _isAuthed = false;
            $scope.isShowCtrlButton = false;
            $scope.ctrlDIColorIndex = COLOR_INDEX_CTRL_OFF;
            $scope.ctrlPowerColorIndex = COLOR_INDEX_CTRL_OFF;
            $scope.ctrlFanColorIndex = COLOR_INDEX_CTRL_OFF;
            $scope.ctrlHumidityColorIndex = COLOR_INDEX_CTRL_OFF;


        }
    }




    function showAuthUnlockDialog(event) {
        $mdDialog.show({
            controller: AuthDialogController,
            templateUrl: 'ngDlgAuth',
            //parent: angular.element(document.body),
            targetEvent: event,
            clickOutsideToClose:false,
            escapeToClose : true
        });
    }

    function showSetHumidityDialog(event) {
        $mdDialog.show({
            controller: SetHumidityDialogController,
            templateUrl: 'ngDlgHumiditySetting',
            targetEvent: event,
            clickOutsideToClose:false,
            escapeToClose : true
        });
    }

    function showSetDiscomfortIndexThresholdDialog(event) {
        $mdDialog.show({
            controller: SetDiscomfortIndexThresholdDialogController,
            templateUrl: 'ngDlgDIThresholdSet',
            targetEvent: event,
            clickOutsideToClose:false,
            escapeToClose : true
        });
    }

    function showSetPowerPWMDialog(event) {
        $mdDialog.show({
            controller: SetSetPowerPWMDialogController,
            templateUrl: 'ngDlgPowerPwmSet',
            targetEvent: event,
            clickOutsideToClose:false,
            escapeToClose : true
        });
    }

    function AuthDialogController($scope, $mdDialog) {
        $scope.ok = function(AuthenticationKey) {
            $scope.isShowLoading = true;
            setPageClickEventLock(true);
            RestService.loginRx(AuthenticationKey).subscribe(function(data) {
                $mdDialog.cancel();
                setPageClickEventLock(false);
                changeAuthState(true);
                $scope.isShowLoading = false;
            }, function(err) {
                $scope.failMessage = true;
                $scope.isShowLoading = false;
                setPageClickEventLock(false);
                changeAuthState(false);
            });
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }
    AuthDialogController.$inject = ["$scope", "$mdDialog"];


    function SetHumidityDialogController($scope, $mdDialog) {
        $scope.humidity = {
            min : parseInt(_ctrl.minHumidity),
            max : parseInt(_ctrl.maxHumidity)
        };
        $scope.onChangeValue = function(type) {
            if(type == 'min' && $scope.humidity.max < $scope.humidity.min ) {
                $scope.humidity.min = $scope.humidity.max;
                showToast('Min humidity is not greater than Max humidity.');
            } else if($scope.humidity.max < $scope.humidity.min ) {
                $scope.humidity.max = $scope.humidity.min;
                showToast('Max humidity ​​can not be less than the Min humidity.');
            }
        };
        $scope.ok = function(humidity) {
            var params = {
                minHumidity : humidity.min,
                maxHumidity : humidity.max
            };
            requestCtrlSettingBySetDlg($scope, $mdDialog, params);
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }
    SetHumidityDialogController.$inject = ["$scope", "$mdDialog"];

    function SetDiscomfortIndexThresholdDialogController($scope, $mdDialog) {
        $scope.thresholdDiscomfort = parseInt(_ctrl.thresholdDiscomfort * 10);
        $scope.ok = function(thresholdDiscomfort) {
            requestCtrlSettingBySetDlg($scope, $mdDialog, {thresholdDiscomfort : thresholdDiscomfort / 10});
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }
    SetDiscomfortIndexThresholdDialogController.$inject = ["$scope", "$mdDialog"];

    function SetSetPowerPWMDialogController($scope, $mdDialog) {
        $scope.power = {
            power : _ctrl.power,
            fan : _ctrl.fan
        };
        $scope.ok = function(power) {
            requestCtrlSettingBySetDlg($scope, $mdDialog,power);
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }
    SetSetPowerPWMDialogController.$inject = ["$scope", "$mdDialog"];


    function requestCtrlSettingBySetDlg($scope, $mdDialog,params) {
        setPageClickEventLock(true);
        RestService.ctrlSetRx(params).subscribe(function(data) {
            $scope.isShowLoading = true;
            $mdDialog.cancel();
            setPageClickEventLock(false);
            requestCtrlValue(false);
            $scope.isShowLoading = false;
        }, function(err) {
            console.log(err);
            setPageClickEventLock(false);
            changeAuthState(false);
            $scope.isShowLoading = false;
            if(err.auth <= 0) {
                changeAuthState(false);
                showToast('session expired.');
            } else {
                showToast('Connection error.');
            }
            $mdDialog.cancel();
        });
    }






    function setPageClickEventLock(show) {
        $scope.isShowLoading = show;
    }


    function requestStatusStartRepeat() {
        RestService.statusNowByIntervalRx().subscribe(function (status) {
            $scope.styleConnectionStatusFontColor = {color:'#aaaaaa'}
            $scope.ctValue = status.connection == 3 ? 'Good' : (status.connection == 2) ? 'Normal' : (status.connection == 1) ? 'Bad' : 'NC';
            $scope.styleConnectionStatusFontColor.color =  status.connection == 3?'#0BA320' : (status.connection == 2) ? '#F29900' : (status.connection == 1) ? '#FF5900' : '#aaaaaa';
            $scope.tempValue = (status.connection == 0) ? 'NC ' : status.temperature;
            $scope.humidityValue = (status.connection == 0) ? 'NC ' : status.humidity;
            $scope.diValue = (status.connection == 0) ? 'NC ' : status.discomfort;
            $scope.opValue = status.water == -1 ? 'Off' : (status.water == 0) ? 'Water' : (status.water == 1) ? 'On' : 'NC';
            _status = status;
            startShowNoWaterAlert();
        }, function (err) {
            console.log(err);
            $scope.ctValue = 'NC';
            $scope.diValue = 'NC ';
            $scope.tempValue = 'NC ';
            $scope.humidityValue = 'NC ';
            $scope.opValue = 'NC ';
            setTimeout(requestStatusStartRepeat, 5000)

        });
    }

    function requestCtrlValue(isRepeat) {
        if(_.isUndefined(isRepeat)) {
            isRepeat = true;
        }
        RestService.ctrlValueRx(isRepeat).subscribe(function(ctrl) {
            $scope.humiditySettingValue =  (!_.isUndefined(ctrl.minHumidity) && !_.isUndefined(ctrl.maxHumidity))?
            ctrl.minHumidity + '~' +ctrl.maxHumidity : 'NC';
            $scope.powerValue =  ctrl.power || 'NC';
            $scope.fanValue =  ctrl.fan || 'NC';
            $scope.DISettingValue = ctrl.thresholdDiscomfort || 'NC';
            _ctrl = ctrl;
        },function(err) {
            console.log(err);
            $scope.powerValue = 'NC';
            $scope.humiditySettingValue = 'NC';
            $scope.fanValue = 'NC';
            $scope.DISettingValue = 'NC';
            if(_.isUndefined(err.auth) && isRepeat === true) {
                setTimeout(function () {
                    requestCtrlValue(isRepeat), 5000
                });
            }
        });
    }

    function requestStatusList(_selectDate,_type) {
        RestService.statusListRx({time : _selectDate.getTime(), type : _type  }).subscribe(function(data) {
            invalidChart(data);
        },function(data) {
            setTimeout(function() {
                requestStatusList(_selectDate,_type);
            }, 4000);
        });
    }


    function requestFirstStatusUpdateTime() {
        RestService.statusFirstUpdateTimeRx().subscribe(function(data) {
            _startDate = new Date(data.time);
            invalidDateSelect(_startDate);
        }, function(err) {
           setTimeout(function() {
               requestFirstStatusUpdateTime();
           }, 4000);
        });
    }

    function invalidChart(statusList) {
        console.log(statusList);
        $scope.chart.options.data = statusList;

        $scope.chart.options.data = statusList;
    }


    function invalidDateSelect(_startDate, selectDate) {
        selectDate = selectDate || new Date();
        console.log(selectDate);
        var startDate = new Date(_startDate);
        var endDate = new Date();
        var startYear = startDate.getFullYear(), endYear = endDate.getFullYear(),
                        endMonth = endDate.getMonth(),
                        startMonth = (endYear == startYear)?startDate.getMonth(): 0,
                        startDay = (startMonth == endMonth)?startDate.getDate():1,
                        endDay = (endMonth == selectDate.getMonth())?endDate.getDate():new Date(selectDate.getFullYear(), selectDate.getMonth() + 1, 0).getDate(),
                        startHour = (startDay == endDay)?startDate.getHours():0,
                        endHour = (endDay ==selectDate.getDate())?endDate.getHours():23;

        startMonth++; endMonth++;
        $scope.chart.select.years = []; $scope.chart.select.months = [];
        $scope.chart.select.dates = []; $scope.chart.select.hourses = [];
        do {
            $scope.chart.select.years.push(startYear++);
        }  while(startYear <= endYear);
        do {
            $scope.chart.select.months.push(startMonth++);
        } while(startMonth <= endMonth);
        do {
            $scope.chart.select.dates.push(startDay++);
        }  while(startDay <= endDay);
        do {
            $scope.chart.select.hourses.push(startHour++);
        }  while(startHour <= endHour);
        $scope.chart.select.year = selectDate.getFullYear();
        $scope.chart.select.month = selectDate.getMonth() +1;
        $scope.chart.select.date = selectDate.getDate();
        $scope.chart.select.hours = selectDate.getHours();

    }


    function showToast(message) {
        if(message == _currentMessageOnToast) {
            return;
        }
        _currentMessageOnToast = message;
        var hideDelay = 3000;
        $mdToast.cancel(false);
        $mdToast.show(
            $mdToast.simple()
                .content(message)
                .position('bottom right')
                .hideDelay(hideDelay)
        );

        setTimeout(function() {
            if(message == _currentMessageOnToast) {
                _currentMessageOnToast = '';
            }
        },hideDelay);
    }


    function startShowNoWaterAlert() {
        if(!_isRunNoWaterAlert) {
            runNoWaterAlert();
            _isRunNoWaterAlert = true;
        }
    }


    function runNoWaterAlert() {
        var changeCount = 0;
        if(_status.water == 0) {
            _.find($scope.opColorIndex, function(d,i) {
                if(d['value'] == 'Water') {
                    d.changed = d.changed || 0;
                    changeCount = d.changed;
                    d.color = (d.changed % 2 == 0)?'#FF3300':'#aaaaaa';
                    $scope.opColorIndex = _.clone($scope.opColorIndex);
                    if(changeCount > 0) {
                        $scope.$apply();
                    }
                    ++$scope.opColorIndex[i].changed;
                    return true;
                }
                return false;
            });
            setTimeout(runNoWaterAlert,(changeCount % 2 == 0)?700:200);
        } else {
            _isRunNoWaterAlert = false;
        }
    }

}]);



/**
 * Created by ice3x2 on 2015. 9. 15..
 */

angular.module('app').constant('COLOR_INDEX_TEMP',

    [ {
        value : -10000,
        color : '#2170B5'
    },{
        value : 0,
        color : '#1165ED',
    },{
        value : 5,
        color : '#11A4ED',
    },{
        value : 10,
        color : '#0EC4BB',
    },{
        value : 15,
        color : '#10B068',
    },{
        value : 20,
        color : '#73C91C',
    },{
        value : 28,
        color : '#0BA320',
    },{
        value : 30,
        color : '#E05C04',
    },{
        value : 35,
        color : '#FF4D00',
    },{
        value : 1000,
        color : '#E00404',
    },{
        value : 'NC ',
        color : '#aaaaaa',
    }]

);

angular.module('app').constant('COLOR_INDEX_HUMIDITY',
    [ {
        value : 0,
        color : '#6100F2'
    },{
        value : 10,
        color : '#8900F2',
    },{
        value : 20,
        color : '#0041F2',
    },{
        value : 40,
        color : '#F29900',
    },{
        value : 60,
        color : '#0BA320',
    },{
        value : 80,
        color : '#F23D00',
    },{
        value : 100,
        color : '#F23D00',
    },{
        value : 'NC ',
        color : '#aaaaaa',
    }]
);

angular.module('app').constant('COLOR_INDEX_DI',
    [ {
        value : 0,
        color : '#0BA320'
    },{
        value : 70,
        color : '#0BA320',
    },{
        value : 75,
        color : '#0BA3A3',
    },{
        value : 80,
        color : '#F29900',
    },{
        value : 83,
        color : '#FF5900',
    },{
        value : 100,
        color : '#F23D00',
    },{
        value : 'NC ',
        color : '#aaaaaa',
    }]
);
angular.module('app').constant('COLOR_INDEX_CT',
    [{
        value : 'Good',
        color : '#0BA320'
    },{
        value : 'Normal',
        color : '#F29900',
    },{
        value : 'Bad',
        color : '#FF5900',
    },{
        value : 'NC',
        color : '#aaaaaa',
    }]
);


angular.module('app').constant('COLOR_INDEX_DI',
    [ {
        value : 0,
        color : '#0BA320'
    },{
        value : 70,
        color : '#0BA320',
    },{
        value : 75,
        color : '#0BA3A3',
    },{
        value : 80,
        color : '#F29900',
    },{
        value : 83,
        color : '#FF5900',
    },{
        value : 100,
        color : '#F23D00',
    },{
        value : 'NC ',
        color : '#aaaaaa',
    }]
);


angular.module('app').constant('COLOR_INDEX_OP',
    [{
        value : 'Water',
        color : '#F23D00'
    },{
        value : 'On',
        color : '#0BA320',
    },{
        value : 'Off',
        color : '#111111',
    },{
        value : 'default',
        color : '#aaaaaa',
    }]
);



angular.module('app').constant('COLOR_INDEX_CTRL_ON',
    [{
        value : 'default',
        color : '#13A88F',
    }]
);

angular.module('app').constant('COLOR_INDEX_CTRL_OFF',
    [{
        value : 'default',
        color : '#454545',
    }]
);


angular.module('app').constant('COLOR_INDEX_CTRL_PWM',

    [{
        value : 0,
        color : '#1A2422',
    },{
        value : 10,
        color : '#2B3836',
    },{
        value : 20,
        color : '#424A49',
    },{
        value : 30,
        color : '#5B6966',
    },{
        value : 40,
        color : '#6B7D7A',
    },{
        value : 50,
        color : '#81A19B',
    },{
        value : 60,
        color : '#7DA8A1',
    },{
        value : 70,
        color : '#67A69B',
    },{
        value : 80,
        color : '#52A89A',
    },{
        value : 90,
        color : '#3DA896',
    },{
        value : 100,
        color : '#13A88F',
    }]
);

/**
 * Created by ice3x2 on 2015. 7. 15..
 */

angular.module('app').service('RestService', ["$http", function($http) {

    this.ctrlValueRx = function (isRepeat) {
        var getCtrlValue = function() {
            var subject = new Rx.AsyncSubject();
            $http.post('/ctrl/value').success(function (res) {
                subject.onNext(res);
                subject.onCompleted();
            }).error(function (err) {
                subject.onError(err);
            });
            return subject.asObservable();
        }
        if(isRepeat === true) {
            return Rx.Observable.timer(0, 10000).timeInterval().flatMap(function() {
                return new getCtrlValue();
            });
        } else {
            return new getCtrlValue();
        }
    };

    this.ctrlSetRx = function (params) {
        var subject = new Rx.AsyncSubject();
        $http.post('/ctrl/setting',params).success(function (res) {
            subject.onNext(res);
            subject.onCompleted();
        }).error(function (err) {
            subject.onError(err);
        });
        return subject.asObservable();
    };

    this.statusFirstUpdateTimeRx = function (params) {
        var subject = new Rx.AsyncSubject();
        $http.post('/status/first',params).success(function (res) {
            subject.onNext(res);
            subject.onCompleted();
        }).error(function (err) {
            subject.onError(err);
        });
        return subject.asObservable();
    };

    this.statusNowByIntervalRx = function () {
        return Rx.Observable.timer(0, 5000).timeInterval().flatMap(function() {
            var subject = new Rx.AsyncSubject();
            $http.post('/status/now').success(function (res) {
                subject.onNext(res);
                subject.onCompleted();
            }).error(function (err) {
                subject.onError(err);
            });
            return subject.asObservable();
        });
    };

    this.loginRx = function(loginKey) {
        var keySubject = new Rx.AsyncSubject();
        $http.post('/auth/key').success(function (res) {
            keySubject.onNext(res);
            keySubject.onCompleted();
        }).error(function (err) {
            keySubject.onError(err);
        });
        return keySubject.asObservable().flatMap(function(res) {
            var hashString = CryptoJS.HmacSHA256(loginKey, res.key).toString();
            var param = {key : hashString};
            var loginSubject = new Rx.AsyncSubject();
            $http.post('/auth/login',param).success(function (res) {
                loginSubject.onNext(res);
                loginSubject.onCompleted();
            }).error(function (err) {
                loginSubject.onError(err);
            });
            return loginSubject.asObservable();
        });
    };

    this.logoutRx = function() {
        var keySubject = new Rx.AsyncSubject();
        $http.post('/auth/logout').success(function (res) {
            keySubject.onNext(res);
            keySubject.onCompleted();
        }).error(function (err) {
            keySubject.onError(err);
        });
        return keySubject.asObservable();
    };


    /**
     * DB 에 기록된 상태값들의 리스트를 가져온다.
     * @param param  type = y:년|m:월|d:날짜|h:시간, time = 기준 시간의 milliseconds
     * @returns {*} subscribe -> 시간 오름차순으로 정렬된 status 의 리스트.
     */
    this.statusListRx = function (param) {
        var subject = new Rx.AsyncSubject();
        $http.post('/status/list',param).success(function (res) {
            subject.onNext(res);
            subject.onCompleted();
        }).error(function (err) {
            subject.onError(err);
        });
        return subject.asObservable();
    }
}]);
/**
 * Created by ice3x2 on 2015. 6. 28..
 */

angular.module('app').service('WindowEventSvc', ["$window", function($window) {

    var _resizeCallbacksFunc = [],
        _windowEle = angular.element($window),
        end_ = null;

    var _oldValue = {
        width : 0,
        height : 0
    }
    var _newValue = {
        width : 0,
        height : 0
    }

    _windowEle.ready(resizeCallback);
    _windowEle.resize(resizeCallback);

    var resizeTimeoutIdFast = null;
    var resizeTimeoutIdDelay = null;

    function resizeCallback() {
        if (resizeTimeoutIdFast) {
            window.clearTimeout(resizeTimeoutIdFast);
        }
        if (resizeTimeoutIdDelay) {
            window.clearTimeout(resizeTimeoutIdDelay);
        }
        resizeAction();
        resizeTimeoutIdFast = window.setTimeout(resizeAction, 5);
        // 확인사살.. ㅡ , ㅡ;;
        resizeTimeoutIdDelay = window.setTimeout(resizeAction, 500);
    }

    function resizeAction() {
        _oldValue.width = _newValue.width;
        _oldValue.height = _newValue.height;
        _newValue.width = _windowEle.width();
        _newValue.height = _windowEle.height();
        _.forEach(_resizeCallbacksFunc, function(callbackFunc) {
            callbackFunc(_newValue,_oldValue);
        });
    }



    this.addResizeCallback = function(callbackFunc) {
        _resizeCallbacksFunc.push(callbackFunc);
    }

    this.removeResizeCallback = function(callbackFunc) {
        _.remove(_resizeCallbacksFunc, function(n) {
          return n === callbackFunc;
        });
    };

    this.getWidth = function() {
        return _windowEle.width();
    }

    this.getHeight = function() {
        return _windowEle.height();
    }








}]);
/**
 * Created by ice3x2 on 2015. 9. 14..
 */

angular.module('app').directive('ngChart', ["WindowEventSvc", function (WindowEventSvc) {
    return {
        replace: true,
        scope: {

        },
        transclude: true,
        restrict: 'E',
        templateUrl: 'ngChart',
        link: function (scope, element, attrs) {



        }
    }
}]);

/**
 * Created by ice3x2 on 2015. 9. 15..
 */
angular.module('app').directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});
/**
 * Created by love on 2015. 7. 2..
 */


angular.module('app').directive('ngLoading', ["$animate", function ($animate) {
    return {
        replace : true,
        scope : {
            ngShowLoading : '=?'
        },
        transclude : true,
        restrict: 'E',
        templateUrl: 'ngLoading',
        link: function(scope, element, attrs) {
            scope.$watch('ngShowLoading', function(value) {
                scope.isShow = value;
            });

            scope.onClickBlock = function($event) {
                $event.stopPropagation();
            }


        }
    }

}]);
/**
 * Created by ice3x2 on 2015. 9. 14..
 */

angular.module('app').directive('ngStatusBox', ["WindowEventSvc", function (WindowEventSvc) {
    return {
        replace: true,
        scope: {
            title: '@',
            value: '=?',
            colorIndex: '=?',
            unit: '@'
        },
        transclude: true,
        restrict: 'E',
        templateUrl: 'ngStatusBox',
        link: function (scope, element, attrs) {
            var FONT_SIZE = 38;
            var TITLE_SIZE = 12;
            var MAX_WIDTH = 1024;

            scope.title = scope.title || 'title';
            scope.value = scope.value || '0';
            scope.colorIndex = scope.colorIndex || [];
            var _boxElement =  element.find('.statusBox');
            var _titleElement =  element.find('.titleBox');

            resizeBox(screen.width)
            invalidBackgroundColors(scope.value);

            WindowEventSvc.addResizeCallback(function(newValue) {
                resizeBox(newValue.width);
            });


            scope.$watch('value',function(data) {
                invalidBackgroundColors(data);
            });
            scope.$watch('colorIndex',function(data) {
                invalidBackgroundColors(scope.value);
            });

            function resizeBox(windowWidth) {
                _boxElement.height(_boxElement.width());
                if(windowWidth < 720) {
                    _boxElement.css('font-size',Math.floor(windowWidth / MAX_WIDTH* FONT_SIZE) + 'pt');
                    var titleFontSize = Math.floor(windowWidth / MAX_WIDTH * TITLE_SIZE);
                    _titleElement.css('font-size',titleFontSize < 9?9:titleFontSize + 'pt');
                } else {
                    _boxElement.css('font-size',FONT_SIZE + 'pt');
                    _titleElement.css('font-size',TITLE_SIZE + 'pt');
                }
            }


            function invalidBackgroundColors(value) {
                for(var i = 0, n = scope.colorIndex.length; i < n;++i) {
                    var nextValue = (i + 1 == n) ? Number.MAX_SAFE_INTEGER : scope.colorIndex[i].value;
                    var currentValue = scope.colorIndex[i].value;
                    if(_.isString(scope.value)) {
                        if (currentValue == value) {
                            scope.styleStatusBoxText = {'color': scope.colorIndex[i].color};
                            return;
                        }
                    }  else {
                        if (currentValue >= value && nextValue > value) {
                            scope.styleStatusBoxText = {'color': scope.colorIndex[i].color};
                            return;
                        }
                    }
                }
                var color = '#454545';
                _.find(scope.colorIndex, function(obj) {
                    if(obj['value'] == 'default') {
                        color = obj['color']
                        return true;
                    }
                    return false;
                });
                scope.styleStatusBoxText = {'color': color};
            }




        }
    }
}]);
