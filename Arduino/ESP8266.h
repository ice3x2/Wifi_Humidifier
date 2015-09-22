#pragma once

#include <arduino.h>
#include <SoftwareSerial.h>
#include "EspResponseChecker.h"

#define HTTP_STR_REQ_GET "GET "
#define HTTP_STR_REQ_GET_LEN 4
#define HTTP_STR_REQ_TYPE " HTTP/1.1\r\n"
#define HTTP_STR_REQ_TYPE_LEN 11
#define HTTP_STR_RES_OK "HTTP/1.1 200 OK\r\n"
#define HTTP_STR_RES_OK_LEN 17
#define HTTP_STR_RES_ERROR "HTTP/1.1 404 Not Found\r\n"
#define HTTP_STR_RES_ERROR_LEN 14
#define HTTP_STR_DEF_HEADER "Connection: close\r\nContent-Type: text/html"
#define HTTP_STR_DEF_HEADER_LEN 42
#define HTTP_STR_DEF_HEADER_END "\r\n\r\n"
#define HTTP_STR_DEF_HEADER_END_LEN 4



typedef struct Options {
  bool apMode = false;
  uint16_t port = 80;
  String ssid = "ssid";
  String password = "";
  uint16_t connectTimeout = 5000;
  uint16_t readTimeout = 2000;
} Options;

struct Event {
    enum EVENT_TYPE{FAIL_JOIN_AP,FAIL,REQ,CONTENT,PATH,GET};
    EVENT_TYPE type;
    char* data;
    uint8_t len = 0;
    uint8_t ipdID;
};

class ESPTTP {
  
private :
  typedef void (*onResponseCallback)(Event*);
  typedef void (ESPTTP::*cmdFunc)(void);

  enum HTTP_TYPE{HTTP_META, HTTP_HEADER, HTTP_PATH,HTTP_CONTENT,HTTP_NONE,HTTP_ERROR};
  
  ESPResponseChecker _resChecker;
  onResponseCallback _onResponseCallback;
  Options _options; 
  Event _event;
  HTTP_TYPE _currentHttpDataType;
  String _serverAddress;
  String _path = "/data";
  String _body;
  cmdFunc _cmdQueue[8];
  cmdFunc _currentCall;
  uint8_t _cmdQueueSize = 0;
  int8_t _cmdQueuePos = 0;
  int8_t _connectionIpdID = 0;
  //uint8_t _buffer[BUFFER_SIZE];
  //uint8_t _bufferPos = 0;
  uint8_t _checkNewLineCharacterCount = 0;
  uint16_t _reciveDatapos = 0;
  uint16_t _serverPort = 80;
  uint16_t _resDataForWait = RES_NONE;
  long _currentMillis;
  long _lastMillis; 
  bool _isReceiveLock = false;
  bool _isWaitReceive = false;  
  bool _isResStatusOK = true; 
  bool _isEmitCall = false; 
  
  SoftwareSerial* _ptWifi;
  
private :
  //TODO : 이벤트 큐를 만들고 만약 이벤트에서 FALSE 를 반환하면 다시 이벤트 큐 다시 호출.
  void invokeResponseCallback(Event* ptEvent) {
    if(_onResponseCallback != NULL) {
      
       _onResponseCallback(ptEvent);
    }
  }
  
  void cmdSendWithHttp();
  void cmdCloseConnectionOnServerMode();
  void cmdConnectServerOnClientMode();
  void cmdConnectAPMode();

  void cmdResetModule() {
      _lastMillis = _currentMillis;
      _resDataForWait = RES_RST;
      _ptWifi->print("AT+RST\r\n");
  }
  
  void cmdSetWifiMode() {
      _lastMillis = _currentMillis;
      _resDataForWait = RES_OK | RES_NO_CHANGE;
      _ptWifi->print(String("AT+CWMODE=") + (_options.apMode?"3":"1") + "\r\n");
  }
  
  void cmdJoinAP() {
      _lastMillis = _currentMillis;  
      _ptWifi->print(String("AT+CWJAP=\"") + _options.ssid + "\",\"" +  _options.password + "\"\r\n");
      _resDataForWait = RES_OK | RES_FAIL;
  }

  void cmdGetIPAddress() {
    _resChecker.reset();
      _lastMillis = _currentMillis;  
      _ptWifi->print("AT+CIFSR\r\n");
      _resDataForWait = RES_OK;
  }

  void cmdCloseCIP() {
      _lastMillis = _currentMillis;  
      _resDataForWait = RES_OK | RES_FAIL | RES_ERROR;
      _ptWifi->print("AT+CIPCLOSE=" + String(_connectionIpdID) + "\r\n");
  }
  
