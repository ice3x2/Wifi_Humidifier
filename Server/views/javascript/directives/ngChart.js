/**
 * Created by ice3x2 on 2015. 9. 14..
 */

angular.module('app').directive('ngChart', function (WindowEventSvc) {
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
});
