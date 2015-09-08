/**
 * Created by ice3x2 on 2015. 9. 8..
 */

var log = _include("ColorLog");

var TYPE = {
    CONNECT : 'k'.charCodeAt(0),
    MSG : 'm'.charCodeAt(0),
    HEART_BEAT : 'h'.charCodeAt(0),
    RESPONSE : 'r'.charCodeAt(0)
};

var CMD = {
    NONE : '',
    ERROR : 'e'.charCodeAt(0),
    OK : 's'.charCodeAt(0),
    TH_VALUE : 't'.charCodeAt(0), // 온도와 습도를 받아온다.
    WATER_STATE : 'w'.charCodeAt(0)
};

const BUFFER_SIZE = 32;
const TYPE_POS = 0;
const CMD_POS = 2;


function ControlServer(socket) {
    socket.id
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
    this.onTHValueCallback = function(t, h) {};
    this.onWaterAlertCallback = function(isWater) {};
    this.onDeviceConnectedCallback = function(isConnected) {};


    socket.on('data',function(data){
        var type = data.readUInt8(TYPE_POS);
        if(_.isEqual(type, TYPE.CONNECT)) {
            log.i("receive cmd : CONNECT");
            var key = "";
            for(var i = CMD_POS,n = data.length;i < n; ++i) {
                key += String.fromCharCode(data[i]);
            }
            log.i("receive key : "  + key);
            if(_.isEqual(key.trim(), _.get(__properties,'control.key',' ').trim())) {
                socket.write(createHeader(TYPE.RESPONSE, CMD.OK).slice(0, _bufferOffset));
                log.i("state : connected.");
                log.i("sendData : response ok");
                _isConnected = true;
                _this.onDeviceConnectedCallback(true);

            } else {
                _isConnected = false;
                socket.write(createHeader(TYPE.RESPONSE, CMD.ERROR).slice(0, _bufferOffset));
                log.i("send data : response error");
                log.w("received key : " + key + ", server key : " + _.get(__properties,'control.key',' ').trim());
                log.w("state : connect fail.");
                socket.destroy();
            }
        }
        else if(_.isEqual(type, TYPE.MSG)) {
            var cmd = data.readUInt8(CMD_POS);
            if(_.isEqual(cmd, CMD.TH_VALUE)) {
                // m:t[온도(2byte)][습도(2byte)]
                _lastTemperature = data.readUInt16BE(3);
                _lastHumidity =  data.readUInt16BE(5);
                _this.onTHValueCallback(_lastTemperature, _lastHumidity);
                log.i("receive cmd : TH_VALUE");
                log.v("Temperature : " + _lastTemperature + "  Humidity : " + _lastHumidity);
                socket.write(createHeader(TYPE.RESPONSE, CMD.OK).slice(0, _bufferOffset));
                log.i("sendData : response ok");
            }
            if(_.isEqual(cmd, CMD.WATER_STATE)) {
                // m:w[물 상태 - 있음:1, 없음:0 (1byte)]
                _isWaterState = data.readUInt8(3);
                _this.onTHValueCallback(_lastTemperature, _lastHumidity);
                log.i("receive cmd : WATER_STATE");
                log.v("Water state : " + _isWaterState);
                socket.write(createHeader(TYPE.RESPONSE, CMD.OK).slice(0, _bufferOffset));
                log.i("sendData : response ok");
            }
        }
    });
    socket.on('end',function(){
        console.log('Client connection ended');
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
};

module.exports = ControlServer;