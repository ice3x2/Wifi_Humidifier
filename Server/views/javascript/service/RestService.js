/**
 * Created by ice3x2 on 2015. 7. 15..
 */

angular.module('app').service('RestService', function($http) {

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
});