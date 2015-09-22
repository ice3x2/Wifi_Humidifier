//
//  main.cpp
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 6. 27..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#include <iostream>
#include "ESPResponseChecker.h"
#include "ESPTTP.h"
using namespace std;
typedef bool boolean;
typedef unsigned char byte;
typedef unsigned char uint8_t;

ESPTTP espttp;

void test2();
string arrayPrint(byte* array, int len);
long millis() {
    
    return (long)time(NULL) * 1000;
}

string _bf = "+IPD,160:startReceive\r\nHTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 25
ETag: W/"19-tkOyebZP8Q5q5b+w/ScOKg"
Connection: close

*72*79*71.5*255*255******
OK
1


OK
Unlink


/*"d : Ready..\r\ntrue\r\ntrue\r\n\r\nload offset : 71\r\n104\r\n104\r\nd : version - 104\r\nd : version2 - \r\n104\r\nd : mode - 2\r\nd : ssid - beom\r\nd : pass - taste\r\nd : serverAddr - 192.168.0.12\r\nd : key - beom\r\nd : \r\nport - 8080\r\nintoRunMode\r\nAT+RST\r\nbusy p...\r\nOK\r\nAT+CWMODE=1\r\nno change\r\nd : : no change res checked.\r\nAT+CIPMUX=0\r\nOK\r\nd : : \nALREADY CONNECT res checked.\r\nAT+CIPSERVER=0\r\nERROR\r\nd : : ERROR res check.\r\nAT+CWJAP=beom,taste\"\r\nOK\r\nd : : OK res checked.\r\nAT+CIFSR\r\n\r\n\r\n192.168.0.48\r\n\r\nOK\r\nd : : OK res checked.\r\n455\r\n\r\nAT+CIPSTART=\"TCP\",\"192.168.0.12\",8080\r\nAT+CIPSTART=\"TCP\",\"192.168.0.12\",8080\r\nOK\r\nLinked\r\nconnected\r\n+IPD,4,160:HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nUnlink10\r\nAT\r\n";
*/

int main(int argc, const char * argv[]) {
 
    const char* _buffer = _bf.c_str();
    cout << _bf.size() << endl;
    ESPResponseChecker resChecker;
    for(int i = 0,n  = _bf.size(); i < n; ++i){
        uint16_t rs = resChecker.putCharAndCheck(_buffer[i]);
        
        if(rs == RES_IPD) {
            cout << "IPD\n";
            cout << "\nValue : " << (int)rs << endl;
            cout << "\nID : " << (int)resChecker.getIpdID() << endl;
            cout << "\nLength : " << (int)resChecker.getIpdDataLength() << endl;
        } else if (rs > 0){
            cout << (int)rs << endl;
        }

    }
    
    espttp.requestIPAddress();
    espttp.next(0);
    
    cout << ((512 & 512) == 512);

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
