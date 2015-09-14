/**
 * Created by ice3x2 on 2015. 6. 10..
 */

var app = angular.module('app', ['ngAnimate', 'ngMaterial']);


/**Angular Material Config*/
angular.module('app').config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('red')
        .accentPalette('deep-orange');
});


angular.module('app').controller('MainCtrl', function($scope, RestService) {
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

});


