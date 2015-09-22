#include <SoftwareSerial.h>
#include <EEPROM.h>
#include <DHT22.h>

#include <PWM.h>
#include <MemoryFree.h>

//https://github.com/toruuetani/Cryptosuite

#include "EspResponseChecker.h"
#include "ESP8266.h"

#define WIFI_RX 2
#define WIFI_TX 3

#define FAN_CTR 9
#define PW_CTR 10

#define LED_PIN 13
#define RESET_PIN 0
#define DHT22_PIN 7
#define WATERGAUGE_READ_ANPIN 2
#define POWER_READ_ANPIN 1

#define BUFF_SIZE 64
#define DEBUG

#define VALUE_NIL -1000

#define VER 105 
#define MODE_SETUP 1
#define MODE_RUN 2
#define MODE_ERROR 3

#define DELAY_PUSH_SETUP 5000
#define DELAY_LED_SETUP 1000
#define DELAY_LED_ERROR_CONNECT 200
#define DELAY_LED_FAIL_AP 40

// 제어 값을 담고 있는 _controlValues 배열의 각 인덱스가 의미하는 값을 정의.
#define CONTROL_VALUE_MIN_HUMIDITY 0
#define CONTROL_VALUE_MAX_HUMIDITY 1
#define CONTROL_VALUE_DISCOMFORT_INDEX 2
#define CONTROL_VALUE_PWR_PWM 3
#define CONTROL_VALUE_FAN_PWM 4



#define STATE_PUSH_BUTTON 1
#define STATE_INTO_SETUP_MODE 1 << 2
#define STATE_SETUP_MODE 1 << 3
#define STATE_FAIL_AP 1 << 4
#define STATE_ERROR_CONNECT 1 << 5
#define STATE_RUN 1 << 6
#define STATE_INCREASE_HUMIDITY 1 << 7

typedef struct Config {
  uint8_t version = VER;
  uint32_t port = 80;
  uint8_t tailVersion = VER;
  String ssid;
  String pass;
  String server;
  String key;
} CONFIG;

typedef struct Values {
  int temperature;
  int humidity;
  int minHumidity;
  int maxHumidity;
  int limitDiscomfort;
  uint8_t fan;
  uint8_t power;
  
} VALUES;


SoftwareSerial _wifi(WIFI_RX, WIFI_TX);
ESPTTP _espttp;
CONFIG _config;
VALUES _values;
DHT22 _dht22(DHT22_PIN);
long _lastClickMillis = 0;
long _lastOnLedMillis = 0;
long _lastReadDHT22 = 0;
uint8_t _latestFanPWM = 255;
uint8_t _latestPowerPWM = 255;
uint8_t _buffer[BUFF_SIZE];
uint8_t _bufferIdx = 0;
uint8_t _tokenPosition = 0;
uint16_t _state;
bool _isInit = false; 

void onResponse(Event*);

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  Serial.begin(115200);
  Serial.print("ready...");
  

  //InitTimersSafe();
  Serial.println((SetPinFrequencySafe(FAN_CTR, 2500))?"true":"false");
  Serial.println(SetPinFrequencySafe(PW_CTR, 20000)?"true":"false");
  pwmWrite(FAN_CTR,255);
  pwmWrite(PW_CTR,255);
  _wifi.begin(9600);
  _espttp.begin(&_wifi);
  _espttp.setOnResponseCallback(onResponse);
  Options* opt = _espttp.obtainOptions();
  if(!loadConfig()) {
    opt->apMode = true;    
  } else {
    opt->apMode = false;
    opt->port = 80;
    opt->ssid = _config.ssid;
    opt->password = _config.pass;
    addState(STATE_RUN);
  }
  _espttp.commitOption();
  while(_espttp.isBusy()) {
    _espttp.next(millis());
  }
  digitalWrite(LED_PIN, LOW);
}


