#include <SoftwareSerial.h>
#include <EEPROM.h>
#include <DHT22.h>
#include "EspResponseChecker.h"
#include "Controller.h"

#define WIFI_RX 2
#define WIFI_TX 3

#define FAN_CTR 9
#define PW_CTR 6

#define LED_PIN 13
#define RESET_PIN 0
#define DHT22_PIN 7
#define WATERGAUGE_PIN 2

#define BUFF_SIZE 128
#define DEBUG

#define VER 104
#define MODE_SETUP 1
#define MODE_RUN 2
#define MODE_ERROR 3

#define DELAY_PUSH_SETUP 5000

#define DELAY_LED_WAIT 1500
#define DELAY_LED_SETUP 500
#define DELAY_LED_ERROR 50

// 제어 값을 담고 있는 _controlValues 배열의 각 인덱스가 의미하는 값을 정의.
#define CONTROL_VALUE_MIN_HUMIDITY 0
#define CONTROL_VALUE_MAX_HUMIDITY 1
#define CONTROL_VALUE_DISCOMFORT_INDEX 2
#define CONTROL_VALUE_PWR_PWM 3
#define CONTROL_VALUE_FAN_PWM 4



#define STATE_PUSH_BUTTON 1
#define STATE_ON_SEND_STATUS 1 << 1
#define STATE_ON_SEND_ERROR 1 << 2


typedef struct Config {
  uint8_t version = VER;
  uint8_t mode = MODE_SETUP;
  char ssid[16] = "unknown";
  char pass[16] = "unknown";
  char serverAddr[24] = "unknown";
  char key[8] = "unknown";
  uint32_t port = 80;
  uint8_t tailVersion = VER;
} CONFIG;


uint16_t sendATCmd(const char* cmd, int timeout = 0, uint8_t* buffer = NULL, int bufSize = 16);
bool isResCheckOk(uint8_t checkResresult);
bool checkConfig(CONFIG* config);
void sendHttpData(int ipdID, const char* message, uint8_t length);
void intoSetupMode(bool force = false);
bool intoRunMode();
void setMode();
void showStatusLed();
void saveConfig();
void loadConfig();
//void flushForEsp8266Buffer();
void printConfig(CONFIG* config);
bool sendData(const char* data, int length, int timeout = -1, int ipdID = -1);
bool connectServer(int timeout = -1);
void onReadThValueCallback(THValue* const th);
void onPWMControlCallback(uint8_t powerPWM, uint8_t fanPWM);
void onWriteCallback(uint8_t* buffer, uint8_t len);
bool onWaterStateCallback();
void resetBuffer();
uint8_t closeConnection(int ipdID = -1);





// 상태값 제어 함수.
void addState(uint16_t state);
void removeState(uint16_t state);
bool isState(uint16_t state);

uint16_t _state = 0;
uint8_t _buffer[BUFF_SIZE];
uint8_t _controlValues[5] = {0, 0, 255, 255, 255};
//char _httpPacket[142] = "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\n";
uint8_t _bufferIdx = 0;
uint8_t _dataState = 0;
long _lastClickMillis = 0;
long _lastOnLedMillis = 0;
DHT22 _dht22(DHT22_PIN);
CONFIG _config;
THValue _thValue;
SoftwareSerial wifi(WIFI_RX, WIFI_TX);
ESPResponseChecker _resChecker;
//Controller _ctrl(_buffer,BUFF_SIZE);




void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  //pinMode(RESET_PIN,INPUT);
  wifi.begin(9600);

  Serial.begin(115200);
  Serial.println("d : Ready..");

  loadConfig();
  if (!checkConfig(&_config)) {
    _config = Config();
    printConfig(&_config);
  }
  else {
    printConfig(&_config);
  }

  if (_config.mode == MODE_SETUP) {
    intoSetupMode(true);
  } else if (_config.mode == MODE_RUN) {
    if (!intoRunMode()) {
      _config.mode = MODE_ERROR;
    }
    delay(1000);
    sendATCmd("AT+CIFSR\r\n");
    
  }
}

