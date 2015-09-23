
/*
 * Wifi_Humidifier
 * https://github.com/ice3x2/Wifi_Humidifier
 * 
 * wifi 가습기 프로젝. 2015.09~ 
 * ESP8266 AT+Commnad Response 값 타입을 검사하여 반환하는 클래스.
 * 
 * ESPTTP.h 에서 include 한다.
 *   
 */



#ifdef TEST
#include <iostream>
#else
#include <arduino.h>
#endif


#pragma once
#define RES_OK 0x01
#define RES_ERROR 0x02
#define RES_NO_CHANGE 0x04
#define RES_LINK 0x08
#define RES_UNLINK 0x10
#define RES_IPD 0x20
#define RES_SEND_OK 0x40
#define RES_FAIL 0x80
#define RES_AC 0x100
#define RES_RST 0x200
#define RES_NOIP 0x400
#define RES_FATAL 0x1000 
#define RES_DNS_FAIL 0x2000 
#define RES_SERROR 0x4000
#define RES_NONE 0


class ESPResponseChecker {
private:
    // 버퍼 크기는 Response 값 중에 가장 큰 길이 + 1을 기준으로 한다.
    enum {BufferSize = 17};
    uint16_t _cmpStatus = RES_NONE;
    int16_t _ipdID;
    int16_t _ipdDataLength;
    uint8_t _bufferPos;
    char _strcmpBuffer[BufferSize];
    bool _isIPDReadMode = false;
    
    void resetBuffer();
    void putChar(char ch);
    void resetStatus();
    void removeStatus(uint16_t status);
    void resetIPD();
    uint16_t readIPDMode(char ch);
    uint16_t eqaulCharInResStr(uint8_t backIdx, char ch, char* resStr,  uint8_t length,uint16_t resType);
    
public:
    inline bool equalRes(uint16_t res) {
      return res == _cmpStatus;
    }
    inline const char* buffer() {
      return _strcmpBuffer;
    }
    inline uint8_t bufferLen() {
      return BufferSize;
    }
    
    ESPResponseChecker();
    bool isRes(uint16_t);

    
    void reset();
    int16_t getIpdID();
    int16_t getIpdDataLength();
    uint16_t putCharAndCheck(char ch);
};


