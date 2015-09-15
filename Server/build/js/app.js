/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngAnimate', 'ngMaterial']);


/**Angular Material Config*/
angular.module('app').config(["$mdThemingProvider", function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('teal');
}]);


angular.module('app').controller('MainCtrl', ["$scope", "$mdDialog", "RestService", "COLOR_INDEX_TEMP", "COLOR_INDEX_HUMIDITY", "COLOR_INDEX_CT", "COLOR_INDEX_DI", "COLOR_INDEX_OP", function($scope, $mdDialog,RestService,
                                                      COLOR_INDEX_TEMP,COLOR_INDEX_HUMIDITY,COLOR_INDEX_CT,COLOR_INDEX_DI,COLOR_INDEX_OP) {
    var _status = {};
    var _ctrl = {};
    var _isRunNoWaterAlert = false;
    var _isAuthed = false;

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
    changeAuthedState(false);

    $scope.onClickAuthLockButton = function(event) {
        if(!_isAuthed) {
            showAuthUnlockDialog(event);
        } else {
            changeAuthedState(false);
            RestService.logoutRx().subscribe(function(data) {
               console.log(data);
            }, function(err) {
                console.log(err);
            });

         }
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
                changeAuthedState(true);
                $scope.isShowLoading = false;
            }, function(err) {
                $scope.failMessage = true;
                showLoading(false);
                changeAuthedState(false);
                $scope.isShowLoading = false;
            });
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        }
    }
    DialogController.$inject = ["$scope", "$mdDialog"];

    function showLoading(show) {
        $scope.isShowLoading = show;
    }

    function changeAuthedState(show) {
        if(show) {
            $scope.authLockIcon = 'img/ic_lock_open.svg';
            _isAuthed = true;
        } else {
            $scope.authLockIcon = 'img/ic_lock.svg';
            _isAuthed = false;
        }
    }


    function updateStatus() {
        RestService.statusNowRx().subscribe(function (status) {
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
        RestService.ctrlValueRx(true).subscribe(function(ctrl) {
            $scope.humiditySettingValue =  (!_.isUndefined(ctrl.minHumidity) && !_.isUndefined(ctrl.maxHumidity))?
            ctrl.minHumidity + '~' +ctrl.maxHumidity : 'NC';
            $scope.powerValue =  ctrl.power || 'NC';
            $scope.fanValue =  ctrl.fan || 'NC';
            _ctrl = ctrl;
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
        value : 'No water',
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


/**
 * Created by ice3x2 on 2015. 7. 15..
 */

angular.module('app').service('RestService', ["$http", function($http) {

    this.ctrlValueRx = function (isRepeat) {
        function getCtrlValue() {
            var subject = new Rx.AsyncSubject();
            $http.post('/ctrl/value').success(function (res) {
                subject.onNext(res);
                subject.onCompleted();
            }).error(function (err) {
                subject.onError(err);
            });
            return subject.asObservable();
        }
        if(isRepeat) {
            return Rx.Observable.timer(0, 10000).timeInterval().flatMap(getCtrlValue);
        } else {
            return getCtrlValue();
        }
    };

    this.statusNowRx = function () {
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


    this.listRx = function (param) {
        var subject = new Rx.AsyncSubject();
        $http.post('/api/image/list',param).success(function (res) {
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
                    _boxElement.css('font-size',Math.floor(windowWidth / 720* 30) + 'pt');
                    var titleFontSize = Math.floor(windowWidth / 720* 10);
                    _titleElement.css('font-size',titleFontSize < 7?7:titleFontSize + 'pt');
                } else {
                    _boxElement.css('font-size','30pt');
                    _titleElement.css('font-size','10pt');
                }
            }


            function invalidBackgroundColors(value) {
                for(var i = 0, n = scope.colorIndex.length; i < n;++i) {
                    var nextValue = (i + 1 == n) ? Number.MAX_SAFE_INTEGER : scope.colorIndex[i].value;
                    var currentValue = scope.colorIndex[i].value;
                    if(_.isString(scope.value)) {
                        if (currentValue == value) {
                            scope.statusBox = {'background-color': scope.colorIndex[i].color};
                            return;
                        }
                    }  else {
                        if (currentValue >= value && nextValue > value) {
                            scope.statusBox = {'background-color': scope.colorIndex[i].color};
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
                scope.statusBox = {'background-color': color};
            }




        }
    }
}]);