  void cmdSetMultipleMode() {
      _lastMillis = _currentMillis;
      _resDataForWait = RES_OK;
      _ptWifi->print(String("AT+CIPMUX=") + (_options.apMode?"1":"0") + "\r\n");
  }
  
  void cmdSetServerMode() {
      _lastMillis = _currentMillis;
      _resDataForWait = RES_OK;
      if(!_options.apMode) {
        _resDataForWait |= RES_ERROR;
      }
      _ptWifi->print("AT+CIPSERVER=" + (_options.apMode?("1," + String(_options.port)):"0") + "\r\n");
  }

  void cmdConnect() {
      //r_ptWifi->print("Connect!!!!!!!!!");
      _lastMillis = _currentMillis;
      _resDataForWait = RES_OK | RES_AC | RES_NOIP | RES_ERROR | RES_DNS_FAIL;
      _ptWifi->print("AT+CIPSTART=\"TCP\",\"" +  _serverAddress  + "\"," + String(_serverPort) + "\r\n");
  }

  void cmdSendData() {
      _lastMillis = _currentMillis;

      uint16_t len = 0;
      if(_options.apMode) {
        len = (_isResStatusOK?HTTP_STR_RES_OK_LEN:HTTP_STR_RES_ERROR_LEN) + HTTP_STR_DEF_HEADER_LEN + HTTP_STR_DEF_HEADER_END_LEN + _body.length();
      } else  {
        len = HTTP_STR_REQ_GET_LEN + _path.length() + HTTP_STR_REQ_TYPE_LEN + HTTP_STR_DEF_HEADER_LEN + HTTP_STR_DEF_HEADER_END_LEN;
      }
      //Serial.print("AT+CIPSEND=" + (_options.apMode? (String(_connectionIpdID) + "," + String(len,DEC)) : String(len,DEC)) + "\r\n");
      _ptWifi->print("AT+CIPSEND=" + (_options.apMode? (String(_connectionIpdID) + "," + String(len)) : String(len)) + "\r\n");
      _ptWifi->find(">");
      delay(20);
      const char* body =  _body.c_str();
      const char* path = _path.c_str();

      if(_options.apMode) {
          writeData(_isResStatusOK?HTTP_STR_RES_OK:HTTP_STR_RES_ERROR, _isResStatusOK?HTTP_STR_RES_OK_LEN:HTTP_STR_RES_ERROR_LEN);
          writeData(HTTP_STR_DEF_HEADER, HTTP_STR_DEF_HEADER_LEN);
          writeData(HTTP_STR_DEF_HEADER_END, HTTP_STR_DEF_HEADER_END_LEN);
          writeData(body, _body.length());
          _body = "";
      } else  {
          writeData(HTTP_STR_REQ_GET,HTTP_STR_REQ_GET_LEN);
          writeData(path, _path.length());
          writeData(HTTP_STR_REQ_TYPE, HTTP_STR_REQ_TYPE_LEN);
          writeData(HTTP_STR_DEF_HEADER, HTTP_STR_DEF_HEADER_LEN);
          writeData(HTTP_STR_DEF_HEADER_END, HTTP_STR_DEF_HEADER_END_LEN);
      }
      _resDataForWait = RES_OK | RES_SEND_OK | RES_ERROR;
  }

  void writeData(const char* data, int len) {
    for(int i = 0; i < len; ++i) {
      //Serial.write(data[i]);
      _ptWifi->write(data[i]);
    }
  }

  void resCmdCheck() {
    
    if(_resChecker.equalRes(RES_FAIL) && _currentCall == &ESPTTP::cmdJoinAP) {
          _event.type = Event::FAIL_JOIN_AP;
          invokeResponseCallback(&_event);
     } 
     else if(_currentCall == &ESPTTP::cmdConnect && (_resChecker.equalRes(RES_NOIP) || _resChecker.equalRes(RES_AC))) {
          reset();
          pushCMDFunc(&ESPTTP::cmdGetIPAddress);
          addSendDataCmd();
     }
     else if(_currentCall == &ESPTTP::cmdConnect && !_resChecker.equalRes(RES_OK)) {
          //reset();
          //pushCMDFunc(&ESPTTP::cmdResetModule);
          //addSendDataCmd();
          _event.data = NULL;
          _event.type = Event::FAIL;
          invokeResponseCallback(&_event);
     }
     else if(_currentCall == &ESPTTP::cmdSendData) {
        if(_resChecker.equalRes(RES_ERROR)) {
           if(_options.apMode) {
              _event.type = Event::FAIL;
              invokeResponseCallback(&_event);
           } else {
              pushCMDFunc(&ESPTTP::cmdResetModule);
              addSendDataCmd();  
           }
        } else if(_resChecker.equalRes(RES_SEND_OK) &&  _options.apMode) {
           reset();
           pushCMDFunc(&ESPTTP::cmdCloseCIP);
        } else if(!_options.apMode) {
            _isWaitReceive = true;  
        }
     }
     else if(_currentCall == &ESPTTP::cmdGetIPAddress /* && strstr(_resChecker.buffer(), "0.0.0.0") != NULL*/) {
        reset(); 
        if(strstr(_resChecker.buffer(), "0.0.0.0") != NULL) {
            pushCMDFunc(&ESPTTP::cmdGetIPAddress);  
        } else {
            addSendDataCmd(); 
        }
     }
    _resDataForWait = RES_NONE;
  }
  


