
#ifdef TEST 
  #include <iostream>
#else
  #include <arduino.h>
#endif


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
#define RES_UNLINK_STR "\nUnlink"
#define RES_UNLINK_LEN 7
#define RES_UNLINK 0x10
#define RES_IPD_STR "\r\n+IPD,"
#define RES_IPD_LEN 7
#define RES_IPD 0x20
#define RES_SEND_OK_STR "\r\nSEND OK"
#define RES_SEND_OK_LEN 9
#define RES_SEND_OK 0x40
#define RES_FAIL_STR "\r\nFAIL"
#define RES_FAIL_LEN 6
#define RES_FAIL 0x80
#define RES_MAX_LEN 11
#define RES_NONE 0


class ESPResponseChecker {
private:
    // 버퍼 크기는 Response 값 중에 가장 큰 길이 + 1을 기준으로 한다.
    enum {BufferSize = 12};
    char _strcmpBuffer[BufferSize];
    uint8_t _bufferPos;
    uint8_t _cmpStatus;
    int16_t _ipdID;
    int16_t _ipdDataLength;
    bool _isIPDReadMode = false;
    
    void resetBuffer();
    void putChar(char ch);
    void resetStatus();
    void removeStatus(uint8_t status);
    void resetIPD();
    uint8_t readIPDMode(char ch);
    
    uint16_t eqaulCharInResStr(uint8_t backIdx, char ch, char* resStr,  uint8_t length,uint16_t resType);
    
    
    
public:
    ESPResponseChecker();
    void reset();
    int16_t getIpdID();
    int16_t getIpdDataLength();
    uint16_t putCharAndCheck(char ch);
};


