//
//  Controller.cpp
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 9. 9..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#include <iostream>
#include "Controller.h"



#define NIL_VALUE -1000
#define CMD_POS 2
#define DELAY_SEND_TH_VALUE 3000
#define DELAY_SEND_Water_STATE 1000


void Controller::resetBuffer() {
    for(int n = _buflen; n--;) {
        _buffer[n] = 0;
    }
    _pos = 0;
}
    
void Controller::createHeader(TYPE type, CMD cmd) {
    resetBuffer();
    _buffer[_pos++] = type;
    _buffer[_pos++] = ':';
    if(cmd != NONE) {
        _buffer[_pos++] = cmd;
    }
}
void Controller::writeUINT16(uint16_t value) {
    _buffer[_pos++] = (value >> 8) & 0xFF;
    _buffer[_pos++] = value  & 0xFF;
}
void Controller::readControlValues() {
    _controlValues.minTemperature = readUINT16(3);
    _controlValues.minHumidity = readUINT16(5);
    _controlValues.maxHumidity = readUINT16(7);
    _controlValues.fanPWM = _buffer[9];
    _controlValues.fanPWM = _buffer[10];
    _pos = 11;
}
uint16_t Controller::readUINT16(uint8_t offset) {
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
        createHeader(TYPE_ACK,CMD_OK);
        _onWriteCallback(_buffer, _pos);
        if(_onChangedControlValuesCallback  != NULL) {
            _onChangedControlValuesCallback(&_controlValues);
        }
        _isBusy = false;
        _status = STATUS_IDLE;
    }
}
    
    
void Controller::updateWaterStateIfNeed() {
    if(_lastReadMillis -  _lastWaterStateSendMillis > DELAY_SEND_Water_STATE && _status == STATUS_IDLE) {
        _lastWaterStateSendMillis = _lastReadMillis;
        if(_onWaterStateCallback == NULL) return;
        bool isFilledWater = _onWaterStateCallback();
        if(isFilledWater == _isFilledWater) return;
        _isFilledWater = isFilledWater;
        createHeader(TYPE_MSG, CMD_WATER_STATE);
        writeUINT8(_isFilledWater);
        _onWriteCallback(_buffer, _pos);
        _status = STATUS_WAIT_ACK;
        _isBusy = true;
    }
}
    
void Controller::updateTHValueIfNeed() {
    if(_lastReadMillis -  _lastTHSendMillis > DELAY_SEND_TH_VALUE && _status == STATUS_IDLE) {
        _lastTHSendMillis = _lastReadMillis;
        if(_onTHValueCallback == NULL) return;
        _onTHValueCallback(&_thValue);
        createHeader(TYPE_MSG, CMD_TH_VALUE);
        writeUINT16(_thValue.temperature);
        writeUINT16(_thValue.humidity);
        _onWriteCallback(_buffer, _pos);
        _status = STATUS_WAIT_ACK;
        _isBusy = true;
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
    createHeader(TYPE_CONNECT);
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
    if(_status == STATUS_MAKING_CONNECTION || _status == STATUS_WAIT_ACK) {
        if(_buffer[CMD_POS] == CMD_OK) {
            _status = STATUS_IDLE;
        } else {
            _status = STATUS_ERROR;
        }
    } else if(_buffer[CMD_POS] == CMD_CONTROL_DATA) {
        _isBusy = true;
        readControlValues();
        _status = STATUS_SEND_ACK_FOR_CHANGED_CONTOL_VALUES;
        resetBuffer();
    }
}


void Controller::respire(long millis) {
    _lastReadMillis = millis;
    if(!isConnected()) return;
    updateTHValueIfNeed();
    updateWaterStateIfNeed();
    onUpdateControlValueIfNeed();
}

void Controller::onDisconnect() {
    resetBuffer();
    _status = STATUS_DISCONNECTED;
}