long _lastSendStatusMillis = 0;
void loop() {
  if (analogRead(RESET_PIN) > 1000 && !isState(STATE_ON_SEND_STATUS)) {
    addState(STATE_PUSH_BUTTON);
    if (_lastClickMillis == 0) {
      _lastClickMillis = millis();
    } else if (millis() - _lastClickMillis > DELAY_PUSH_SETUP) {
      intoSetupMode();
    }
  } else {
    removeState(STATE_PUSH_BUTTON);
  }
  showStatusLed();
  sendResponseOnSetupMode();
  if(!sendStatusData()) {
    checkAP();
  }
  



  /*if(_ctrl.isConnected() && _dataState == DATA_STATE_WAIT) {
     _ctrl.respire(millis());
  }*/
}

void sendResponseOnSetupMode() {
   uint8_t ipdID = 0;
  if (wifi.available() && _config.mode == MODE_SETUP) {
    uint8_t data = wifi.read();
    uint8_t resStatus =  _resChecker.putCharAndCheck(data);
    if (resStatus == RES_IPD) {
      ipdID = _resChecker.getIpdID();
      int8_t pos = -1;
      bool isFindEndGetPath = false;
      // ipd 반환값을 통하여 가져온 길이만큼 반복한다.
      long startMillis = millis();
      for (int i = 0, len = _resChecker.getIpdDataLength(); i < len && millis() - startMillis < 8000;) {
        // 데이터가 있을 경우.
        if (wifi.available()) {
          data = wifi.read();
          //Serial.print((char)data);
          // 데이터가 유효할 경우에만 현재 길이 값에 +1 을 해준다.
          ++i;
          if(pos >= 0 && data == ' ') {
            if(pos == 5) {
               _config.port = atoi((const char *)_buffer);
               ++pos;
            }
            isFindEndGetPath = true;
          }
          if (data == '/' && !isFindEndGetPath) {
            if (pos == 0 && strcmp((char*)_buffer,"set") != 0)  {
               Serial.println((char*)_buffer);
                pos = -64;                
            }              
            if (pos == 1) 
              strcpy(_config.ssid, (const char *)_buffer);
            if (pos == 2) 
              strcpy(_config.pass, (const char *)_buffer);
            if (pos == 3) 
              strcpy(_config.serverAddr, (const char *)_buffer);  
            if (pos == 4) 
              strcpy(_config.key, (const char *)_buffer);
            if (pos == 5) 
              _config.port = atoi((const char *)_buffer);
             pos++;
            resetBuffer();
          } else {
            _buffer[_bufferIdx++ % BUFF_SIZE] = data;
          }
        }
      } // end for
      Serial.println(pos);
      if (pos < 6) {
          String cmd = "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\nURL input for setup.\nhttp://192.168.4.1/set/[AP SSID]/[Password]/[server ip]/[key]/[port]";
          sendData(cmd.c_str(), cmd.length(),8000, ipdID);
          closeConnection(ipdID);
      } else {  
          //printConfig(&_config);
          String cmd = "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\n";
          cmd += "ssid : ";  cmd += _config.ssid; cmd += "\n";
          cmd += "password : ";  cmd += _config.pass; cmd += "\n";
          cmd += "server : ";  cmd += _config.serverAddr; cmd += "\n";
          cmd += "key : ";  cmd += _config.key; cmd += "\n";
          cmd += "port : ";  cmd += _config.port; cmd += "\n";
          cmd += "OK. Please reboot."; cmd += "\n";
          sendData(cmd.c_str(), cmd.length(),8000, ipdID);
          _config.mode = MODE_RUN;
          saveConfig();
          printConfig(&_config);
          _config.mode = MODE_SETUP;
          closeConnection(ipdID);
      }
    }
  }
}

uint8_t closeConnection(int ipdID) {
  String closeCommand = "AT+CIPCLOSE";
  if(ipdID >= 0) {
    closeCommand += '=';
    closeCommand += ipdID;
  }
  closeCommand += "\r\n";
  return sendATCmd(closeCommand.c_str());
}

