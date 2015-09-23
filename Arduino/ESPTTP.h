#pragma once

#include <arduino.h>
#include <SoftwareSerial.h>
#include "EspResponseChecker.h"

/*
 * Wifi_Humidifier
 * https://github.com/ice3x2/Wifi_Humidifier
 * 
 * wifi 가습기 프로젝. 2015.09~ 
 * 마치 비동기처럼 동작하는 ESP8266 HTTP 라이브러리.
 * 영혼없이 만들어서 최적화도 안 되어있고 별 기능 없지만, 
 * Node express 서버와 붙을 때 간혹 연결이 종료가 안 되는 문제가 있다.
 * 이 때, 모듈을 강제 리셋시키는 기능을 구현하였다.
 * 
 * 자세한 사용법은 Arduino.ino 파일을 참고하시오. 
 */


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
  void invokeResponseCallback(Event* ptEvent);
  void cmdResetModule();
  void cmdSetWifiMode();
  void cmdJoinAP();
  void cmdGetIPAddress();
  void cmdCloseCIP();
  void cmdSetMultipleMode();
  void cmdSetServerMode();
  void cmdConnect();
  void cmdSendData();
  void writeData(const char* data, int len);
  void resCmdCheck();
  void pushCMDFunc(cmdFunc func);
  void startReceive();
  void addSendDataCmd();
  HTTP_TYPE checkHttpReadStatus(char data);
  void readReceivedData();
  void checkConnectTimeout();
  void reponseDatasIfNeed();
  void reset();
  bool isEndCall();
  bool runCMDFunc();
  
public :
  inline Options* obtainOptions() {
    return &_options;
  }
  bool isBusy();
  bool commitOption();
  void begin(SoftwareSerial* softwareSerial);
  void setOnResponseCallback(onResponseCallback Callback);
  ESPTTP* serverAddress(String& server);
  ESPTTP* serverAddress(const char* server);
  ESPTTP* port(int port);
  ESPTTP* beginConnect();
  ESPTTP* path(const char* path);
  ESPTTP* path(String& path);
  ESPTTP* body(const char* body);
  void emit();
  void cancel();
  void next(long currentMillis);
};

