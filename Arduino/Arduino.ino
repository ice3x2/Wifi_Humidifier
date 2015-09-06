#include <SoftwareSerial.h>
#include <EEPROM.h>
#include "EspResponseChecker.h"

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

#define VER 105
#define MODE_BOOT 0
#define MODE_SETUP 1
#define MODE_RUN 2
#define MODE_ERROR 3

#define DELAY_PUSH_SETUP 5000
#define DELAY_LED_SETUP 500
#define DATA_STATE_WAIT 0
#define DATA_STATE_HTTP_FIND_FPATH 1
#define DATA_STATE_HTTP_FIND_EPATH 2
#define DATA_STATE_HTTP_FIND_EOL 3
#define DATA_STATE_HTTP_SEND_PAGE 4


typedef struct Config {
  uint8_t version = VER;
  uint8_t mode = MODE_BOOT;
  char ssid[32] = "unknown";
  char pass[32] = "unknown";
  char serverAddr[64] = "unknown";
  uint32_t port = 80;
  uint8_t tailVersion = VER;
} CONFIG;



uint8_t sendATCmd(const char* cmd,int timeout = 0,uint8_t* buffer = NULL, int bufSize = 16);

bool isResCheckOk(uint8_t checkResresult);
bool checkConfig(CONFIG* config);
void intoSetupMode(bool force = false);
void setMode();
void showStatusLed();
void saveConfig();
void loadConfig();
void printConfig(CONFIG* config);

//bool _isLink = false;
void resetBuffer();
uint8_t _buffer[BUFF_SIZE];
int _bufferIdx = 0;
int _dataState = 0;
long _lastClickMillis = 0;
long _lastOnLedMillis = 0;
CONFIG _config;
SoftwareSerial wifi(WIFI_RX, WIFI_TX);
ESPResponseChecker _resChecker;


void setup() {
  pinMode(LED_PIN,OUTPUT);
  //pinMode(RESET_PIN,INPUT);
  wifi.begin(9600);
  #ifdef DEBUG
    Serial.begin(9600);
    Serial.println("debug :: Ready..");
  #endif
  loadConfig();
  if(!checkConfig(&_config)) {
    _config = Config();
    #ifdef DEBUG
    Serial.println("debug :: FAIL LOAD CONFIG");
    printConfig(&_config);
    #endif
  }
  #ifdef DEBUG 
  else {
    printConfig(&_config);
  }
  #endif
  if(_config.mode == MODE_SETUP) {
    //intoSetupMode(true);
  }
}

void loop() {
   if(analogRead(RESET_PIN) > 400) {   
      if(_lastClickMillis == 0) {
         #ifdef DEBUG
          Serial.println("debug : down reset");
         #endif
         _lastClickMillis = millis();
      } else if(millis() - _lastClickMillis > DELAY_PUSH_SETUP) {
        intoSetupMode();
      }
   } else if(_config.mode != MODE_SETUP)  {
      //reset();
   } else {
      _lastClickMillis = 0;
   }
   showStatusLed();
   
    
   if(_config.mode == MODE_SETUP && wifi.available()) {
      uint8_t data = wifi.read();
      uint8_t resStatus =  _resChecker.putCharAndCheck(data);
      if(resStatus == RES_IPD) {
        _dataState = DATA_STATE_HTTP_FIND_FPATH;
        #ifdef DEBUG
        Serial.println("\nDATA_STATE_HTTP_FIND_FPATH");
        #endif
      }
      else if(_dataState == DATA_STATE_HTTP_FIND_FPATH) {
        if(data == '/') {
          _dataState = DATA_STATE_HTTP_FIND_EPATH;
          Serial.println("DATA_STATE_HTTP_FIND_EPATH");
           resetBuffer();
          _buffer[_bufferIdx % BUFF_SIZE] = data;
          _bufferIdx++;
        }
      } else if(_dataState == DATA_STATE_HTTP_FIND_EPATH) {
        if(data == ' ') {
          Serial.println("DATA_STATE_HTTP_FIND_EOL");
          _dataState = DATA_STATE_HTTP_FIND_EOL;  
        } else {
          _buffer[_bufferIdx % BUFF_SIZE] = data; 
          _bufferIdx++;
        }
      }
     if(_dataState == DATA_STATE_HTTP_FIND_EOL) {
        _dataState = DATA_STATE_WAIT;
        if(strncmp((char*)_buffer, "/set/", 5) == 0) { 
          for(int i = 0; i < BUFF_SIZE; ++i){
            _buffer[i] = _buffer[i + 5]; 
          }
          Serial.println((char*)_buffer);
          char *token = strtok((char*)_buffer, "::");
          int pos = 0;
          while(token != NULL) {
            Serial.println(token);
            if(pos == 0) {
              strcpy(_config.ssid, token);
            } else if(pos == 1) {
              strcpy(_config.pass, token);
            } else if(pos == 2) {
              strcpy(_config.serverAddr, token);
            } else if(pos == 3) {
              uint32_t port = atol(token);
              Serial.println(port);
              _config.port = port;
            }
            token = strtok(NULL, "::");
            ++pos;
          }
          printConfig(&_config);
          resetBuffer();
        }
      
     }
      
      /*#ifdef DEBUG
        Serial.write((char)data);
      #endif*/
   }

   
}