  void pushCMDFunc(cmdFunc func) {
     //Serial.println("_cmdQueueSize : " + String(_cmdQueueSize));
     _cmdQueue[_cmdQueueSize++] = func;
     //Serial.println("pushCMDFunc _cmdQueueSize : " + String(_cmdQueueSize));
  }

  

  void startReceive() {
    //Serial.println("startReceive");
    _isReceiveLock = true;
    _lastMillis = _currentMillis;
    _reciveDatapos = 0;
    _resDataForWait = RES_NONE;
    _cmdQueuePos = 0;
    _cmdQueueSize = 0;
    //_bufferPos = 0;
    _currentHttpDataType = HTTP_META;
    pushCMDFunc(&ESPTTP::readReceivedData);
  }

  void addSendDataCmd() {
     if(!_options.apMode) {
       pushCMDFunc(&ESPTTP::cmdConnect);
     }
     pushCMDFunc(&ESPTTP::cmdSendData);
  }
  
  HTTP_TYPE checkHttpReadStatus(char data) {
    if(_currentHttpDataType == HTTP_META && data == '/') {
        _currentHttpDataType = HTTP_PATH;
        return HTTP_PATH;
    } else if(_currentHttpDataType == HTTP_PATH && data == ' ') {
       return HTTP_HEADER;
    } else if(_currentHttpDataType == HTTP_META && data == '\n') {
       return HTTP_HEADER;
    } else if(_currentHttpDataType == HTTP_HEADER && (data == '\n' || data == '\r')) {
        _checkNewLineCharacterCount++;
        return HTTP_HEADER;
    } else if(_currentHttpDataType == HTTP_HEADER && _checkNewLineCharacterCount >= 4) {
        _currentHttpDataType = HTTP_CONTENT;
        return HTTP_CONTENT;
    }
    _checkNewLineCharacterCount = 0;
    return _currentHttpDataType;
  }

  void readReceivedData() {
    uint16_t len = _resChecker.getIpdDataLength();
    uint16_t resType = (_options.apMode)?RES_OK:RES_UNLINK;
    bool isResATCmdOfEnd = false;
    bool isTimeout = _currentMillis - _lastMillis > _options.readTimeout;
    while(_ptWifi->available()) {
        uint8_t data = _ptWifi->read();
        //Serial.print((char)data);          
        uint8_t rs = _resChecker.putCharAndCheck(data);
        if(_reciveDatapos < len) {
          _currentHttpDataType = checkHttpReadStatus(data);
          if(_currentHttpDataType == HTTP_CONTENT && !_options.apMode) {
            _event.type = Event::CONTENT;
            _event.data = (char*)&data;
            invokeResponseCallback(&_event);
          } else if(_currentHttpDataType == HTTP_PATH && _options.apMode) {
            _event.type = Event::PATH;
            _event.data = (char*)&data;
            invokeResponseCallback(&_event);
          }
          ++_reciveDatapos;
        }
        // 데이터를 모두 받아오지 못한 상황에서 종료 response 가 발견되면 에러 처리해야 한다.
        if(_resChecker.equalRes(resType)) {
           //Serial.println("\nReceiveEnd");
           isResATCmdOfEnd = true;
        }
    }
    reset();
    //_event.http = HTTP_NONE;
    _event.data = 0;
    if(isTimeout && _options.apMode) {
        pushCMDFunc(&ESPTTP::cmdCloseCIP);
        _connectionIpdID = _resChecker.getIpdID();
        _event.type = Event::FAIL;
        _event.ipdID = _connectionIpdID;
        invokeResponseCallback(&_event);
        _resChecker.reset();
    } 
    // 데이터 수신이 성공한 경우. 만약 unlink 가 되지 않아 timeout 이 발생하여도 일단 성공한 것으로 간주한다. 
    else if(isResATCmdOfEnd || (len <= _reciveDatapos && isTimeout)) {
      // unlink 가 되지 않아 timeout 발생시 리셋. 
      if(!isResATCmdOfEnd) {
         pushCMDFunc(&ESPTTP::cmdResetModule);
      }
      _event.type = _options.apMode?Event::REQ:Event::GET;
      _event.ipdID = _options.apMode?_resChecker.getIpdID():0;
      //_bufferPos = _bufferPos >= BUFFER_SIZE?BUFFER_SIZE - 1:_bufferPos;
      //_buffer[_bufferPos] = '\0';
      //_event.data = (char*)_buffer;
      //_event.len = _bufferPos;
      invokeResponseCallback(&_event);
      //_event.data = NULL;
      //_event.len = 0;
      _resChecker.reset();
    } else if(isTimeout) {
       pushCMDFunc(&ESPTTP::cmdResetModule);
       addSendDataCmd();
    } else {
      _isReceiveLock = true;
      pushCMDFunc(&ESPTTP::readReceivedData);
    }
  }

