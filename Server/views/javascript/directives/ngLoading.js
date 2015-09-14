/**
 * Created by love on 2015. 7. 2..
 */


angular.module('app').directive('ngLoading', function ($animate) {
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

});