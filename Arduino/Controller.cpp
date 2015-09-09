#include "Controller.h"



#define NIL_VALUE -1000
#define DELAY_SEND_TH_VALUE 3000
#define DELAY_SEND_Water_STATE 1000


void Controller::resetBuffer() {
    for(int n = _buflen; n--;) {
        _buffer[n] = 0;
    }
    _pos = 0;
}
    
void Controller::createHeader(CMD cmd) {
    resetBuffer();
    _buffer[_pos++] = cmd;
    _buffer[_pos++] = ':';
}
void Controller::writeUINT16(uint16_t value) {
    _buffer[_pos++] = (value >> 8) & 0xFF;
    _buffer[_pos++] = value  & 0xFF;
}
void Controller::readControlValues() {
    _controlValues.minTemperature = readINT16(2);
    _controlValues.minHumidity = readINT16(4);
    _controlValues.maxHumidity = readINT16(6);
    _controlValues.fanPWM = _buffer[8];
    _controlValues.fanPWM = _buffer[9];
    _pos = 10;
}
int16_t Controller::readINT16(uint8_t offset) {
    return (_buffer[offset + 1]<<8)
    + _buffer[offset];
}
    
void Controller::writeUINT8(uint8_t value) {
    _buffer[_pos++] = value  & 0xFF;
}
    
void Controller::appendStringOnBuffer(const char* string, uint8_t len) {
    for(uint8_t i = 0; i < len; ++i) {
        _buffer[_pos++] = string[i];
    }
}
    
    
void Controller::onUpdateControlValueIfNeed() {
    if(_status == STATUS_SEND_ACK_FOR_CHANGED_CONTOL_VALUES) {
        createHeader(CMD_RESPONSE_OK);
        _onWriteCallback(_buffer, _pos);
        if(_onChangedControlValuesCallback  != NULL) {
            _onChangedControlValuesCallback(&_controlValues);
        }
        _isBusy = false;
        _status = STATUS_IDLE;
    }
}
    
    
void Controller::updateWaterStateIfNeed() {
    if(_lastReadMillis -  _lastWaterStateSendMillis > DELAY_SEND_Water_STATE && _status == STATUS_IDLE && !_isBusy) {
        _lastWaterStateSendMillis = _lastReadMillis;
        if(_onWaterStateCallback == NULL) return;
        bool isFilledWater = _onWaterStateCallback();
        if(isFilledWater == _isFilledWater) return;
        _isFilledWater = isFilledWater;
        createHeader(CMD_WATER_STATE);
        writeUINT8(_isFilledWater);
        _onWriteCallback(_buffer, _pos);
    }
}
    
void Controller::updateTHValueIfNeed() {
    if(_lastReadMillis -  _lastTHSendMillis > DELAY_SEND_TH_VALUE && _status == STATUS_IDLE && !_isBusy) {
        _lastTHSendMillis = _lastReadMillis;
        if(_onTHValueCallback == NULL) return;
        _onTHValueCallback(&_thValue);
        createHeader(CMD_TH_VALUE);
        writeUINT16(_thValue.temperature);
        writeUINT16(_thValue.humidity);
        _onWriteCallback(_buffer, _pos);
        computeAndUpdatePWMControl();
    }
}

void Controller::computeAndUpdatePWMControl() {
  if(_thValue.temperature == NIL_VALUE || _thValue.humidity == NIL_VALUE) return;
  if(_thValue.humidity < _controlValues.minHumidity && !_isOnPower) {
     _isOnPower = true;
  }
  else if(_thValue.humidity > _controlValues.maxHumidity && _isOnPower) {
     _isOnPower = false;
  }
  if(_isOnPower && _onPWMControlCallback != NULL) {
     _onPWMControlCallback(_controlValues.powerPWM,_controlValues.fanPWM);
  }
}
    


Controller::Controller(uint8_t* buffer, uint8_t length) :
_status(STATUS_DISCONNECTED), _lastTHSendMillis(0), _lastReadMillis(0),_lastWaterStateSendMillis(0),_isFilledWater(true), _isBusy(false) {
    _buflen = length;
    _buffer = buffer;
    resetBuffer();
    
};

void Controller::makeConnection(const char* key, uint8_t len) {
    if(_status != STATUS_DISCONNECTED) return;
    createHeader(CMD_CONNECT_KEY);
    appendStringOnBuffer(key, len);
    _status = STATUS_MAKING_CONNECTION;
    if(_onWriteCallback != NULL) {
        _onWriteCallback(_buffer, _pos);
    }
}

void Controller::startReceive() {
    resetBuffer();
    _isBusy = true;
}
void Controller::receive(uint8_t data) {
    _buffer[_pos++] = data;
}
void Controller::endReceive() {
    _isBusy = false;
    if(_buffer[0] == CMD_CONTROL_DATA) {
       _status = STATUS_IDLE;
       _isBusy = true;
       readControlValues();
       _status = STATUS_SEND_ACK_FOR_CHANGED_CONTOL_VALUES;
       resetBuffer();
    } else if(_buffer[0] == CMD_RESPONSE_ERROR) {
       _status = STATUS_ERROR; 
    }
}


void Controller::respire(long millis) {
    if(!isConnected()) return;
    _lastReadMillis = millis;
    updateTHValueIfNeed();
    updateWaterStateIfNeed();
    onUpdateControlValueIfNeed();
}

void Controller::onDisconnect() {
    resetBuffer();
    _status = STATUS_DISCONNECTED;
}