  void checkConnectTimeout() {
      if(_currentCall == &ESPTTP::cmdConnect || _currentCall == &ESPTTP::cmdSendData) {
          bool isConnectTimeout = _currentMillis - _lastMillis > _options.connectTimeout;    
          if(isConnectTimeout) {
              reset();
          }
      }
  }
  

  void reponseDatasIfNeed() {
    if(_isReceiveLock) {
      return;
    }
    while(_ptWifi->available()) {
       uint8_t data = _ptWifi->read();
       Serial.print((char)data);
       _resChecker.putCharAndCheck(data);
       if(_resChecker.isRes(_resDataForWait) && !_isWaitReceive) {
          resCmdCheck();
       } else if(_resChecker.equalRes(RES_IPD)) {
          _isWaitReceive = false; 
          startReceive();
          break;
       }
    }
  }

  void reset() {
      _cmdQueuePos = 0;
      _cmdQueueSize = 0;
      _currentCall = NULL;  
      _isReceiveLock = false;
      _isWaitReceive = false;
      _resDataForWait = RES_NONE;
      _isReceiveLock = false;
  }

  bool isEndCall() {
    return _cmdQueueSize > 0 && _cmdQueueSize == _cmdQueuePos && _resDataForWait == RES_NONE &&  _currentCall != NULL && !_isWaitReceive;
  }

  bool runCMDFunc() {
    bool result = false;
    if(_cmdQueueSize > 0 && _cmdQueueSize > _cmdQueuePos && _resDataForWait == RES_NONE) {
        cmdFunc func = _cmdQueue[_cmdQueuePos++];
        (this->*func)();
        _currentCall = func;
        result = true;
    } else if(isEndCall()) {
      reset();
    } else if(!isBusy() && _isEmitCall) {
      reset();
      addSendDataCmd();
      _isEmitCall = false; 
    }
    return result;
  }
  
public :
  inline Options* obtainOptions() {
    return &_options;
  }
  bool isBusy() {
    return _cmdQueueSize != 0 || _resDataForWait != RES_NONE || _isReceiveLock || _isWaitReceive;
  }
  
  
  bool commitOption() {
     if(isBusy()) return false;
     pushCMDFunc(&ESPTTP::cmdResetModule);
     pushCMDFunc(&ESPTTP::cmdSetWifiMode);
     pushCMDFunc(&ESPTTP::cmdSetMultipleMode);
     //Serial.println(_options.apMode?"true":"false");
     if(!_options.apMode) {
        pushCMDFunc(&ESPTTP::cmdJoinAP);   
     } else {
        pushCMDFunc(&ESPTTP::cmdSetServerMode);
     }
     return true;
  }

  bool requestIPAddress() {
    pushCMDFunc(&ESPTTP::cmdGetIPAddress);
  }
  void begin(SoftwareSerial* softwareSerial) {
    _ptWifi = softwareSerial;
  }
  void setOnResponseCallback(onResponseCallback Callback) {
     _onResponseCallback = Callback;
  }

  ESPTTP* serverAddress(String& server) {
     _serverAddress = server;
     return this;
  }
  
  ESPTTP* serverAddress(const char* server) {
     _serverAddress = server;
     return this;
  }
  ESPTTP* port(int port) {
     _serverPort = port;
     return this;
  }

  ESPTTP* beginConnect() {
    return this;
  }
  
  ESPTTP* path(const char* path)  {
     if(strlen(path) > 0) {
        _path = path;
     }
     return this;
  }
  ESPTTP* path(String& path)  {
     if(path.length() > 0) {
        _path = path;
     }
     return this;
  }
  ESPTTP* body(const char* body)  {
     _body = body;
     return this;
  }
  

  void emit() {
    _connectionIpdID = _event.ipdID;
    _isEmitCall = true;
  }


  void cancel() {
    _isEmitCall = false;
    reset();
  }
  
  
  void next(long currentMillis) {
    _currentMillis = currentMillis;
    runCMDFunc();
    reponseDatasIfNeed();
    checkConnectTimeout();
  }
};

