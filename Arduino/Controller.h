//
//  Controller.h
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 9. 9..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#pragma once

#ifdef TEST 
  #include <iostream>
#else
  #include <arduino.h>
#endif


#define NIL_VALUE -1000
#define CMD_POS 2
#define DELAY_SEND_TH_VALUE 5000
#define DELAY_SEND_Water_STATE 1000



typedef struct THValue {
    int16_t temperature = NIL_VALUE;
    int16_t humidity = NIL_VALUE;
} THValue;

typedef struct ControlValues {
    uint8_t minTemperature = 40;
    uint8_t minHumidity = 60;
    uint8_t maxHumidity = 100;
    uint8_t fanPWM = 255;
    uint8_t powerPWM = 255;
} ControlValues;


class Controller {
    
private:
    typedef void (*OnWriteCallback)(uint8_t*,uint8_t);
    typedef void (*OnTHValueCallback)(THValue* const _thValue);
    typedef bool (*OnWaterStateCallback)();
    typedef void (*OnChangedControlValuesCallback)(ControlValues* const);
    enum TYPE { // 데이터 타입.
        TYPE_CONNECT = 'k', // 연결
        TYPE_MSG = 'm', // 메세지
        TYPE_HEART_BEAT = 'h', // 주기적으로 주고 받는 Heart beat
        TYPE_ACK = 'r'
    };
    enum CMD {
        NONE,
        CMD_TH_VALUE = 't', // 온도와 습도를 서버로 보내는 명령.
        CMD_WATER_STATE = 'w', // 물 상태를 서버로 보내는 명령
        CMD_CONTROL_DATA = 'c',
        CMD_OK = 's'
        
        
    };
    enum STATUS {STATUS_DISCONNECTED,
        STATUS_MAKING_CONNECTION,
        STATUS_IDLE,
        STATUS_SEND_ACK_FOR_CHANGED_CONTOL_VALUES,
        STATUS_ERROR};
    
    
    STATUS _status;
    ControlValues _controlValues;
    OnWriteCallback _onWriteCallback;
    OnTHValueCallback _onTHValueCallback;
    OnWaterStateCallback _onWaterStateCallback;
    OnChangedControlValuesCallback _onChangedControlValuesCallback;
    THValue _thValue;
    uint8_t _pos;
    uint8_t* _buffer;
    uint8_t _buflen;
    long _lastReadMillis;
    long _lastTHSendMillis;
    long _lastWaterStateSendMillis;
    bool _isFilledWater;
    bool _isBusy;
    
    
    void resetBuffer();
    void createHeader(TYPE type, CMD cmd = NONE);
    void writeUINT16(uint16_t value);
    void readControlValues();
    uint16_t readUINT16(uint8_t offset);
    void writeUINT8(uint8_t value);
    void appendStringOnBuffer(const char* string, uint8_t len);
    void onUpdateControlValueIfNeed();
    void updateWaterStateIfNeed();
    void updateTHValueIfNeed();
    
public:
    inline void setOnWriteCallback(OnWriteCallback onWriteCallback) {
        _onWriteCallback = onWriteCallback;
    }
    inline void setOnTHValueCallback(OnTHValueCallback onTHValueCallback) {
        _onTHValueCallback = onTHValueCallback;
    }
    inline void setOnWaterStateCallback(OnWaterStateCallback onWaterStateCallback) {
        _onWaterStateCallback = onWaterStateCallback;
    }
    inline void setOnChangedControlCallback(OnChangedControlValuesCallback onChangedControlValuesCallback) {
        _onChangedControlValuesCallback = onChangedControlValuesCallback;
    }
    inline bool isConnected() {
        return _status != STATUS_DISCONNECTED && _status != STATUS_ERROR && _status != STATUS_MAKING_CONNECTION;
    }
    inline bool isWaitData() {
        return _status == STATUS_IDLE;
    }
    inline bool isBusy() {
        return _isBusy;
    }
    inline bool isUnlinked() {
        return _status == STATUS_DISCONNECTED;
    }
    inline uint8_t getBufferPos() {
        return _pos;
    }
    
    
    Controller(uint8_t* buffer, uint8_t length);
    void makeConnection(const char* key, uint8_t len);
    void startReceive();
    void receive(uint8_t data);
    void endReceive();
    void respire(long millis);
    void onDisconnect();
};



