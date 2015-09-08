/**
 * Created by ice3x2 on 2015. 9. 8..
 */



function Controller() {
    var lastTemperature = -100.0;
    var lastHumidity = -100.0;

    this.ControlStatus = {
        minTemperature : 40,
        minHumidity : 60,
        maxHumidity : 100,
        water : 0,
        fanPWM : 255,
        powerPWM : 255
    };


    this.parseBuffer = function(buffer) {


    };
    this.toBuffer = function(type) {

    };
}


