/**
 * Created by ice3x2 on 2015. 6. 10..
 */



var app = angular.module('app', ['ngCookies','ngAnimate', 'ngMaterial','angularChart']);


/**Angular Material Config*/
angular.module('app').config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
});


angular.module('app').controller('MainCtrl', function($scope, $mdDialog,$mdToast,$cookies,RestService,WindowEventSvc,
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
                }, time: {
                    axis: 'x',
                    label: true,
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
    //requestStatusList(new Date(),$scope.chart.reference);
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

    function SetDiscomfortIndexThresholdDialogController($scope, $mdDialog) {
        $scope.thresholdDiscomfort = parseInt(_ctrl.thresholdDiscomfort * 10);
        $scope.ok = function(thresholdDiscomfort) {
            requestCtrlSettingBySetDlg($scope, $mdDialog, {thresholdDiscomfort : thresholdDiscomfort / 10});
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }

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
       /* var selectedDate = new Date($scope.chart.select.year,$scope.chart.select.month - 1,$scope.chart.select.date,$scope.chart.select.hours);
        var idx = 0;
        var times = {
            before : 0,
            current : 0,
            next : 0,
            end : 0
        };

        function initTimes(startDate, reference, times) {
            startDate.setMinutes(0); startDate.setMilliseconds(0);
            var endDate, beforeDate, nextDate ;
            if(reference == 'd') {
                startDate.setHours(0);
                endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 1);
                beforeDate.setHours(startDate.getHours() -1);
                nextDate.setHours(startDate.getHours() + 1);
            } else if(reference == 'h') {
                endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
                endDate.setHours(startDate.getHours() + 1);
                beforeDate.setMinutes(startDate.getMinutes() -1);
                nextDate.setMinutes(startDate.getMinutes() + 1);
            } else if(reference == 'm') {
                startDate.setHours(0); startDate.setDate(1);
                endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + 1);
                beforeDate.setDate(startDate.getDate() -1);
                nextDate.setDate(startDate.getDate() + 1);
            } else if(reference == 'y') {
                startDate.setHours(0); startDate.setDate(1); startDate.setMonth(0);
                endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
                endDate.setFullYear(startDate.getFullYear() + 1);
                beforeDate.setMonth(startDate.getMonth() -1);
                nextDate.setMonth(startDate.getMonth() + 1);
            }
            times.before = beforeDate.getTime();
            times.next = nextDate.getTime();
            times.current = startDate.getTime();
            times.end = endDate.getTime();
        }

        function nextTimes(reference,times) {
            times.before = times.current;
            times.current = times.next;
            var currentDate = new Date(times.current);
            var nextDate = new Date(times.current);
            if(reference == 'd') {
                nextDate.setHours(currentDate.getHours() + 1);
            } else if(reference == 'h') {
                nextDate.setMinutes(currentDate.getMinutes() + 1);
                console.log(new Date(times.current).getMinutes());
            } else if(reference == 'm') {
                nextDate.setDate(currentDate.getDate() + 1);
            } else if(reference == 'y') {
                nextDate.setMonth(currentDate.getMonth() + 1);
            }
            times.next = nextDate.getTime();
        }


        console.log('added');
        initTimes(selectedDate,$scope.chart.reference, times);
        var list = [];
        var listIdx = 0;
        var dummy = {time : 0, humidity : 0, power : 0, temperature : 0};
        do {
            if(idx >= statusList.length || times.current < statusList[idx].time) {
                dummy.time = times.current;
                list.push(_.clone(dummy));
            } else {
                list.push(statusList[idx]);
                ++idx;
            }
            if($scope.chart.reference == 'h') {
                list[listIdx].date = new Date(list[listIdx].time).getMinutes();
            }
            else if($scope.chart.reference == 'd') {
                list[listIdx].date = new Date(list[listIdx].time).getHours();
            }
            else if($scope.chart.reference == 'm') {
                list[listIdx].date = new Date(list[listIdx].time).getDate();
            }
            else if($scope.chart.reference == 'y') {
                list[listIdx].date = new Date(list[listIdx].time).getMonth();
            }
            nextTimes($scope.chart.reference, times);
            ++listIdx;
        } while(times.current < times.end)*/


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
                        startDay = (startMonth == selectDate.getMonth())?startDate.getDate():1,
                        endDay = (endMonth == selectDate.getMonth())?endDate.getDate():new Date(selectDate.getFullYear(), selectDate.getMonth() + 1, 0).getDate(),
                        startHour = (startDay == selectDate.getDate())?startDate.getHours():0,
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

});


