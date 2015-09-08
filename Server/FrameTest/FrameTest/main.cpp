//
//  main.cpp
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 6. 27..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#include <iostream>
#include "ESPResponseChecker.h"

using namespace std;
typedef bool boolean;
typedef unsigned char byte;
typedef unsigned char uint8_t;

void test2();
string arrayPrint(byte* array, int len);



#include <sys/socket.h>
#include <sys/stat.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>


#define BUF_LEN 128


#define NIL_VALUE -1000
#define DELAY_SEND_TH_VALUE 3000
#define DELAY_SEND_Water_STATE 1000

long millis() {

    return (long)time(NULL) * 1000;
}

typedef struct THValue {
    int16_t temperature = NIL_VALUE;
    int16_t humidity = NIL_VALUE;
} THValue;

typedef struct ControlValues {
    uint8_t minTemperature = 40;
    uint8_t minHumidity = 60;
    uint8_t maxHumidity = 100;
    uint8_t water = 0;
    uint8_t fanPWM = 255;
    uint8_t powerPWM = 255;
} ControlValues;


class Controller {
    
private:
    typedef void (*OnWriteCallback)(uint8_t*,uint8_t);
    typedef void (*OnTHValueCallback)(THValue* const _thValue);
    typedef bool (*OnWaterStateCallback)();
    enum TYPE { // 데이터 타입.
        TYPE_CONNECT = 'k', // 연결
        TYPE_MSG = 'm', // 메세지
        TYPE_HEART_BEAT = 'h' // 주기적으로 주고 받는 Heart beat
    };
    enum CMD {
        NONE,
        CMD_TH_VALUE = 't', // 온도와 습도를 서버로 보내는 명령.
        CMD_WATER_STATE = 'w' // 물 상태를 서버로 보내는 명령
        
    };
    enum STATUS {STATUS_DISCONNECTED,
        STATUS_MAKING_CONNECTION,
        STATUS_IDLE,
        STATUS_SEND,
        STATUS_WAIT_ACK,
        STATUS_ERROR};
    

    STATUS _status;
    ControlValues _controlValues;
    OnWriteCallback _onWriteCallback;
    OnTHValueCallback _onTHValueCallback;
    OnWaterStateCallback _onWaterStateCallback;
    THValue _thValue;
    uint8_t _pos;
    uint8_t* _buffer;
    uint8_t _buflen;
    long _lastReadMillis;
    long _lastTHSendMillis;
    long _lastWaterStateSendMillis;
    bool _isFilledWater;
    bool _isBusy;
    
    
    void resetBuffer() {
        for(int n = _buflen; n--;) {
            _buffer[n] = 0;
        }
        _pos = 0;
    }
    
    void createHeader(TYPE type, CMD cmd = NONE) {
        resetBuffer();
        _buffer[_pos++] = type;
        _buffer[_pos++] = ':';
        if(cmd != NONE) {
            _buffer[_pos++] = cmd;
        }
    }
    void writeUINT16(uint16_t value) {
        _buffer[_pos++] = (value >> 8) & 0xFF;
        _buffer[_pos++] = value  & 0xFF;
    }
    void writeUINT8(uint8_t value) {
        _buffer[_pos++] = value  & 0xFF;
    }
    
    void appendStringOnBuffer(const char* string, uint8_t len) {
        for(uint8_t i = 0; i < len; ++i) {
            _buffer[_pos++] = string[i];
        }
    }
    
    bool isAckOk() {
        return _buffer[2] == 's';
    }
    
