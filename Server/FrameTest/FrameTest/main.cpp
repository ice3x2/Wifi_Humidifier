//
//  main.cpp
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 6. 27..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#include <iostream>
#include "Frame.h"
#include "ESPResponseChecker.h"

using namespace std;
typedef bool boolean;
typedef unsigned char byte;
typedef unsigned char uint8_t;

void test2();
string arrayPrint(byte* array, int len);



#define RES_OK_STR "\r\nOK"
#define RES_OK_LEN 4
#define RES_OK 0x01
#define RES_ERROR_STR "\r\nERROR"
#define RES_ERROR_LEN 7
#define RES_ERROR 0x02
#define RES_NC_STR "no change\r\n"
#define RES_NC_LEN 11
#define RES_NC 0x04
#define RES_UNKNOWN_STR "\r\n"
#define RES_UNKNOWN_LEN 2
#define RES_LINK_STR "Link\r\n"
#define RES_LINK_LEN 6
#define RES_LINK 0x08
#define RES_UNLINK_STR "\r\nUnlink"
#define RES_UNLINK_LEN 8
#define RES_UNLINK 0x10
#define RES_IPD_STR "\r\n+IPD,"
#define RES_IPD_LEN 7
#define RES_IPD 0x20
#define RES_MAX_LEN 11
#define RES_NONE 0

#define HTML_SETUP_STR "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\n"


#include <sys/socket.h>
#include <sys/stat.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>


#define BUF_LEN 128


class Controller {
    
private:
    typedef void (*funcWrite)(uint8_t*,uint8_t);
    enum TYPE { TYPE_CONNECT = 'k', TYPE_MSG = 'm',TYPE_HEART_BEAT = 'h'};
    enum CMD {NONE};
    enum STATUS {STATUS_DISCONNECTED, STATUS_MAKING_CONNECTION,STATUS_IDLE,STATUS_SEND, STATUS_RECEIVE,STATUS_ERROR  };
    bool _isBusy = false;
    STATUS _status;
    uint8_t _pos;
    uint8_t _receiveLength;
    uint8_t* _buffer;
    uint8_t _buflen;
    funcWrite _writer;
    
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
    void appendStringOnBuffer(const char* string, uint8_t len) {
        for(uint8_t i = 0; i < len; ++i) {
            _buffer[_pos++] = string[i];
        }
    }
    
    bool isAckOk() {
        return _buffer[2] == 's';
    }
    bool isAckError() {
        return _buffer[2] == 'e';
    }
    
public:
    
    void setWriteFunc(funcWrite writer) {
        _writer = writer;
    }

    Controller(uint8_t* buffer, uint8_t length) : _status(STATUS_DISCONNECTED),_receiveLength(0) {
        _buflen = length;
        _buffer = buffer;
        resetBuffer();
    };
    
    void makeConnection(const char* key, uint8_t len) {
        if(_status != STATUS_DISCONNECTED) return;
        createHeader(TYPE_CONNECT);
        appendStringOnBuffer(key, len);
        _status = STATUS_MAKING_CONNECTION;
        if(_writer != NULL) {
            _writer(_buffer, _pos);
        }
    }
    
    void startReceive(uint8_t len) {
        resetBuffer();
        _isBusy = true;
        _receiveLength = len;
    }
    void receive(uint8_t data) {
        _buffer[_pos++] = data;
        if(_pos >= _receiveLength) {
            endReceive();
        }
    }
    void endReceive() {
        _isBusy = false;
        if(_status == STATUS_MAKING_CONNECTION) {
            if(isAckError()) _status = STATUS_ERROR;
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
};

uint8_t buf[BUF_LEN+1];
int sockfd;
Controller ctrl(buf,BUF_LEN+1) ;
void write(uint8_t* buffer, uint8_t len) {
    write(sockfd, buffer, len);
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
    
    
    
    ctrl.setWriteFunc(write);
    ctrl.makeConnection("beom", strlen("beom"));
    
    n = read(sockfd, buf, BUF_LEN);
    ctrl.startReceive(n);
    for(int i = 0; i < n; ++i) {
        ctrl.receive(buf[i]);
    }
    cout << "connected : " + ctrl.isConnected()   << endl;

    
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


void test2() {
    printf("Start test2");
    PacketFrame frame;
    byte array[20];
    for(int i = 0; i < 20; ++i) {
        array[i] = i * 2;
    }
    cout << "Source String :  "  << arrayPrint(array, 20) << endl;
    cout << "Source String length :  "  << 20 << endl << endl;
    
    frame.setDataLength(20);
    for(int i = 0; i < 20; ++i) {
        frame.pushData(array[i]);
    }
    
    printf("bytes length : %d\n", frame.getDataLength());
    byte* packet = frame.getBuffer();
    printf("packet length : %d\n",(int)sizeof(packet));
    printf("packet length valid check : %d\n",(int)packet[3]);
    cout << "assert!\n" << (int)packet[3] << ":" << 20 << endl;
    printf("crc8 : %d\n",(int)packet[24]);
    byte* data = new byte[frame.getDataLength()];
    frame.getData(data);
    cout << "Origin Pakcet :  "  << packet << endl;
    cout << "Origin String :  "  << arrayPrint(data, 20) << endl;
    delete[] data;
    
    cout << endl;
    
    
    int len = frame.getBufferSize();
    
    PacketFrame receiveFrame;
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
    cout << "Decoded String :  "  << arrayPrint(data, 20) << endl;
    cout << "assert!\n" << (int)receiveFrame.getBuffer()[3] << ":" << string((char*)data).length() << endl;
    printf("End test");
    
    delete[] data;

    
}


string arrayPrint(byte* array, int len) {
    string strArray = "";
    for(int i = 0; i < len; ++i) {
        strArray += to_string(array[i]);
        strArray += " ,";
    }
    return strArray;
    
}