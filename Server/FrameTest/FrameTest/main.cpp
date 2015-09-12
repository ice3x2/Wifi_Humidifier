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

class StringDeque {
private:
    uint8_t _capacity;
    
};

int main(int argc, const char * argv[]) {
    
    
    
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
