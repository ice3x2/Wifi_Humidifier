#include<arduino.h>
#pragma once
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

class ESPResponseChecker {
private:
    // 버퍼 크기는 Response 값 중에 가장 큰 길이 + 1을 기준으로 한다.
    enum {BufferSize = 12};
    char _strcmpBuffer[BufferSize];
    uint8_t _bufferPos;
    uint8_t _cmpStatus;
    
    void resetBuffer();
    void putChar(char ch);
    void resetStatus();
    void removeStatus(uint8_t status);
    uint8_t eqaulCharInResStr(uint8_t backIdx, char ch, char* resStr,  uint8_t length,uint8_t resType);
    

public:
    ESPResponseChecker();
    void reset();
    uint8_t putCharAndCheck(char ch);
};


