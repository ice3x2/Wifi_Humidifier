/**
 * Created by ice3x2 on 2015. 7. 15..
 */

angular.module('app').service('RestService', function($http) {

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
});