#pragma once

#include <iostream>
#include "EspResponseChecker.h"
#define BUFFER_SIZE 128

using namespace std;
typedef string String;

typedef struct Event {
    
    uint8_t type;
    uint8_t* data;
    uint8_t dataLength;
} Event;

typedef struct Options {
    bool apMode = false;
    bool serverMode = false;
    uint16_t serverPort = 80;
    String ssid;
    String password;
    uint16_t connectTimeout = 5000;
    uint16_t readTimeout = 5000;
} Options;

class ESPTTP {
    private :
    typedef String (*OnResponse)(uint8_t);
    typedef void (*OnEvent)(Event);
    typedef void (ESPTTP::*cmdFunc)(void);
    
    ESPResponseChecker _resChecker;
    Options _Options;
    String _serverAddress;
    String _path;
    cmdFunc _cmdQueue[8];
    uint8_t _cmdQueueSize = 0;
    uint16_t _serverPort = 80;
    uint16_t _resDataForWait = RES_NONE;
    long _lastMillis;
    //SoftwareSerial* _ptWifi;
    
    private :
    
    void onEvent() {
        
    }
    
    void cmdSendWithHttp();
    void cmdCloseConnectionOnServerMode();
    void cmdConnectServerOnClientMode();
    void cmdResetModule();
    void cmdGetIPAddress();
    void cmdConnectAPMode();
    
    void pushCMDFunc(cmdFunc func) {
        _cmdQueue[_cmdQueueSize++] = func;
    }
    
    bool runCMDFunc() {
        if(_cmdQueueSize > 0 && _resDataForWait == RES_NONE) {
            cmdFunc func = _cmdQueue[0];
            (this->*func)();
            --_cmdQueueSize;
            return true;
        }
        return false;
    }
    public :
    inline Options* obtainOption() {
        return &_Options;
    }
    bool isBusy() {
        return _cmdQueueSize != 0 && _resDataForWait != RES_NONE;
    }
    void commitOption();
    void requestIPAddress() {
        pushCMDFunc(&ESPTTP::cmdGetIPAddress);
    }
/*I    void begin(SoftwareSerial* softwareSerial) {
        _ptWifi = softwareSerial;
    }*/
    void setOnResponseFunc(OnResponse onResponse);
    void setAPMode(bool apMode);
    ESPTTP& setRequestServer(String server);
    ESPTTP& setRequestPort(int port);
    ESPTTP& setPath(String path);
    void request();
    void setOption();
    void next(long currentMillis) {
        runCMDFunc();
                runCMDFunc();
                runCMDFunc();
    }
};

void ESPTTP::cmdGetIPAddress() {
    cout << "cmdGetIPAddress call" << endl;
}
