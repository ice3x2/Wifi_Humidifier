/**
 * Created by ice3x2 on 2015. 9. 8..
 */

var log = _include("ColorLog");



const CMD = {
    TH_VALUE : 't'.charCodeAt(0), // 온도와 습도를 서버로 보내는 명령.
    WATER_STATE : 'w'.charCodeAt(0), // 물 상태를 서버로 보내는 명령
    CONTROL_DATA : 'c'.charCodeAt(0), // 서버에서 받아오는 제어 데이터.
    RESPONSE_OK :'r'.charCodeAt(0),
    RESPONSE_ERROR : 'e'.charCodeAt(0),
    CONNECT_KEY : 'k'.charCodeAt(0)
};

const BUFFER_SIZE = 64;
const MSG_POS = 2;
const CMD_POS = 0;


function ControlServer(socket) {

    this.NIL_VALUE = -1000;

    var _controlValues = {
        minTemperature : 400,
        minHumidity : 400,
        maxHumidity : 600,
        fanPWM : 255,
        powerPWM : 255
    };
    var _isWaterState = false;
    var _buffer = new Buffer(BUFFER_SIZE);
    var _bufferOffset = 0;
    var _isConnected = false;
    var _lastTemperature = this.NIL_VALUE;
    var _lastHumidity = this.NIL_VALUE;
    var _this = this;
    var _onSendControlDataCallback = function(isOk) {};
    this.onTHValueCallback = function(t, h) {};
    this.onWaterAlertCallback = function(isWater) {};
    this.onDeviceConnectedCallback = function(isConnected) {};

    this.sendControlData = function(callback) {
        socket.write(createControlValuesOnBuffer().slice(0, _bufferOffset));
        _onSendControlDataCallback = callback;
    }


    socket.on('data',function(data){
        var cmd = data.readUInt8(CMD_POS);
        if(_.isEqual(cmd, CMD.RESPONSE_OK)) {
            log.i("receive type : ack ");
            if(!_isConnected) return;
            if(_.isEqual(cmd, CMD.OK) && _onSendControlDataCallback != null) {
                _onSendControlDataCallback(true);
            } else if(_onSendControlDataCallback != null) {
                _onSendControlDataCallback(false);
            }
            _onSendControlDataCallback = null;
        }  else if(_.isEqual(cmd, CMD.CONNECT_KEY)) {
            log.i("receive cmd : CONNECT");
            var key = "";
            for(var i = MSG_POS,n = data.length;i < n; ++i) {
                key += String.fromCharCode(data[i]);
            }
            log.i("receive key : "  + key);
            if(_.isEqual(key.trim(), _.get(__properties,'control.key',' ').trim())) {
                log.i("state : connected.");
                log.i("sendData : response ok");
                _isConnected = true;
                _this.onDeviceConnectedCallback(true);
                setTimeout(function() {_this.sendControlData(function (isOk){}) }, 1500);
            } else {
                _isConnected = false;
                setTimeout(function() {
                    socket.write(createHeader(CMD.ERROR).slice(0, _bufferOffset));
                    socket.destroy();
                    log.i("send data : response error");
                    log.w("received key : " + key + ", server key : " + _.get(__properties,'control.key',' ').trim());
                    log.w("state : connect fail.");
                }, 1500);
            }
        }//\r\nbusy s...
        else if(_.isEqual(cmd, CMD.TH_VALUE)) {
            if(!_isConnected) return;
            // m:t[온도(2byte)][습도(2byte)]
            _lastTemperature = data.readUInt16BE(2);
            _lastHumidity =  data.readUInt16BE(4);
            _this.onTHValueCallback(_lastTemperature, _lastHumidity);
            log.i("receive cmd : TH_VALUE");
            log.v("Temperature : " + _lastTemperature + "  Humidity : " + _lastHumidity);
            log.i("sendData : response ok");

            setTimeout(function() {_this.sendControlData(function (isOk){}) }, 1500);
        }
        if(_.isEqual(cmd, CMD.WATER_STATE)) {
            if(!_isConnected) return;
            // m:w[물 상태 - 있음:1, 없음:0 (1byte)]
            _isWaterState = data.readUInt8(MSG_POS);
            _this.onWaterAlertCallback(_isWaterState);
            log.i("receive cmd : WATER_STATE");
            log.v("Water state : " + _isWaterState);
            log.i("sendData : response ok");
        }
    });
    socket.on('error',function(error){
        log.e(error);
    });
    socket.on('end',function(){
        log.d('Client connection ended');
    });

    var createHeader = function(cmd) {
        _buffer.fill(0);
        _buffer.writeInt8(cmd, 0)
        _buffer.writeInt8(':'.charCodeAt(0), 1)
        _bufferOffset = 2;
        return _buffer;
    };

    var createControlValuesOnBuffer = function() {
         //m:c[최저 온도(2byte)][최저 습도(2byte)][최고 습도(2byte)][팬속도 (1byte)][분무량 (1byte)]
        createHeader(CMD.CONTROL_DATA);
        _buffer.writeUInt16LE(_controlValues.minTemperature,2);
        _buffer.writeUInt16LE(_controlValues.minHumidity,4);
        _buffer.writeUInt16LE(_controlValues.maxHumidity,6);
        _buffer.writeUInt8(_controlValues.fanPWM,8);
        _buffer.writeUInt8(_controlValues.powerPWM,9);
        _bufferOffset = 10;
        return _buffer;
    }

};

module.exports = ControlServer;