#include "ESPResponseChecker.h"

void ESPResponseChecker::resetBuffer() {
    _bufferPos = 0;
    for(int len = BufferSize; len--;) {
        _strcmpBuffer[len] = 0;
    }
}
void ESPResponseChecker::putChar(char ch) {
    _strcmpBuffer[_bufferPos++] = ch;
    _bufferPos %= BufferSize;
}
void ESPResponseChecker::resetStatus() {
    _cmpStatus = RES_OK | RES_ERROR |  RES_NC | RES_LINK | RES_UNLINK | RES_IPD;
}
void ESPResponseChecker::removeStatus(uint8_t status) {
    _cmpStatus &= ~status;
}

uint8_t ESPResponseChecker::eqaulCharInResStr(uint8_t backIdx, char ch, char* resStr,  uint8_t length,uint8_t resType) {
    if(backIdx >= length || resStr[length - backIdx - 1] == ch) return RES_NONE;
    return resType;
}



ESPResponseChecker::ESPResponseChecker():
_bufferPos(0) {
    resetBuffer();
}

void ESPResponseChecker::reset() {
  resetStatus();
  resetBuffer();
}

uint8_t ESPResponseChecker::putCharAndCheck(char ch) {
    putChar(ch);
    resetStatus();
    for(int i = _bufferPos + BufferSize,pos = 0, j = 0;(pos = --i % BufferSize) != _bufferPos;++j) {
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_OK_STR, RES_OK_LEN,RES_OK));
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_ERROR_STR, RES_ERROR_LEN,RES_ERROR));
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_NC_STR, RES_NC_LEN,RES_NC));
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_LINK_STR, RES_LINK_LEN,RES_LINK));
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_UNLINK_STR, RES_UNLINK_LEN,RES_UNLINK));
        removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_IPD_STR, RES_IPD_LEN,RES_IPD));
    }
    return _cmpStatus;
}

