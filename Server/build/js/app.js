/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngAnimate', 'ngMaterial']);


/**Angular Material Config*/
angular.module('app').config(["$mdThemingProvider", function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('red')
        .accentPalette('deep-orange');
}]);


angular.module('app').controller('MainCtrl', ["$scope", "RestService", function($scope, RestService) {
    $scope.tempColorIndex = [ {
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
    }];
    $scope.tempValue = 'NC ';
    // 0% : 자연상태에서 있을 수 없음.
    //  ~ 30% : 사막, 겨울철 난방에 의한 건조상태.
    // ~ 60% :
    $scope.humidityColorIndex = [ {
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
    }];
    $scope.humidityValue = 'NC ';


    $scope.diColorIndex = [ {
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
    }];
    $scope.diValue = 'NC ';

    $scope.ctColorIndex = [{
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
    }];
    $scope.ctValue = 'NC ';



    RestService.statusRx().subscribe(function(status) {
        //console.log(status);
        $scope.ctValue = status.connection == 3?'Good':(status.connection == 2)?'Normal':(status.connection == 1)?'Bad':'NC';
        $scope.tempValue = (status.connection == 0)?'NC ':status.temperature;
        $scope.humidityValue = (status.connection == 0)?'NC ':status.humidity;
        $scope.diValue = (status.connection == 0)?'NC ':status.discomfort;
    },function(err) {
        $scope.ctValue = 'NC';
        $scope.diValue = 'NC ';
        $scope.tempValue = 'NC ';
        $scope.humidityValue = 'NC ';
    });

}]);



/**
 * Created by ice3x2 on 2015. 7. 15..
 */

angular.module('app').service('RestService', ["$http", function($http) {

    this.ctrlRx = function () {
        var subject = new Rx.AsyncSubject();
        $http.post('/ctrl').success(function (res) {
            subject.onNext(res);
            subject.onCompleted();
        }).error(function (err) {
            subject.onError(err);
        });
        return subject.asObservable();
    };

    this.statusRx = function () {
        return Rx.Observable.timer(0, 5000).timeInterval().flatMap(function() {
            var subject = new Rx.AsyncSubject();
            $http.post('/status').success(function (res) {
                subject.onNext(res);
                subject.onCompleted();
            }).error(function (err) {
                subject.onError(err);
            });
            return subject.asObservable();
        });
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


    /*_windowEle.bind('resize', function() {
        _oldValue.width = _newValue.width;
        _oldValue.height = _newValue.height;
        _newValue.width = _windowEle.width();
        _newValue.height = _windowEle.height();
        _.forEach(_resizeCallbacksFunc, function(callbackFunc) {
            callbackFunc(_.clone(_newValue), _.clone(_oldValue));
        });

    });*/

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
                        }
                    }  else {
                        if (currentValue >= value && nextValue > value) {
                            scope.statusBox = {'background-color': scope.colorIndex[i].color};
                            break;
                        }
                    }
                }
            }

        }
    }
}]);