bool sendStatusData() {
  if (millis() - _lastSendStatusMillis < 500 || _config.mode != MODE_RUN) {
    return true;
  }
  readTHVlaue();
  uint8_t valuesForRollback[5];
  memcpy(valuesForRollback, _controlValues, 5);
  _resChecker.reset();
  if (isState(STATE_PUSH_BUTTON)) return true;
  addState(STATE_ON_SEND_STATUS);
  String strStatus =  "GET /data?key=";
  strStatus += _config.key;
  strStatus += "&t=";
  strStatus +=  _thValue.temperature;
  strStatus += "&h=";
  strStatus += _thValue.humidity;
  strStatus += "&w=";
  strStatus += "0";
  strStatus += " HTTP/1.0\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n";
  if (!connectServer(3000)) {
    Serial.println("c--error");
    removeState(STATE_ON_SEND_STATUS);
    addState(STATE_ON_SEND_ERROR);
    _lastSendStatusMillis = millis();
    return false;
  }
  Serial.println("connected server");
  if(!sendData(strStatus.c_str(), strStatus.length(), 2000)) {
    resetRunMode();
    return true;
  }
  Serial.println("send data");
  //resetBuffer();
  //_resChecker.reset();
  //delay(2000);
  int8_t posOfControlValue = -1;
  bool readStart = false;
  bool isUnliked = false;
  long startResponseWaitTime = millis();
  int dataLen = 0;
  int dataIdx = -1;
  while (millis() - startResponseWaitTime < 8000) {
    if(wifi.available()) {
      uint8_t data = wifi.read();
      Serial.print((char)data);
       if (!readStart && _resChecker.putCharAndCheck(data) == RES_IPD) {
          readStart = true;
          dataLen = _resChecker.getIpdDataLength();
          dataIdx = 0;
       }
       if(dataIdx >= dataLen && _resChecker.putCharAndCheck(data) == RES_UNLINK)  {
          isUnliked = true;
          break;
       }
       if(readStart) {
         if(data == '*') {
           if(posOfControlValue >= 0 && posOfControlValue < 5) {
              Serial.println("");
              Serial.println("---");
              _controlValues[posOfControlValue] = atoi((const char*)_buffer);
              Serial.println(_controlValues[posOfControlValue]);
            }
            posOfControlValue++;
            resetBuffer();
          } else {
            _buffer[_bufferIdx++ % BUFF_SIZE] = data;
          } 
          dataIdx++;
       }
    }
  }
  if(!isUnliked) {
    resetRunMode();
  }
  
  while(wifi.available()) {
    wifi.read();
    delay(1);
  }
  
  //flushForEsp8266Buffer();
  removeState(STATE_ON_SEND_STATUS);
  Serial.println(posOfControlValue);
  if (posOfControlValue >= 5) {
    removeState(STATE_ON_SEND_ERROR);
  } else {
     
    memcpy(_controlValues, valuesForRollback, 5);
    addState(STATE_ON_SEND_ERROR);
  }
  _lastSendStatusMillis = millis();
  while(wifi.available()) {
    wifi.read();
  }
  sendATCmd("AT\r\n");
  return true;
  
}
void addState(uint16_t state) {
  _state = _state | state;
}
void removeState(uint16_t state) {
  _state &= ~state;
}
bool isState(uint16_t state) {
  return state == _state & state ;
}


bool sendData(const char* data, int length, int timeout, int ipdID) {
  delay(500);
  _resChecker.reset();
  long startMillis = millis();
  bool isTimeout = true;
  wifi.print("AT+CIPSEND=");
  if (ipdID > -1) {
    wifi.print(ipdID);
    wifi.print(",");
  }
  wifi.print(length, DEC);
  wifi.print("\r\n");
  Serial.println("---- send ok");
  // AT+CIPSEND 명령 전송 에이후 '>' 문자가 출력되기를 기다린다.
  while(millis() - startMillis < timeout || timeout < 1) {
    if(wifi.available()) {
       uint8_t data = wifi.read();
       isTimeout = false; 
       break;
    }
  }
  if(isTimeout) {
    return false;     
  }
  startMillis = millis();
  // > 문자 출력 이후에 20ms 딜레이를 주는 것이 좋다고함.
  delay(20);
  isTimeout = true;
  for(int i = 0; i < length; ++i) {
    wifi.write(data[i]);    
  }
  Serial.println("---- send ok");
  while(millis() - startMillis < timeout || timeout < 1) {
    if(wifi.available()) {
       uint8_t data = wifi.read();
       if(_resChecker.putCharAndCheck(data) != RES_NONE) {
          isTimeout = false; 
          break;
       }
    }
  }
  if(isTimeout) {
    return false;     
  }
  return true;
}




/**
 * Buffer 에 있는 내용을 모두 0으로 채운다. memset 함수가 종종 이상하게 동작하여 느러도 이 것으로 대체.
 */
void resetBuffer() {
  _bufferIdx = 0;
  for (int i = BUFF_SIZE; i--;) {
    _buffer[i] = 0;
  }
}


