/**
 * Created by ice3x2 on 2015. 9. 14..
 */

angular.module('app').directive('ngStatusBox', function () {
    return {
        replace: true,
        scope: {
            title: '@',
            value: '=?',
            colorIndex: '=?',
            unit: '@',
            fontRatio : '@?'

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
            var _boxElement =  element.find('._statusBox');
            var _titleElement =  element.find('._titleBox');

            //resizeBox(screen.width)
            invalidBackgroundColors(scope.value);

            /*WindowEventSvc.addResizeCallback(function(newValue) {
                resizeBox(newValue.width);
            });*/

            /*angular.element('._statusBox').on('resize', function() {
                console.log('resize');
            });*/

            scope.$watch('fontRatio',function(data) {
                if(_.isUndefined(data)) return;
                setFontRatio(data);
            });

            scope.$watch('value',function(data) {
                invalidBackgroundColors(data);
            });
            scope.$watch('colorIndex',function(data) {
                invalidBackgroundColors(scope.value);
            });

            function setFontRatio(ratio) {
                var titleFontSize = Math.floor(ratio * TITLE_SIZE);
                var valueFontSize = Math.floor(ratio * FONT_SIZE);
                _boxElement.css('font-size',(valueFontSize < 20)?20 + 'pt':valueFontSize + 'pt');
                _titleElement.css('font-size',(titleFontSize < 9)?9 + 'pt':titleFontSize + 'pt');
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
