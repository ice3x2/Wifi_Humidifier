/**
 * Created by ice3x2 on 2015. 9. 14..
 */

angular.module('app').directive('ngStatusBox', function (WindowEventSvc) {
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
            var FONT_SIZE = 38;
            var TITLE_SIZE = 12;
            var MAX_WIDTH = 1024;

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
                    _boxElement.css('font-size',Math.floor(windowWidth / MAX_WIDTH* FONT_SIZE) + 'pt');
                    var titleFontSize = Math.floor(windowWidth / MAX_WIDTH * TITLE_SIZE);
                    _titleElement.css('font-size',titleFontSize < 9?9:titleFontSize + 'pt');
                } else {
                    _boxElement.css('font-size',FONT_SIZE + 'pt');
                    _titleElement.css('font-size',TITLE_SIZE + 'pt');
                }
            }


            function invalidBackgroundColors(value) {
                for(var i = 0, n = scope.colorIndex.length; i < n;++i) {
                    var nextValue = (i + 1 == n) ? Number.MAX_SAFE_INTEGER : scope.colorIndex[i].value;
                    var currentValue = scope.colorIndex[i].value;
                    if(_.isString(scope.value)) {
                        if (currentValue == value) {
                            scope.styleStatusBoxText = {'color': scope.colorIndex[i].color};
                            return;
                        }
                    }  else {
                        if (currentValue >= value && nextValue > value) {
                            scope.styleStatusBoxText = {'color': scope.colorIndex[i].color};
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
                scope.styleStatusBoxText = {'color': color};
            }




        }
    }
});
