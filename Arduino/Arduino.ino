/*
 * Wifi_Humidifier
 * https://github.com/ice3x2/Wifi_Humidifier
 * 
 * wifi 가습기. 2015.09~ 
 * 
 * > Hardware
 * - Arduino UNO or NANO, Mini
 * - ESP8266 (esp-1)
 * - 보만 가습기 - Bomann mini humidifier
 * - DHT22
 * - NPN Transistor
 */

#include <SoftwareSerial.h>
#include <EEPROM.h>
// DHT22 라이브러리. 
// https://github.com/nethoncho/Arduino-DHT22
#include <DHT22.h>

// PWM 주파수 편하게 설정하는 라이브러리.
// https://code.google.com/p/arduino-pwm-frequency-library/
#include <PWM.h> 

#include "EspResponseChecker.h"
#include "ESPTTP.h"

// ESP8266 애 연결되는 Software Serial pin.
#define WIFI_RX 2
#define WIFI_TX 3

// FAN PWM
#define FAN_CTR 9
// 전원 PWM
#define PW_CTR 10

// 알림 LED 는 아두이노 위에 올라간 것을 이용.
#define LED_PIN 13

#define DHT22_PIN 7

// 리셋버튼. 아날로그 핀을 사용한다. (터치 센서를 만들 계획이었다.)
#define RESET_PIN 0
// 가습기의 물 없음 경고 LED 의 + 에 연결.
#define WATERGAUGE_READ_ANPIN 2
// 가습기의 전원 LED 의 + 에 연결.
#define POWER_READ_ANPIN 1

// 버퍼 사이즈. 가능한 작게 잡는다.
#define BUFF_SIZE 64

// DHT22 의 오류로 값을 읽을 수 없을 때, 이 값을 서버로 보내준다.
#define VALUE_NIL -1000

#define VER 105

// 각 상황별 딜레이 값들. 
#define DELAY_PUSH_SETUP 5000 
#define DELAY_LED_SETUP 1000
#define DELAY_LED_ERROR_CONNECT 200
#define DELAY_LED_FAIL_AP 40

// 상태.
#define STATE_PUSH_BUTTON 0x01 // Button pressed.
#define STATE_INTO_SETUP_MODE 0x02 // Setup mode standby.
#define STATE_SETUP_MODE 0x04 // in Setup mode.
#define STATE_FAIL_AP 0x08 // Access point(공유기) connection fails.
#define STATE_ERROR_CONNECT 0x10 // Server Connection Failed. 
#define STATE_RUN 0x20 // Running.


#define MAX_ATTEMPT_RECONNECT 3

// 설정값.
typedef struct Config {
  uint8_t version = VER;
  uint32_t port = 80; // Setup 모드시 사용될 포트.
  uint8_t tailVersion = VER; // 안 쓰는 값.
  String ssid; // ssid, 공유기의 이름 
  String pass; // ap password, 공유기 접속 비번.
  String server; // 서버 
  String key; // 인증키. 서버에서 설정한 인증키와 같아야 한다. 
} CONFIG;

typedef struct Values {
  int temperature; // 현재 온도.
  int humidity; // 현재 습도.
  int minHumidity; // 최소 동작 습도 
  int maxHumidity; // 최대 동작 습도.
  int limitDiscomfort; // 최대 동작 불쾌지수. 만약 현재 불쾌지수가 이 값 이상일 경우 가습기 동작을 정지한다. 
  uint8_t fan; // fan pwm 값.
  uint8_t power; // power pwm 값. 
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
uint8_t _connectFailCount = 0;
uint8_t _tokenPosition = 0;
uint16_t _state;
bool _isInit = false;
bool _isIncreaseHumidity = false;


bool readStatusFromDHT22();
void control();
void resetBuffer();
void saveConfig(); // 설정값을 저장한다.
bool loadConfig(); // 설정값을 불러온다.
void checkResetButton();
void showStatusLed();
void removeState(uint16_t state);
void addState(uint16_t state);
bool isState(uint16_t state);
void parseControlData(char data);
void onResponse(Event* event);
float calcDiscomfortIndex(float temp, float humi);

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  Serial.begin(115200);
  Serial.print("ready...");

  // 2khz 로 사용할 수 있도록 설정한다. 
  // Timer 0 과 겹치면 곤란하므로, 9 번과 10번핀만 사용하도록 한다. 
  InitTimersSafe();
  SetPinFrequencySafe(PW_CTR, 20000);
  SetPinFrequencySafe(FAN_CTR, 20000);
  pwmWrite(FAN_CTR, 255);
  pwmWrite(PW_CTR, 255);
  _wifi.begin(9600);
  _espttp.begin(&_wifi);
  _espttp.setOnResponseCallback(onResponse);
  Options* opt = _espttp.obtainOptions();
  // 저장된 값이 없을 때, 바로 셋업 모드로 들어간다.
  if (!loadConfig()) {
    opt->apMode = true;
  } else {
    opt->apMode = false;
    opt->port = 80;
    opt->ssid = _config.ssid;
    opt->password = _config.pass;
    addState(STATE_RUN);
  }
  _espttp.commitOption();
  while (_espttp.isBusy()) {
    _espttp.next(millis());
  }
  digitalWrite(LED_PIN, LOW);
}


