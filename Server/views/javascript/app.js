/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngAnimate', 'ngMaterial']);


/**Angular Material Config*/
angular.module('app').config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
});


angular.module('app').controller('MainCtrl', function($scope, $mdDialog,RestService,
                                                      COLOR_INDEX_TEMP,COLOR_INDEX_HUMIDITY,COLOR_INDEX_CT,COLOR_INDEX_DI,COLOR_INDEX_OP) {

    var _status = {};
    var _ctrl = {};
    var _isRunNoWaterAlert = false;


    $scope.tempColorIndex = COLOR_INDEX_TEMP;
    $scope.humidityColorIndex = COLOR_INDEX_HUMIDITY;
    $scope.ctColorIndex = COLOR_INDEX_CT;
    $scope.diColorIndex = COLOR_INDEX_DI;
    $scope.opColorIndex = COLOR_INDEX_OP;

    $scope.tempValue = 'NC ';
    $scope.humidityValue = 'NC ';
    $scope.diValue = 'NC ';
    $scope.ctValue = 'NC ';

    $scope.isShowLoading = false;

    updateStatus();
    updateCtrlValue();
    showOkSession(false);

    $scope.onClickAuthLockButton = function(event) {
        showAuthUnlockDialog(event);
    };


    function showAuthUnlockDialog(event) {
        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'ngDlgAuth',
            //parent: angular.element(document.body),
            targetEvent: event,
            clickOutsideToClose:false,
            escapeToClose : true
        })
        .then(function(answer) {
            $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            $scope.status = 'You cancelled the dialog.';
        });
    }
    function DialogController($scope, $mdDialog) {
        $scope.ok = function(AuthenticationKey) {
            $scope.isShowLoading = true;
            showLoading(true);
            RestService.loginRx(AuthenticationKey).subscribe(function(data) {
                $mdDialog.cancel();
                showLoading(false);
                showOkSession(true);
                $scope.isShowLoading = false;
            }, function(err) {
                $scope.failMessage = true;
                showLoading(false);
                showOkSession(false);
                $scope.isShowLoading = false;
            });
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }

    function showLoading(show) {
        $scope.isShowLoading = show;
    }

    function showOkSession(show) {
        if(show) {
            $scope.authLockIcon = 'img/ic_lock_open.svg';
            console.log($scope.authLockIcon);
        } else {
            $scope.authLockIcon = 'img/ic_lock.svg';
        }

    }


    function updateStatus() {
        RestService.statusRx().subscribe(function (status) {
            $scope.ctValue = status.connection == 3 ? 'Good' : (status.connection == 2) ? 'Normal' : (status.connection == 1) ? 'Bad' : 'NC';
            $scope.tempValue = (status.connection == 0) ? 'NC ' : status.temperature;
            $scope.humidityValue = (status.connection == 0) ? 'NC ' : status.humidity;
            $scope.diValue = (status.connection == 0) ? 'NC ' : status.discomfort;
            $scope.opValue = status.water == -1 ? 'Off' : (status.water == 0) ? 'No water' : (status.water == 1) ? 'On' : 'NC';
            _status = status;
            startShowNoWaterAlert();
        }, function (err) {
            console.log(err);
            $scope.ctValue = 'NC';
            $scope.diValue = 'NC ';
            $scope.tempValue = 'NC ';
            $scope.humidityValue = 'NC ';
            $scope.opValue = 'NC ';
            setTimeout(updateStatus, 5000)

        });
    }

    function updateCtrlValue() {
        RestService.ctrlRx(true).subscribe(function(ctrl) {
            $scope.humiditySettingValue =  (!_.isUndefined(ctrl.minHumidity) && !_.isUndefined(ctrl.maxHumidity))?
            ctrl.minHumidity + '~' +ctrl.maxHumidity : 'NC';
            $scope.powerValue =  ctrl.power || 'NC';
            $scope.fanValue =  ctrl.fan || 'NC';
            _ctrl = ctrl;
            console.log(_ctrl);
        },function(err) {
            console.log(err);
            $scope.powerValue = 'NC';
            $scope.humiditySettingValue = 'NC';
            $scope.fanValue = 'NC';
            setTimeout(updateCtrlValue, 5000)
        });
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
                if(d['value'] == 'No water') {
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


