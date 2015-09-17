

var app = angular.module('app', ['ngCookies','ngAnimate', 'ngMaterial','angularChart','angular-spinkit']);


/**Angular Material Config*/
angular.module('app').config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
});


angular.module('app').controller('MainCtrl', function($scope, $mdDialog,$mdToast,$cookies,
                                                      RestService,WindowEventSvc,StatusListNormalizer,
                                                      COLOR_INDEX_TEMP,COLOR_INDEX_HUMIDITY,COLOR_INDEX_CT,COLOR_INDEX_DI,COLOR_INDEX_OP,
                                                      COLOR_INDEX_CTRL_ON,COLOR_INDEX_CTRL_OFF,COLOR_INDEX_CTRL_PWM) {

    var MOBILE_WIDTH = 819;


    var _temperatureChartIndex = 0;
    var _chartLabelIntervalPoint = 1;
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

    // 쿠키로부터 세션 정보 삭제.
    $cookies.remove('sid');

    // 1초간의 딜레이를 주는 이유는, 그냥 로딩 화면을 더 보여주고 싶어서.
    // 또한 Angular.js 롤 통한 화면 랜더링이 완료되지 않은 상테에서 데이터 출력을 할 수 없기 때문에 딜레이를 설정한다.
    setTimeout(function() {
        initChartOptions();
        changeAuthState(false);
        requestStatusList(new Date(),$scope.chart.reference);
        requestStatusStartRepeat();
        requestFirstStatusUpdateTime();
        requestCtrlValue(true);

    },1000);

    var checkLoadingStatus = function() {
        if(!_.isUndefined(_status.humidity)) {
            $scope.isHideLoadingScene = true;
        } else {
            setTimeout(checkLoadingStatus, 100);
        }
    };
    setTimeout(checkLoadingStatus,100);

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
        //console.log($scope.chart.select.hours);

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

    function initChartOptions() {

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
                    ctrlPower: { axis: 'y',  color: '#F48FB1',  type: 'area-step',  name: 'power',  postfix: '%', },
                    temperature: { axis: 'y2',  label: true,  postfix: '°C',  type: 'spline',  color: '#2196F3',  name: 'temperature'
                    }, humidity: { axis: 'y', label: true,  color: '#4A148C', postfix: '%', name: 'humidity', type: 'spline',
                    }, date: { axis: 'x', label: true, }
                }, override: { axis: { y: { max: 99, },  y2: { show: false, } }
                }}};



        _.set($scope.chart.options.override, 'data.labels.format.temperature', function(data,key,idx, j) {
            if(!_.isNull(data)) {
                if(_temperatureChartIndex % _chartLabelIntervalPoint == 0) {
                    ++_temperatureChartIndex;
                    return data + '°C';
                }
                ++_temperatureChartIndex;
                return;
            }
            _temperatureChartIndex = 0;
        });
        var _humidityChartIndex = 0;
        _.set($scope.chart.options.override, 'data.labels.format.humidity', function(data,key,idx, j) {
            if(!_.isNull(data)) {
                if(_humidityChartIndex % _chartLabelIntervalPoint == 0) {
                    ++_humidityChartIndex;
                    return data + '%';
                }
                ++_humidityChartIndex;
                return;
            }
            _humidityChartIndex = 0;
        });

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
        //var scrolled = document.body.scrollTop;
        //데이터가 바뀌면 스크롤이 0 으로 되어버리는 현상이 나타남.
        $scope.chart.options.data = StatusListNormalizer.normalizeStatusList(statusList, $scope.chart.reference,
            new Date($scope.chart.select.year,$scope.chart.select.month - 1,$scope.chart.select.date,$scope.chart.select.hours));

        console.log('chart set');
        console.log(document);

        /*document.body.scrollTop = scrolled;
        setTimeout(function() {
            document.body.scrollTop = scrolled;
        },0);*/

    }


    function invalidDateSelect(_startDate, selectDate) {
        var reference = $scope.chart.reference;
        _chartLabelIntervalPoint = (reference == 'h')?8:(reference == 'd' || reference == 'm')?4:2;
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
        var years = [], months = [], hourses = [],dates = [];
        do {
            years.push(startYear++);
        }  while(startYear <= endYear);
        do {
            months.push(startMonth++);
        } while(startMonth <= endMonth);
        do {
            dates.push(startDay++);
        }  while(startDay <= endDay);
        do {
            hourses.push(startHour++);
        }  while(startHour <= endHour);
        $scope.chart.select.years = years; $scope.chart.select.months = months;
        $scope.chart.select.dates = dates; $scope.chart.select.hourses = hourses;
        $scope.chart.select.year =  selectDate.getFullYear() + '';
        $scope.chart.select.month = (selectDate.getMonth() +1) + '';
        $scope.chart.select.date = selectDate.getDate() + '';
        $scope.chart.select.hours =  selectDate.getHours() + '';
        console.log($scope.chart);
        // 선택된 selector 를 붉은색으로 만든다.
        $scope.chart.select.styleYear =  $scope.chart.select.styleMonth = $scope.chart.select.styleDate = $scope.chart.select.styleHours = {'background-color' : '#ffffff'};
        var selectedColor = {'background-color' : '#455A64', color : '#ffffff'};
        if(reference == 'y') $scope.chart.select.styleYear = selectedColor;
        if(reference == 'm') $scope.chart.select.styleMonth = selectedColor;
        if(reference == 'd') $scope.chart.select.styleDate =  selectedColor;
        if(reference == 'h') $scope.chart.select.styleHours = selectedColor;

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