void showStatusLed() {
  int delayMillis = 0;
  if (_config.mode == MODE_SETUP) {
    delayMillis = DELAY_LED_SETUP;
  }
  else if (_config.mode == MODE_RUN) {
    digitalWrite(LED_PIN, LOW);
    return;
  }
  else if (_config.mode == MODE_ERROR) {
    delayMillis = DELAY_LED_ERROR;
  }
  if (millis() - _lastOnLedMillis < delayMillis) {
    digitalWrite(LED_PIN, HIGH);
  } else if (millis() - _lastOnLedMillis < (delayMillis + delayMillis))  {
    digitalWrite(LED_PIN, LOW);
  } else if (millis() - _lastOnLedMillis > (delayMillis + delayMillis))  {
    _lastOnLedMillis = millis();
    digitalWrite(LED_PIN, HIGH);
  }
}
void setMode() {
  if (_config.mode == MODE_SETUP) {
    intoSetupMode();
  }
}

void intoSetupMode(bool force) {
  if (_config.mode == MODE_SETUP && !force) return;
  _config.mode = MODE_SETUP;
  saveConfig();
  sendATCmd("AT+RST\r\n", 2000);
  sendATCmd("AT+CWMODE=3\r\n");
  sendATCmd("AT+CIPMUX=1\r\n");
  sendATCmd("AT+CIPSERVER=1,80\r\n");
}

bool intoRunMode() {
  Serial.println("intoRunMode");
  _config.mode = MODE_RUN;
  //saveConfig();
  //sendATCmd("AT+RST\r\n", 2000);
  sendATCmd("AT+RST\r\n", 2000);
  sendATCmd("AT+CWMODE=1\r\n");
  sendATCmd("AT+CIPMUX=0\r\n");
  sendATCmd("AT+CIPSERVER=0\r\n");
 
  return connectAP();
}

bool resetRunMode() {
  _config.mode = MODE_RUN;
  sendATCmd("AT+RST\r\n", 2000); 
  return true;
}

bool checkAP() {
  resetBuffer();
  // IP 주소를 가져와서 AP 와 연결이 끊겼다면 재접속 한다.
  sendATCmd("AT+CIFSR\r\n", 2000, _buffer, BUFF_SIZE); 
  if(String((char*)_buffer).indexOf("0.0") >= 0) {
    return connectAP();  
  }
}


bool connectServer(int timeout) {
  String cmd = "AT+CIPSTART=";
  cmd += "\"TCP\",\"";
  cmd += _config.serverAddr;
  cmd += "\",";
  cmd += _config.port;
  cmd += "\r\n";
  Serial.println(cmd);
  uint8_t result = sendATCmd(cmd.c_str(), timeout, _buffer, BUFF_SIZE);
  String resultStr = (char*)_buffer;
  return resultStr.indexOf("ALREAY CONNECT") > 0 || resultStr.indexOf("Linked") > 0 || result == RES_OK;
}

bool connectAP() {
  String apCmd = "AT+CWJAP=\"";
  apCmd += _config.ssid;
  apCmd += "\",\"";
  apCmd += _config.pass;
  apCmd += "\"\r\n";
  uint8_t result =  sendATCmd(apCmd.c_str());
  return  result != RES_ERROR && result != RES_FAIL;
}

uint16_t sendATCmd(const char* cmd, int timeout, uint8_t* buffer, int bufSize) {
  int bufIdx = 0;
  uint8_t resIdx = 0;
  uint8_t data = 0;
  uint16_t resStatus = 0;
  long lastMs = millis();
  _resChecker.reset();
  wifi.print(cmd);
  while (!wifi.available() && (millis() - lastMs < timeout || timeout == 0));
  while (millis() - lastMs < timeout || timeout == 0) {
    while (wifi.available()) {
      data = wifi.read();
#ifdef DEBUG
      Serial.write((char)data);
#endif
      if (buffer != NULL) {
        buffer[bufIdx % bufSize] = data;
      }

      bufIdx++;
      if (timeout == 0) {
        resStatus = _resChecker.putCharAndCheck(data);
        if (resStatus == RES_NONE) {
          resIdx = 0;
        } else if (resStatus != RES_NONE) {
#ifdef DEBUG
          Serial.println();
          if (resStatus == RES_OK)
            Serial.println("d : : OK res checked.");
          else if (resStatus == RES_ERROR)
            Serial.println("d : : ERROR res check. ");
          else if (resStatus == RES_NC)
            Serial.println("d : : no change res checked.");
#endif
          timeout = 1;
          break;
        }
      }
    }
  }
  while (wifi.available()) {
    wifi.read();
  }
  return resStatus;
}