void loop() {
  
  showStatusLed();
  checkResetButton();
  if(readStatus() && isState(STATE_RUN)) {
      _tokenPosition = 0;
      int pw = (analogRead(WATERGAUGE_READ_ANPIN) > 200)?0:-1;
      pw = (analogRead(POWER_READ_ANPIN) > 200)?1:pw;  
      String strGetPath =  "/data?key=";
      strGetPath += _config.key;
      strGetPath += "&t=";
      strGetPath += _values.temperature;
      strGetPath += "&h=";
      strGetPath += _values.humidity;
      strGetPath += "&w=";
      strGetPath += pw;
      _espttp.beginConnect()->serverAddress(_config.server)->port(_config.port)->path(strGetPath)->emit();  
  }
  if(isState(STATE_INTO_SETUP_MODE) && !_espttp.isBusy()) {
     removeState(STATE_RUN);
     _espttp.cancel();
     Options* opt = _espttp.obtainOptions();
     opt->apMode = true;
     _espttp.commitOption();
     addState(STATE_SETUP_MODE);
     removeState(STATE_INTO_SETUP_MODE);
  }
  _espttp.next(millis());
}


void onResponse(Event* event) {
  if(event->type == Event::FAIL) {
     addState(STATE_ERROR_CONNECT);
     Serial.println("\n----Error");
  }
  if(event->type == Event::FAIL_JOIN_AP) {
     _espttp.cancel();
     _state = 0;
     addState(STATE_FAIL_AP);
  }
  else if(event->type == Event::CONTENT) {
    //Serial.print(*event->data);
    char data = *event->data;
    if (data == ',') {              
      if (_tokenPosition == 1)  // 최소 동작 습도
        _values.minHumidity = atoi((const char *)_buffer);
      if (_tokenPosition == 2) // 최대 습도.
        _values.maxHumidity = atoi((const char *)_buffer);
      if (_tokenPosition == 3)  // 제한 불쾌지수 값
        _values.limitDiscomfort = atoi((const char *)_buffer);  
      if (_tokenPosition == 4)  // power pwm
        _values.power = atoi((const char *)_buffer);
      if (_tokenPosition == 5) // fan pwm
        _values.fan = atoi((const char *)_buffer);
      _tokenPosition++;
      resetBuffer();
    } else {
      _buffer[_bufferIdx++ % BUFF_SIZE] = data;
    }
  } else if(event->type == Event::GET) {
    Serial.print("minHumidity : ");
    Serial.println(_values.minHumidity);
    Serial.print("maxHumidity : ");
    Serial.println(_values.maxHumidity);
    Serial.print("limitDiscomfort : ");
    Serial.println(_values.limitDiscomfort);
    Serial.print("power PWM : ");
    Serial.println(_values.power);
    Serial.print("fan PWM : ");
    Serial.println(_values.fan);
    removeState(STATE_ERROR_CONNECT);
    control();
  }
  else if(event->type == Event::PATH) {
    Serial.print(*event->data);
    char data = *event->data;
    if (data == '/') {              
      if (_tokenPosition == 1)  // ssid
        _config.ssid = (const char *)_buffer;
      if (_tokenPosition == 2) // ssid password
        _config.pass = (const char *)_buffer;
      if (_tokenPosition == 3)  // server address
        _config.server = (const char *)_buffer;  
      if (_tokenPosition == 4)  // server port 
        _config.port = atoi((const char *)_buffer);
      if (_tokenPosition == 5) // auth key
        _config.key = (const char *)_buffer;
      _tokenPosition++;
      resetBuffer();
    } else {
      _buffer[_bufferIdx++ % BUFF_SIZE] = data;
    }
  }
  if(event->type == Event::REQ) {
    if(_tokenPosition > 5) {
      saveConfig();
      _espttp.beginConnect()->body("<!DOCTYPE html><head> <meta name='viewport' content='width=device-width, user-scalable=no'></head><body>Setup OK.<br/>Please reboot.<br/></body></html>")->emit();
    }
    else {
      _espttp.beginConnect()->body("<!DOCTYPE html><head> <meta name='viewport' content='width=device-width, user-scalable=no'></head><body>URL input for setup.</br>http://192.168.4.1/[AP SSID]/[Password]/[server addr]/[port]/[key]/</body></html>")->emit();
    }
    _tokenPosition = 0;
    _bufferIdx = 0;
  }
 
}

bool isState(uint16_t state) {
  return state == (_state & state);
}
void addState(uint16_t state) {
  _state = (_state | state);
}
void removeState(uint16_t state) {
  _state &= ~state;
}


