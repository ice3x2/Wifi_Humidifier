//
//  main.cpp
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 6. 27..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#include <iostream>
#include "ESPResponseChecker.h"
#include "Controller.h"

using namespace std;
typedef bool boolean;
typedef unsigned char byte;
typedef unsigned char uint8_t;

void test2();
string arrayPrint(byte* array, int len);
long millis() {
    
    return (long)time(NULL) * 1000;
}


#include <sys/socket.h>
#include <sys/stat.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>


#define BUF_LEN 128
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

void onChangedControlValue(const ControlValues* const value) {
    cout << (int)value->minTemperature << '\n' << (int)value->minHumidity << '\n' <<(int) value->maxHumidity << '\n'
    <<(int) value->powerPWM << '\n' << (int)value->fanPWM << endl;
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
    server_addr.sin_addr.s_addr = inet_addr("192.168.0.12");
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
    ctrl.setOnChangedControlCallback(onChangedControlValue);
    ctrl.makeConnection("beom", strlen("beom"));
    
    n = read(sockfd, buf, BUF_LEN);
    if(n > 0) {
        ctrl.startReceive();
        cout << n << endl;
        for(int i = 0; i < n; ++i) {
            ctrl.receive(buf[i]);
        }
        cout << endl;
        ctrl.endReceive();
    }
    
    n = read(sockfd, buf, BUF_LEN);
    if(n > 0) {
        ctrl.startReceive();
        cout << n << endl;
        for(int i = 0; i < n; ++i) {
            ctrl.receive(buf[i]);
        }
        cout << endl;
        ctrl.endReceive();
    }
    ctrl.respire(millis());
    ctrl.respire(millis());
    ctrl.respire(millis());
    ctrl.respire(millis());
    ctrl.respire(millis());
    ctrl.respire(millis());
    
    while(ctrl.isConnected()) {
        ctrl.respire(millis());
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
