/**
 * Created by ice3x2 on 2015. 6. 28..
 */

angular.module('app').service('WindowEventSvc', function($window) {

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








});