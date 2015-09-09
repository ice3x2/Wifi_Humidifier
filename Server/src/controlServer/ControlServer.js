/**
 * Created by ice3x2 on 2015. 9. 8..
 */

var log = _include("ColorLog");

const TYPE = {
    CONNECT : 'k'.charCodeAt(0),
    MSG : 'm'.charCodeAt(0),
    HEART_BEAT : 'h'.charCodeAt(0),
    ACK : 'r'.charCodeAt(0)
};

const CMD = {
    NONE : '',
    ERROR : 'e'.charCodeAt(0),
    OK : 's'.charCodeAt(0),
    TH_VALUE : 't'.charCodeAt(0), // 온도와 습도를 받아온다.
    WATER_STATE : 'w'.charCodeAt(0), // 물 상태 정보를 받아온다.
    CONTROL_DATA : 'c'.charCodeAt(0) // 동작 명령을 전송한다.
};

const BUFFER_SIZE = 64;
const TYPE_POS = 0;
const CMD_POS = 2;


function ControlServer(socket) {

    this.NIL_VALUE = -1000;

    var _controlValues = {
        minTemperature : 40,
        minHumidity : 60,
        maxHumidity : 100,
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
    var _isBusy = false;
    var _onSendControlDataCallback = function(isOk) {};
    this.onTHValueCallback = function(t, h) {};
    this.onWaterAlertCallback = function(isWater) {};
    this.onDeviceConnectedCallback = function(isConnected) {};

    this.sendControlData = function(callback) {
        socket.write(createControlValuesOnBuffer().slice(0, _bufferOffset));

        _onSendControlDataCallback = callback;
    }




    socket.on('data',function(data){
        var type = data.readUInt8(TYPE_POS);
        if(_.isEqual(type, TYPE.ACK)) {
            log.i("receive type : ack ");
            if(!_isConnected) return;
            var cmd = data.readUInt8(CMD_POS);
            if(_.isEqual(cmd, CMD.OK) && _onSendControlDataCallback != null) {
                log.w("receive cmd : Ack for SendControlData ");
                _onSendControlDataCallback(true);

            } else if(_onSendControlDataCallback != null) {
                log.w("receive cmd : Ack error for SendControlData ");
                _onSendControlDataCallback(false);
            }
            _onSendControlDataCallback = null;
        }  else if(_.isEqual(type, TYPE.CONNECT)) {
            log.i("receive cmd : CONNECT");
            var key = "";
            for(var i = CMD_POS,n = data.length;i < n; ++i) {
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
                    socket.write(createHeader(TYPE.ACK, CMD.ERROR).slice(0, _bufferOffset));
                    socket.destroy();
                    log.i("send data : response error");
                    log.w("received key : " + key + ", server key : " + _.get(__properties,'control.key',' ').trim());
                    log.w("state : connect fail.");
                }, 1500);
            }
        }//\r\nbusy s...
        else if(_.isEqual(type, TYPE.MSG)) {
            if(!_isConnected) return;
            var cmd = data.readUInt8(CMD_POS);
            if(_.isEqual(cmd, CMD.TH_VALUE)) {
                // m:t[온도(2byte)][습도(2byte)]
                _lastTemperature = data.readUInt16BE(3);
                _lastHumidity =  data.readUInt16BE(5);
                _this.onTHValueCallback(_lastTemperature, _lastHumidity);
                log.i("receive cmd : TH_VALUE");
                log.v("Temperature : " + _lastTemperature + "  Humidity : " + _lastHumidity);
                log.i("sendData : response ok");

                setTimeout(function() {_this.sendControlData(function (isOk){}) }, 1500);

            }
            if(_.isEqual(cmd, CMD.WATER_STATE)) {
                // m:w[물 상태 - 있음:1, 없음:0 (1byte)]
                _isWaterState = data.readUInt8(3);
                _this.onWaterAlertCallback(_isWaterState);
                log.i("receive cmd : WATER_STATE");
                log.v("Water state : " + _isWaterState);
                log.i("sendData : response ok");
            }
        }
    });
    socket.on('error',function(error){
        log.e(error);
    });
    socket.on('end',function(){
        log.d('Client connection ended');
    });

    var createHeader = function(type, cmd) {
        _buffer.fill(0);
        _buffer.writeInt8(type, 0)
        _buffer.writeInt8(':'.charCodeAt(0), 1)
        if(cmd) {
            _buffer.writeInt8(cmd, 2)
        }
        _bufferOffset = 3;
        return _buffer;
    };

    var createControlValuesOnBuffer = function() {
         //m:c[최저 온도(2byte)][최저 습도(2byte)][최고 습도(2byte)][팬속도 (1byte)][분무량 (1byte)]
        createHeader(TYPE.MSG, CMD.CONTROL_DATA);
        _buffer.writeUInt16LE(_controlValues.minTemperature,3);
        _buffer.writeUInt16LE(_controlValues.minHumidity,5);
        _buffer.writeUInt16LE(_controlValues.maxHumidity,7);
        _buffer.writeUInt8(_controlValues.fanPWM,9);
        _buffer.writeUInt8(_controlValues.powerPWM,10);
        _buffer.writeUInt8(0,11);
        _bufferOffset = 12;
        return _buffer;



    }

};

module.exports = ControlServer;