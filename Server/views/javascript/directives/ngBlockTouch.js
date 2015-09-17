/**
 * Created by love on 2015. 7. 2..
 */


angular.module('app').directive('ngBlockTouch', function ($animate) {
    return {
        replace : true,
        scope : {
            ngEnableBlock : '=?'
        },
        transclude : true,
        restrict: 'E',
        templateUrl: 'ngBlockTouch',
        link: function(scope, element, attrs) {
            scope.$watch('ngEnableBlock', function(value) {
                scope.isShow = value;
            });

            scope.onClickBlock = function($event) {
                $event.stopPropagation();
            }


        }
    }

});