void loop() {

  showStatusLed();
  checkResetButton();
  if (readStatusFromDHT22() && isState(STATE_RUN)) {
    sendData();
  }
  if (isState(STATE_INTO_SETUP_MODE) && !_espttp.isBusy()) {
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

/**
 * 값을 Get 방식으로 서버로 보내준다. 
 * http://서버주소/data?key=[인증키]&t=[온도 * 10]&h=[습도 * 10]&w=[물 없음 0, 전원 켜짐 1, 전원 꺼짐 0]
 */
void sendData() {
  _tokenPosition = 0;
  int pw = (analogRead(WATERGAUGE_READ_ANPIN) > 200) ? 0 : -1;
  pw = (analogRead(POWER_READ_ANPIN) > 200) ? 1 : pw;
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

// http 의 response 값을 처리한다.
void onResponse(Event* event) {
  // 클라이언트 모드일경우 - http 서버 접속 실패.
  if (event->type == Event::FAIL) {
    if(_connectFailCount > MAX_ATTEMPT_RECONNECT) {
      addState(STATE_ERROR_CONNECT);  
    }
    _connectFailCount++;
  }
  // 클라이언트 모드일경우 - 공유기 연결 실패. 
  if (event->type == Event::FAIL_JOIN_AP) {
    _espttp.cancel();
    _state = 0;
    addState(STATE_FAIL_AP);
  }
  // 클라이언트 모드일경우 - 서버로부터 Get 으로 요청했을 때의 값 수신중.
  else if (event->type == Event::CONTENT) {
    char data = *event->data;
    parseControlData(data);
  } 
  // 클라이언트 모드일경우 - 서버로부터 Get 으로 요청했을 때의 값 수신 완료.
  else if (event->type == Event::GET) {
    if(_tokenPosition < 1) {
      addState(STATE_ERROR_CONNECT);
    } else {
      _connectFailCount = 0;
      removeState(STATE_ERROR_CONNECT);
      control();  
    }
  }
  // Setup 모드일 경우 - 클라이언트로부터 Get 의 path 값 수신. key&value 파싱은 하지 않는다.
  else if (event->type == Event::PATH) {
    char data = *event->data;
    parseSetupPath(data);
  }
  // Setup 모드일 경우 - 클라이언트로부터 Request 수신 완료.
  if (event->type == Event::REQ) {
    if (_tokenPosition > 5) {
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


/**
 * Setup 모드에서 클라이언트로부터 들어오는 Get path 값들을 파싱한다. 
 * 예) http://192.168.4.1/[ssid]/[password]/[server address]/[server port]/[auth key]/
 */
void parseSetupPath(char data) {
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

/**
 * 클라이언트 모드에서 Get 을 이용하여 서버로 값을 요청하였을 때, 반환 값들을 파싱한다. 
 * 예) ,[최소 동작 습도],[최대 동작 습도],[제한 불쾌지수 값],[power pwm 값],[fan pwm 값],,,,
 * 만약 인증키가 일치하지 않을경우 서버로부터 
 * Auth fail 
 * 이라는 값을 반환받는다.
 */
void parseControlData(char data) {
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
}



bool isState(uint16_t state) {
  return state == (_state & state);
}


void addState(uint16_t state) {
  _state = (_state | state);
}

void removeState(uint16_t state) {
  _state = (_state & ~state);
}


/**
 * LED 로 현재 상태를 체크할 수 있도록 한다.
 * 계속 켜져있음 -> 초기화중.
 * 1초 간격으로 깜빡이는 상태(깜~~~빡~~~~깜~~~빡) -> 셋업모드. AP 모드로 셋팅되기 때문에 wifi 와 인터넷 브라우저가 있는 기기를 통하여 가습기에 접속할 수 있다.
 * 0.2 초 간격으로 깜빡이는 상태(깜빡깜빡깜빡) -> 서버 접속 에러, 혹은 인증 에러.
 * 발작하듯이 빠르게 깜빡이는 상태(깗깗깗깗깗깗) -> AP 접속 에러, 셋업 모드로 들어가서 재설정 해줘야 한다.
 **/
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
  } else if (analogRead(RESET_PIN) < 1000) {
    removeState(STATE_INTO_SETUP_MODE);
    removeState(STATE_PUSH_BUTTON);
    _lastClickMillis = 0;
  }
}


bool loadConfig() {
  int offset = 0;
  char data;

  _config.version = EEPROM.read(offset++);
  if (_config.version != VER) {
    _config.version = VER;
    return false;
  }


  resetBuffer();
  while ((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.ssid = (const char*)_buffer;

  resetBuffer();
  while ((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.pass = (const char*)_buffer;

  resetBuffer();
  while ((data = EEPROM.read(offset++)) != '\0') {
    _buffer[_bufferIdx++] = data;
  }
  _config.server = (const char*)_buffer;

  resetBuffer();
  while ((data = EEPROM.read(offset++)) != '\0') {
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


bool readStatusFromDHT22() {
  if (millis() - _lastReadDHT22 < 2000) return false;
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
  uint8_t power = _values.power;
  uint8_t fan = _values.fan;
  if (_values.humidity < _values.minHumidity * 10) {
    _isIncreaseHumidity = true;
  } else if (_values.humidity >= _values.maxHumidity * 10 || isLimitDiscomfort) {
    _isIncreaseHumidity = false;
    _latestPowerPWM = 0;
    _latestFanPWM = 0;
  }
  if(_isIncreaseHumidity) { 
    if (_latestPowerPWM != power) {
      pwmWrite(PW_CTR, power);
      _latestPowerPWM = power;
    }
    if (_latestFanPWM != fan) {
      pwmWrite(FAN_CTR, fan);
      _latestFanPWM = fan;
    }
  } else {
    pwmWrite(PW_CTR, 0);
    pwmWrite(FAN_CTR, 0);
  }
  

}

// 온도와 습도를 입력받아 불쾌지수를 계산하여 반환한다.
// 불쾌지수에 대한 계산법은 http://www.kma.go.kr/HELP/basic/help_01_05.jsp 이 곳에서 확인하였다.
float calcDiscomfortIndex(float temp, float humi) {
  return (1.8f * temp) - (0.55 * (1 - humi / 100.0f) * (1.8f * temp - 26)) + 32;
}

