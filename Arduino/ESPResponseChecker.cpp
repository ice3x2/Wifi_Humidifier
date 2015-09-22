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
    _cmpStatus = RES_OK | RES_ERROR |  RES_NO_CHANGE | RES_LINK | RES_UNLINK |  RES_IPD | RES_SEND_OK | RES_FAIL | RES_AC | RES_RST | RES_NOIP | RES_FATAL | RES_DNS_FAIL;
}
void ESPResponseChecker::removeStatus(uint16_t status) {
    _cmpStatus &= ~status;
}

uint16_t ESPResponseChecker::eqaulCharInResStr(uint8_t backIdx, char ch, char* resStr,  uint8_t length,uint16_t resType) {
    if(backIdx >= length || resStr[length - backIdx - 1] == ch) {
        return RES_NONE;
    }
    return resType;
}



ESPResponseChecker::ESPResponseChecker():
_bufferPos(0) {
    resetBuffer();
    resetIPD();
}

void ESPResponseChecker::reset() {
    resetStatus();
    resetBuffer();
    resetIPD();
}


int16_t ESPResponseChecker::getIpdID() {
    return _ipdID;
}
int16_t ESPResponseChecker::getIpdDataLength() {
    return _ipdDataLength;
}

uint16_t ESPResponseChecker::readIPDMode(char ch) {
    if(ch == ',' && _ipdDataLength == -1) {
        _ipdDataLength = atoi(_strcmpBuffer);
        resetBuffer();
    } else if(ch == ':') {
        if(_ipdID == -1) {
            _ipdID = _ipdDataLength;
            _ipdDataLength = atoi(_strcmpBuffer);
            resetBuffer();
        }
        resetStatus();
        _isIPDReadMode= false;
        _cmpStatus = RES_IPD;
        return RES_IPD;
    } else {
        putChar(ch);
    }
    return RES_NONE;
}

void ESPResponseChecker::resetIPD() {
    _ipdDataLength = -1;
    _ipdID = -1;
}


bool ESPResponseChecker::isRes(uint16_t res) {
   if(res == RES_NONE || _cmpStatus == RES_NONE) return false;
   return (res & _cmpStatus) == _cmpStatus;
}


uint16_t ESPResponseChecker::putCharAndCheck(char ch) {
    if(_isIPDReadMode) {
        return readIPDMode(ch);
    } else {
        putChar(ch);
        resetStatus();
        for(int i = _bufferPos + BufferSize,pos = 0, j = 0;(pos = --i % BufferSize) != _bufferPos;++j) {
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_OK_STR, RES_OK_LEN,RES_OK));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_ERROR_STR, RES_ERROR_LEN,RES_ERROR));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_NO_CHANGE_STR, RES_NO_CHANGE_LEN,RES_NO_CHANGE));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_LINK_STR, RES_LINK_LEN,RES_LINK));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_UNLINK_STR, RES_UNLINK_LEN,RES_UNLINK));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_IPD_STR, RES_IPD_LEN,RES_IPD));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_SEND_OK_STR, RES_SEND_OK_LEN,RES_SEND_OK));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_FAIL_STR, RES_FAIL_LEN,RES_FAIL));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_AC_STR, RES_AC_LEN,RES_AC));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_RST_STR, RES_RST_LEN,RES_RST));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_NOIP_STR, RES_NOIP_LEN,RES_NOIP));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_FATAL_STR, RES_FATAL_LEN,RES_FATAL));
            removeStatus(eqaulCharInResStr(j, _strcmpBuffer[pos], (char*)RES_DNS_FAIL_STR, RES_DNS_FAIL_LEN,RES_DNS_FAIL));
            if(_cmpStatus == RES_NONE) {
                break;
            }
        }
        if((_cmpStatus & RES_IPD) == RES_IPD) {
            _isIPDReadMode = true;
            resetBuffer();
            resetIPD();
            _cmpStatus = RES_NONE;
        }
        return _cmpStatus;
    }
}