    void updateWaterStateIfNeed() {
        if(_lastReadMillis -  _lastWaterStateSendMillis > DELAY_SEND_Water_STATE && !_isBusy) {
            _lastWaterStateSendMillis = millis();
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
    
    void updateTHValueIfNeed() {
        if(_lastReadMillis -  _lastTHSendMillis > DELAY_SEND_TH_VALUE && !_isBusy) {
            _lastTHSendMillis = millis();
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
    
    
public:
    void setOnWriteCallback(OnWriteCallback onWriteCallback) {
        _onWriteCallback = onWriteCallback;
    }
    void setOnTHValueCallback(OnTHValueCallback onTHValueCallback) {
        _onTHValueCallback = onTHValueCallback;
    }
    void setOnWaterStateCallback(OnWaterStateCallback onWaterStateCallback) {
        _onWaterStateCallback = onWaterStateCallback;
    }

    Controller(uint8_t* buffer, uint8_t length) :
    _status(STATUS_DISCONNECTED), _lastTHSendMillis(0), _lastReadMillis(0),_lastWaterStateSendMillis(0),_isFilledWater(true), _isBusy(false){
        _buflen = length;
        _buffer = buffer;
        resetBuffer();
    };
    
    void makeConnection(const char* key, uint8_t len) {
        if(_status != STATUS_DISCONNECTED) return;
        createHeader(TYPE_CONNECT);
        appendStringOnBuffer(key, len);
        _status = STATUS_MAKING_CONNECTION;
        if(_onWriteCallback != NULL) {
            _onWriteCallback(_buffer, _pos);
        }
    }
    
    void startReceive() {
        resetBuffer();
        _isBusy = true;
    }
    void receive(uint8_t data) {
        _buffer[_pos++] = data;
    }
    void endReceive() {
        _isBusy = false;
        if(_status == STATUS_MAKING_CONNECTION || _status == STATUS_WAIT_ACK) {
            if(!isAckOk()) _status = STATUS_ERROR;
            else _status = STATUS_IDLE;
        }
    }
    bool checkReadTimeout() {
        return false;
    }
    
    bool isConnected() {
        return _status != STATUS_DISCONNECTED && _status != STATUS_ERROR && _status != STATUS_MAKING_CONNECTION;
    }
    bool isWaitData() {
        return _status == STATUS_IDLE;
    }
    bool isBusy() {
        return _isBusy;
    }
    
    void respire() {
        _lastReadMillis = millis();
        if(!isConnected()) return;
        updateTHValueIfNeed();
        updateWaterStateIfNeed();
    }
};

uint8_t buf[BUF_LEN+1];
uint8_t ctrlbuf[BUF_LEN+1];
int sockfd;
Controller ctrl(ctrlbuf,BUF_LEN+1) ;
void write(uint8_t* buffer, uint8_t len) {
    write(sockfd, buffer, len);
}

int t = 0;
int h = 0;
int w = 0;
void onThValue( THValue* const th) {
    th->temperature = t++;
    th->humidity = th->temperature * 2;
}

bool onWaterState() {
    return w++ % 5 == 0;
}

int main(int argc, const char * argv[]) {
    
    ssize_t n;
    struct sockaddr_in server_addr;
    //struct sockaddr_in server_addr : 서버의 소켓주소 구조체
    
    
    
    if((sockfd = socket(PF_INET, SOCK_STREAM, 0)) < 0) {
        printf("can't create socket\n");
        exit(0);
    }
    
    
    bzero((char *)&server_addr, sizeof(server_addr));
    //서버의 소켓주소 구조체 server_addr을 NULL로 초기화
    
    server_addr.sin_family = AF_INET;
    //주소 체계를 AF_INET 로 선택
    server_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    //32비트의 IP주소로 변환
    server_addr.sin_port = htons(11700);
    //daytime 서비스 포트 번호
    
    if(connect(sockfd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {//서버로 연결요청
        printf("can't connect.\n");
        exit(0);
    }
    printf("connect success\n");
    
    ctrl.setOnWriteCallback(write);
    ctrl.setOnTHValueCallback(onThValue);
    ctrl.setOnWaterStateCallback(onWaterState);
    ctrl.makeConnection("beom", strlen("beom"));
    
    n = read(sockfd, buf, BUF_LEN);
    if(n > 0) {
        ctrl.startReceive();
        cout << n << endl;
        for(int i = 0; i < n; ++i) {
            cout << buf[i];
            ctrl.receive(buf[i]);
        }
        cout << endl;
        ctrl.endReceive();
    }

    
    while(ctrl.isConnected()) {
        ctrl.respire();
        if(ctrl.isBusy()) {
            cout << "recv" << endl;
            ctrl.startReceive();
            n = read(sockfd, buf, BUF_LEN);
            if(n != 0) {
                cout << n << endl;
                for(int i = 0; i < n; ++i) {
                    cout << buf[i];
                    ctrl.receive(buf[i]);
                }
                ctrl.endReceive();
            } else {
                break;
            }
        }
    }
    
    
    
    
    
    cout << endl;
    cout << "connected : " <<  ctrl.isConnected()   << endl;

    
    close(sockfd);
    
    
    
    ESPResponseChecker resChecker;
    /*for(int i = 0,n  = sizeof(_buffer); i < n; ++i){
        uint8_t rs = resChecker.putCharAndCheck(_buffer[i]);
        
        if(rs == RES_IPD) {
            cout << "\n" << (int)rs << endl;
            cout << "\n" << (int)resChecker.getPidID() << endl;
            cout << "\n" << (int)resChecker.getPidDataLength() << endl;
        } else if (rs > 0){
            cout << (int)rs << endl;
        }

    }*/

    //cout << string(HTML_SETUP_STR).length() << endl;
    
    /*printf("Start test");
    string testStr = "테스트_테스트&";
    PacketFrame frame;
    const char* test_cstr = testStr.c_str();
    cout << "Source String :  "  << test_cstr << endl;
    cout << "Source String length :  "  << testStr.length() << endl << endl;
    
    frame.setDataLength(testStr.length());
    for(int i = 0; i < testStr.length(); ++i) {
        cout << testStr[i];
        frame.pushData(test_cstr[i]);
    }
    cout<< endl << endl;
    
    printf("bytes length : %d\n", (int)testStr.length());
    byte* packet = frame.getBuffer();
    printf("packet length : %d\n",(int)sizeof(packet));
    printf("packet length valid check : %d\n",(int)packet[3]);
    cout << "assert!\n" << (int)packet[3] << ":" << testStr.length() << endl;
    printf("crc8 : %d\n",(int)packet[24]);
    byte* data = new byte[frame.getDataLength()];
    frame.getData(data);
    cout << "Origin Pakcet :  "  << packet << endl;
    cout << "Origin String :  "  << data << endl;
    delete[] data;
    
    
    int len = frame.getBufferSize();

    PacketFrame receiveFrame;
    printf("test String : %s\n", testStr.c_str());
    for(int i = 0; i < 128; ++i) {
        receiveFrame.update((byte) 0);
    }
    for(int i = 0, n = len; i < n; ++i) {
        receiveFrame.update(packet[i]);
    }
    for(int i = 0; i < 128; ++i) {
        receiveFrame.update((byte) 0);
    }
    cout << "isComplate? " << ((receiveFrame.isReadComplete())?"true":"false") << endl;
    cout << "isValid? " << ((receiveFrame.isValid())?"true":"false") << endl;
    data = new byte[receiveFrame.getDataLength()];
    receiveFrame.getData(data);
    
    cout << "Decoded String :  " << receiveFrame.getBuffer() << endl;
    cout << "Decoded String :  "  << (char*)data << endl;
    cout << "assert!\n" << (int)receiveFrame.getBuffer()[3] << ":" << string((char*)data).length() << endl;
    printf("End test\n\n");
    
    delete[] data;
    test2();*/
}