/**
 * Buffer 에 있는 내용을 모두 0으로 채운다. memset 함수가 종종 이상하게 동작하여 느러도 이 것으로 대체.
 */
void resetBuffer() {
  _bufferIdx = 0;
  for(int i = BUFF_SIZE; i--;) {
    _buffer[i] = 0;
  }
}


void showStatusLed() {
  int delayMillis = 0;
  if(_config.mode == MODE_SETUP) {
    delayMillis = DELAY_LED_SETUP;
  }
  if(millis() - _lastOnLedMillis < delayMillis) {  
        digitalWrite(LED_PIN, HIGH);
   } else if(millis() - _lastOnLedMillis < (delayMillis + delayMillis))  {
      digitalWrite(LED_PIN, LOW);
   } else if(millis() - _lastOnLedMillis > (delayMillis + delayMillis))  {
      _lastOnLedMillis = millis();
      digitalWrite(LED_PIN, HIGH);
   }
}
void setMode() {
  if(_config.mode == MODE_SETUP) {
      intoSetupMode();
  }
}

void intoSetupMode(bool force) {
  if(_config.mode == MODE_SETUP && !force) return;
  _config.mode = MODE_SETUP;
  saveConfig();
  sendATCmd("AT+RST\r\n", 2000);
  sendATCmd("AT+CWMODE=2\r\n");
  sendATCmd("AT+CIPMUX=1\r\n");
  sendATCmd("AT+CIPSERVER=1,80\r\n");
}

