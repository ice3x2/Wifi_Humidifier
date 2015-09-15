/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngCookies','ngAnimate', 'ngMaterial']);


/**Angular Material Config*/
angular.module('app').config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
});


angular.module('app').controller('MainCtrl', function($scope, $mdDialog,$mdToast,$cookies,RestService,
                                                      COLOR_INDEX_TEMP,COLOR_INDEX_HUMIDITY,COLOR_INDEX_CT,COLOR_INDEX_DI,COLOR_INDEX_OP,
                                                      COLOR_INDEX_CTRL_ON,COLOR_INDEX_CTRL_OFF,COLOR_INDEX_CTRL_PWM) {
    var _status = {};
    var _ctrl = {};
    var _isRunNoWaterAlert = false;
    var _isAuthed = false;
    var _currentMessageOnToast = '';
    $scope.tempColorIndex = COLOR_INDEX_TEMP;
    $scope.humidityColorIndex = COLOR_INDEX_HUMIDITY;
    $scope.ctColorIndex = COLOR_INDEX_CT;
    $scope.diColorIndex = COLOR_INDEX_DI;
    $scope.opColorIndex = COLOR_INDEX_OP;

    $scope.ctrlDIColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlPowerColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlFanColorIndex = COLOR_INDEX_CTRL_OFF;
    $scope.ctrlHumidityColorIndexColorIndex = COLOR_INDEX_CTRL_OFF;



    $scope.tempValue = 'NC ';
    $scope.humidityValue = 'NC ';
    $scope.diValue = 'NC ';
    $scope.ctValue = 'NC ';

    $scope.isShowLoading = false;

    $cookies.remove('sid');

    requestStatusStartRepeat();
    requestCtrlValue(true);
    changeAuthState(false);
    changeAuthState(false);

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
            $scope.authLockIcon = 'img/ic_lock_open.svg';
            $scope.isShowCtrlButton = true;
            $scope.ctrlDIColorIndex = COLOR_INDEX_DI;
            $scope.ctrlPowerColorIndex = COLOR_INDEX_CTRL_PWM;
            $scope.ctrlFanColorIndex = COLOR_INDEX_CTRL_PWM;
            $scope.ctrlHumidityColorIndex = COLOR_INDEX_CTRL_ON;
            _isAuthed = true;
        } else {
            $scope.authLockIcon = 'img/ic_lock.svg';
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