bool isResCheckOk(uint8_t checkResresult) {
  return (checkResresult & 0x80) == 0x80;
}
bool equalResType(uint8_t refResLen, uint8_t targetResLen) {
  return (targetResLen & ~0x80) == refResLen;
}



void loadConfig() {
  int offset = 0;
  _config.version = EEPROM.read(offset++);
  EEPROM.read(offset++);
  _config.mode = 2;//
  for (int i = 0, n = sizeof(_config.ssid); i < n; ++i)
    _config.ssid[i] = EEPROM.read(offset++);

  for (int i = 0, n = sizeof(_config.pass); i < n; ++i)
    _config.pass[i] = EEPROM.read(offset++);

  for (int i = 0, n = sizeof(_config.serverAddr); i < n; ++i)
    _config.serverAddr[i] = EEPROM.read(offset++);

  for (int i = 0, n = sizeof(_config.key); i < n; ++i)
    _config.key[i] = EEPROM.read(offset++);

  uint8_t port[4];
  port[0] = EEPROM.read(offset++); 
  port[1] = EEPROM.read(offset++);
  port[2] = EEPROM.read(offset++);
  port[3] = EEPROM.read(offset++);
  _config.port =  (port[0] << 24) + (port[1] << 16) + (port[2] << 8) +  port[3];
  _config.tailVersion = EEPROM.read(offset++);
  Serial.print("load offset : ");
  Serial.println(offset);
}


void saveConfig() {
  int offset = 0;
  EEPROM.write(offset++, _config.version);
  EEPROM.write(offset++, _config.mode);
  for (int i = 0, n = sizeof(_config.ssid); i < n; ++i)
    EEPROM.write(offset++, _config.ssid[i]);

  for (int i = 0, n = sizeof(_config.pass); i < n; ++i)
    EEPROM.write(offset++, _config.pass[i]);

  for (int i = 0, n = sizeof(_config.serverAddr); i < n; ++i)
    EEPROM.write(offset++, _config.serverAddr[i]);

  for (int i = 0, n = sizeof(_config.key); i < n; ++i)
    EEPROM.write(offset++, _config.key[i]);

    
  EEPROM.write(offset++, (_config.port >> 24) & 0xff);
  EEPROM.write(offset++, (_config.port >> 16) & 0xff);
  EEPROM.write(offset++, (_config.port >> 8) & 0xff);
  EEPROM.write(offset++, (_config.port >> 0) & 0xff);

  EEPROM.write(offset++, _config.tailVersion);
  Serial.print("save offset : ");
  Serial.println(offset);
}



bool checkConfig(CONFIG* config) {
  Serial.println(config->tailVersion);
  Serial.println(config->version);
  return config->tailVersion == VER && config->version == VER;
}

void printConfig(CONFIG* config) {
  Serial.println("d : version - " + String(config->version));
  Serial.println("d : version2 - " + String(config->tailVersion));
  Serial.println("d : mode - " + String(config->mode));
  Serial.println("d : ssid - " + String(config->ssid));
  Serial.println("d : pass - " + String(config->pass));
  Serial.println("d : serverAddr - " + String(config->serverAddr));
  Serial.println("d : key - " + String(config->key));
  Serial.println("d : port - " + String(config->port));
}




void readTHVlaue() {
  DHT22_ERROR_t errorCode = _dht22.readData();
  if (errorCode == DHT_ERROR_NONE || errorCode  == DHT_ERROR_CHECKSUM) {
    _thValue.temperature = _dht22.getTemperatureC() * 10;
    _thValue.humidity = _dht22.getHumidity() * 10;
  } else {
    // 에러.
    _thValue.humidity = NIL_VALUE;
    _thValue.humidity = NIL_VALUE;
  }
}



void onPWMControlCallback(uint8_t powerPWM, uint8_t fanPWM) {
  //Serial.println(powerPWM);
  //Serial.println(fanPWM);
  analogWrite(PW_CTR, powerPWM);
  analogWrite(FAN_CTR, fanPWM);
}


bool onWaterStateCallback() {
  return analogRead(WATERGAUGE_PIN) < 200;
}   