uint8_t sendATCmd(const char* cmd,int timeout,uint8_t* buffer, int bufSize) {
  boolean isBufferAllocationed = false;
  int bufIdx = 0;
  uint8_t resIdx = 0;
  uint8_t data = 0;
  uint8_t resStatus = 0;
  long lastMs = millis();
  _resChecker.reset();
  wifi.print(cmd);
  if(buffer == NULL) {
     buffer = new uint8_t[bufSize];
     isBufferAllocationed = true;
  }
  while(!wifi.available() && (millis() - lastMs < timeout || timeout == 0));
  while(millis() - lastMs < timeout || timeout == 0) {
    while(wifi.available()) {
       data = wifi.read();
       #ifdef DEBUG
        Serial.write((char)data);
       #endif
       buffer[bufIdx % bufSize] = data;
       bufIdx++;
       if(timeout == 0) {
         resStatus = _resChecker.putCharAndCheck(data);
         if(resStatus == RES_NONE) {
            resIdx = 0;
         } else if(resStatus != RES_NONE) {  
            #ifdef DEBUG
              Serial.println();
              if(resStatus == RES_OK) 
                  Serial.println("debug :: OK res checked.");
              else if(resStatus == RES_ERROR) 
                  Serial.println("debug :: ERROR res check. ");
              else if(resStatus == RES_NC) 
                  Serial.println("debug :: no change res checked.");
            #endif          
            timeout = 1;
            break;
         }
       }
    }
  }
  while(wifi.available()) {
     wifi.read();
  }
  if(isBufferAllocationed) {
    delete[] buffer;  
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
  _config.mode = EEPROM.read(offset++);
  for(int i = 0, n = sizeof(_config.ssid);i < n; ++i)
    _config.ssid[i] = EEPROM.read(offset++);
    
  for(int i = 0, n = sizeof(_config.pass);i < n; ++i)
    _config.pass[i] = EEPROM.read(offset++);
    
  for(int i = 0, n = sizeof(_config.serverAddr);i < n; ++i)
    _config.serverAddr[i] = EEPROM.read(offset++);
    
  _config.port |=  ((uint32_t)EEPROM.read(offset++)) << 24;
  _config.port |=  ((uint32_t)EEPROM.read(offset++)) << 16;
  _config.port |=  ((uint32_t)EEPROM.read(offset++)) << 8;
  _config.port  |=  EEPROM.read(offset++);
  _config.tailVersion = EEPROM.read(offset);
}


void saveConfig() {
  Serial.print("SSID SIZE : ");
  Serial.println(sizeof(_config.ssid));
  int offset = 0;
  EEPROM.write(offset++, _config.version);
  EEPROM.write(offset++, _config.mode);
  for(int i = 0, n = sizeof(_config.ssid);i < n; ++i)
    EEPROM.write(offset++, _config.ssid[i]);
    
  for(int i = 0, n = sizeof(_config.pass);i < n; ++i)
    EEPROM.write(offset++, _config.serverAddr[i]);
    
  for(int i = 0, n = sizeof(_config.serverAddr);i < n; ++i)
    EEPROM.write(offset++, _config.serverAddr[i]);   

  EEPROM.write(offset++, (byte)(_config.port >> 24));
  EEPROM.write(offset++, (byte)(_config.port >> 16));
  EEPROM.write(offset++, (byte)(_config.port >> 8));
  EEPROM.write(offset++, (byte)_config.port);
  EEPROM.write(offset++, _config.tailVersion);
}

/*typedef struct Config {
  uint8_t version = VER;
  uint8_t mode = MODE_BOOT;
  char ssid[32] = "unknown";
  char pass[32] = "unknown";
  char serverAddr[64] = "unknown";
  int port = 80;
  uint8_t tailVersion = VER;   
} CONFIG;*/


bool checkConfig(CONFIG* config) {
  return config->tailVersion == VER && config->version == VER;
}

void printConfig(CONFIG* config) {
  Serial.println("debug :: version - " + String(config->version));
  Serial.println("debug :: version2 - " + String(config->tailVersion));
  Serial.println("debug :: mode - " + String(config->mode));
  Serial.println("debug :: ssid - " + String(config->ssid));
  Serial.println("debug :: pass - " + String(config->pass));
  Serial.println("debug :: serverAddr - " + String(config->serverAddr));
  Serial.println("debug :: port - " + String(config->port));
}




/* 
  byte buffer[256];
  SwSerial.print("AT+CIPSTART=\"TCP\",\"httpbin.org\",80\r\n");
  delay(2000);
  while(!SwSerial.available());
  while(SwSerial.available()) {
      Serial.print((char)SwSerial.read());
  }
  String cmd = "GET /ip HTTP/1.0\r\n\r\n";
  SwSerial.print("AT+CIPSEND=");
  SwSerial.print(cmd.length());
  SwSerial.print("\r\n");

  if (SwSerial.find(">")) {
    Serial.print(">");
  }
  else {
    SwSerial.print("AT+CIPCLOSE=AT+CIPCLOSE\r\n");
    Serial.println("connect timeout");
    delay(1000);
    return;
  }

  SwSerial.print(cmd);
  long lastMs = millis();
  while(!SwSerial.available());
  while(millis() - lastMs < 5000) {
      if(SwSerial.available()) {
        byte data = SwSerial.read();
        Serial.print((char)data);  
      }
  }
  Serial.println("====");
  delay(1000);


  
  SwSerial.print("AT+CIPCLOSE=AT+CIPCLOSE\r\n");
  
  while(!SwSerial.available());
  while(millis() - lastMs < 5000) {
      if(SwSerial.available()) {
        byte data = SwSerial.read();
        Serial.print((char)data);  
      }
  }*/
  /*
   // 시리얼 버퍼를 비운다.
    int delayt = 0;
   Serial.flush();
   byte buffer[10];
   int idx = 0;
   Serial.print("dealy : ");
   // 버퍼에 값이 들어올 때 까지 대기. 
   while(!Serial.available());
   // HC-06 으로 명령어를 날린다. 
   while(Serial.available()) {
      Serial.readBytes(buffer, 10);
   }
   String aa = "";
   aa += (char*)buffer;
   delayt = aa.toInt();
   Serial.println(delayt);
   Serial.print("cmd : ");
   // 버퍼에 값이 들어올 때 까지 대기. 
   while(!Serial.available());
   // HC-06 으로 명령어를 날린다. 
   while(Serial.available()) {
      data = Serial.read();
      if(data == -1) break;
      SwSerial.print(data);
      Serial.print(data);
      // 시리얼 통신에서는 9600bps 기준으로
      // read 를 사용할 때 1ms 의 딜레이를 줘야 한다.
      delayMicroseconds(84);
   }  
   SwSerial.print("\r\n"); 
   Serial.println();
   // HC-06에서 처리할 시간을 준다.
   Serial.print("return : ");
   // HC-06 으로 부터 받아온 리턴 값을 출력한다.
   while(!SwSerial.available()) {}
   delayMicroseconds(84);
   boolean isO = false;
   boolean isK = false;
   long lastMs = millis();
   while((!isO || !isK) && millis() - lastMs < delayt) {
      data = SwSerial.read();
      if(data == -1) continue;
      Serial.print(data);
      //delayMicroseconds(84);
      
      
      if(data == 'O') {
        isO = true;
      }
      else if(isO && data == 'K') {
        isK = true;
      }
      else {
        isO = false;
        isK = false; 
      }
   }  
   Serial.print("\n\n");*/
   /*
   analogWrite(9,255);
   analogWrite(6,255);
  SwSerial.println("OKOK + 1\r\n");
   // 데이터가 들어올때 까지 대기.
  while(!SwSerial.available());
  digitalWrite(ledPin, HIGH);
  while(SwSerial.available()) {
    data = SwSerial.read();
    buffer[index++] = data;
    // 버퍼가 꽉 찼거나 문자열이 끝났을 때,
    // 루프에서 나간다.
    if(index == BUFF_SIZE || data == '\0') break;
    // 9600bps 기준으로 delay 를 1ms 을 줘야 한다.
    delay(1);
  }   
  // 블루투스를 통하여 받은 데이터를 되돌려준다.
  for(uint8_t i = 0; i < index; ++i) {
    SwSerial.write(buffer[i]);
  }
  SwSerial.print("\r\n");
  index = 0;
  int val = analogRead(1);
  SwSerial.println(val);*/
  