void showStatusLed() {
  int delayMillis = 0;
  if (isState(STATE_SETUP_MODE)) {
    delayMillis = DELAY_LED_SETUP;
  } else if (isState(STATE_ERROR_CONNECT)) {
    delayMillis = DELAY_LED_ERROR_CONNECT;
  } else if (isState(STATE_FAIL_AP)) {
    delayMillis = DELAY_LED_FAIL_AP;
  } else if (isState(STATE_RUN)) {
    digitalWrite(LED_PIN, LOW);
    return;
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


void checkResetButton() {
  if (analogRead(RESET_PIN) > 1000 && !isState(STATE_INTO_SETUP_MODE) && !isState(STATE_SETUP_MODE) ) {
    if (!isState(STATE_PUSH_BUTTON)) {
      addState(STATE_PUSH_BUTTON);
      _lastClickMillis = millis();
    } else if (millis() - _lastClickMillis > DELAY_PUSH_SETUP) {
      addState(STATE_INTO_SETUP_MODE);
    }
  } else if(analogRead(RESET_PIN) < 1000) {
    removeState(STATE_INTO_SETUP_MODE);
    removeState(STATE_PUSH_BUTTON);
    _lastClickMillis = 0;
  }
}

bool loadConfig() {
  int offset = 0;
  char data;
  
  _config.version = EEPROM.read(offset++);
  if(_config.version != VER) {
    _config.version = VER;
    return false;
  }
  
  
  resetBuffer();
  while((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.ssid = (const char*)_buffer;

  resetBuffer();
  while((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.pass = (const char*)_buffer;

  resetBuffer();
  while((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.server = (const char*)_buffer;

  resetBuffer();
  while((data = EEPROM.read(offset++)) != '\0') {
     _buffer[_bufferIdx++] = data;
  }
  _config.key = (const char*)_buffer;
    

  uint8_t port[4];
  port[0] = EEPROM.read(offset++); 
  port[1] = EEPROM.read(offset++);
  port[2] = EEPROM.read(offset++);
  port[3] = EEPROM.read(offset++);
  _config.port =  (port[0] << 24) + (port[1] << 16) + (port[2] << 8) +  port[3];
  _config.tailVersion = EEPROM.read(offset++);
  //printConfig();
  return true;
}

void saveConfig() {
  int offset = 0;
  EEPROM.write(offset++, _config.version);
  
  for (int i = 0, n = _config.ssid.length(); i < n; ++i)
    EEPROM.write(offset++, _config.ssid.charAt(i));
  EEPROM.write(offset++, '\0');
  
  for (int i = 0, n = _config.pass.length(); i < n; ++i)
    EEPROM.write(offset++, _config.pass.charAt(i));
  EEPROM.write(offset++, '\0');
  
  for (int i = 0, n = _config.server.length(); i < n; ++i)
    EEPROM.write(offset++, _config.server.charAt(i));
  EEPROM.write(offset++, '\0');
  
  for (int i = 0, n = _config.key.length(); i < n; ++i)
    EEPROM.write(offset++, _config.key.charAt(i));
  EEPROM.write(offset++, '\0');
    
  EEPROM.write(offset++, (_config.port >> 24) & 0xff);
  EEPROM.write(offset++, (_config.port >> 16) & 0xff);
  EEPROM.write(offset++, (_config.port >> 8) & 0xff);
  EEPROM.write(offset++, (_config.port >> 0) & 0xff);

  EEPROM.write(offset++, _config.tailVersion);
  //printConfig();
}

void resetBuffer() {
  _bufferIdx = 0;
  for (int i = BUFF_SIZE; i--;) {
    _buffer[i] = 0;
  }
}

bool readStatus() {
  if(millis() - _lastReadDHT22 < 2000) return false;
  _lastReadDHT22 = millis();
  DHT22_ERROR_t errorCode = _dht22.readData();
  if (errorCode == DHT_ERROR_NONE) {
    _values.temperature = _dht22.getTemperatureCInt();
    _values.humidity = _dht22.getHumidityInt();
  } else {
    _values.temperature = VALUE_NIL;
    _values.humidity = VALUE_NIL;
  }
  return true;
}

void control() {
  bool isLimitDiscomfort = calcDiscomfortIndex(_values.temperature / 10.0f, _values.humidity / 10.0f) * 10 > _values.limitDiscomfort;
  uint8_t power;
  uint8_t fan;
  if(_values.humidity >= _values.maxHumidity * 10 || isLimitDiscomfort) {
      if(!isLimitDiscomfort) {
        removeState(STATE_INCREASE_HUMIDITY);  
      }
      power = 0;
      fan = 0; 
  } else if(_values.humidity < _values.minHumidity * 10 || isState(STATE_INCREASE_HUMIDITY)) {
      addState(STATE_INCREASE_HUMIDITY);
      power = _values.power;
      fan = _values.fan;
  } 

  
  if(_latestPowerPWM != power) {
    pwmWrite(PW_CTR, power);   
    _latestPowerPWM = power;
  }  
  if(_latestFanPWM != fan) {
    pwmWrite(FAN_CTR, fan); 
    _latestFanPWM = fan;
  }  
  
} 

// 온도와 습도를 입력받아 불쾌지수를 계산하여 반환한다.
// 불쾌지수에 대한 계산법은 http://www.kma.go.kr/HELP/basic/help_01_05.jsp 이 곳에서 확인하였다.
float calcDiscomfortIndex(float temp, float humi) {
    return (1.8f*temp)-(0.55*(1-humi/100.0f)*(1.8f*temp-26))+32;
}

/*
void printConfig() {
  Serial.println("version - " + String(_config.version));
  Serial.println("version2 - " + String(_config.tailVersion));
  Serial.print(_config.ssid);
  Serial.print(":");
  Serial.println(_config.pass);
  Serial.print(_config.server);
  Serial.print(":");
  Serial.println(_config.port);
  Serial.println(_config.key);
  
}*/




/*
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
void printConfig(CONFIG* config);
bool sendData(const char* data, int length, int timeout = -1, int ipdID = -1);
bool connectServer(int timeout = -1);
void onReadThValueCallback(THValue* const th);
void onPWMControlCallback(uint8_t powerPWM, uint8_t fanPWM);
void onWriteCallback(uint8_t* buffer, uint8_t len);
bool onWaterStateCallback();
void resetBuffer();
uint8_t closeConnection(int ipdID = -1);


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
ESPTTP _espttp;
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

  Serial.println((SetPinFrequencySafe(FAN_CTR, 1200))?"true":"false");
  Serial.println(SetPinFrequencySafe(PW_CTR, 20000)?"true":"false");

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

  int pw = (analogRead(WATERGAUGE_READ_ANPIN) > 200)?0:-1;
  pw = (analogRead(POWER_READ_ANPIN) > 200)?1:pw;  
  String strStatus =  "GET /data?key=";
  strStatus += _config.key;
  strStatus += "&t=";
  strStatus +=  _thValue.temperature;
  strStatus += "&h=";
  strStatus += _thValue.humidity;
  strStatus += "&w=";
  strStatus += pw;
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
  onPWMControlCallback(_controlValues[CONTROL_VALUE_PWR_PWM],_controlValues[CONTROL_VALUE_FAN_PWM]);
  return true;
  
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
       uint8_t data = wifi.read();ss
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



void resetBuffer() {
  _bufferIdx = 0;
  for (int i = BUFF_SIZE; i--;) {
    _buffer[i] = 0;
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

long _lastReadDUT22 = 0;

void readTHVlaue() {
  
}

uint8_t latestFanPWM = 0;
uint8_t latestPowerPWM = 0;

void onPWMControlCallback(uint8_t powerPWM, uint8_t fanPWM) {
  if(latestPowerPWM != powerPWM)  {
      pwmWrite(PW_CTR, powerPWM);  
      latestPowerPWM = powerPWM;
  }
  if(latestFanPWM != fanPWM)  {
      pwmWrite(FAN_CTR, fanPWM);  
      latestFanPWM = fanPWM;
  }
  
 
}


bool onWaterStateCallback() {
  return analogRead(WATERGAUGE_READ_ANPIN) < 200;
}   

*/
