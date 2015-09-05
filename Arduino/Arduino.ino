#include <SoftwareSerial.h>
#include <EEPROM.h>

#define WIFI_RX 2 
#define WIFI_TX 3

#define FAN_CTR 9
#define PW_CTR 6

#define LED_PIN 13
#define RESET_PIN 0
#define DHT22_PIN 7
#define WATERGAUGE_PIN 2

#define BUFF_SIZE 512
#define DEBUG 

#define RES_OK "\r\nOK"
#define RES_OK_LEN 4
#define RES_ERROR "\r\nERROR"
#define RES_ERROR_LEN 7
#define RES_NC "no change\r\n"
#define RES_NC_LEN 11
#define RES_UNKNOWN "\r\n"
#define RES_UNKNOWN_LEN 2

#define VER 102
#define MODE_BOOT 0
#define MODE_SETUP 1
#define MODE_RUN 2
#define MODE_ERROR 3

#define DELAY_PUSH_SETUP 5000
#define DELAY_LED_SETUP 500

typedef struct Config {
  uint8_t version = VER;
  uint8_t mode = MODE_BOOT;
  char ssid[32] = "unknown";
  char pass[32] = "unknown";
  char serverAddr[64] = "unknown";
  int port = 80;
  uint8_t tailVersion = VER;   
} CONFIG;



uint8_t sendATCmd(const char* cmd,int timeout = 0,uint8_t* buffer = NULL, int bufSize = 16);
uint8_t checkResString(char ch, uint8_t idx);
void intoSetupMode();
void setMode();
void showStatusLed();
void saveData(const void* data, int start, int length);
void loadData(void* data, int offset, int length);
bool checkConfig(CONFIG* config);
void printConfig(CONFIG* config);


CONFIG _config;
SoftwareSerial wifi(WIFI_RX, WIFI_TX);
long _lastClickMillis = 0;
long _lastOnLedMillis = 0;
int _bufferIdx = 0;
uint8_t _buffer[BUFF_SIZE];




void setup() {
  pinMode(LED_PIN,OUTPUT);
  //pinMode(RESET_PIN,INPUT);
  wifi.begin(9600);
  #ifdef DEBUG
    Serial.begin(9600);
    Serial.println("debug :: Ready..");
  #endif
  loadData(&_config, 0, sizeof(_config));
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
      #ifdef DEBUG
      //Serial.println("debug : up reset");
      #endif
   }
   showStatusLed();
    
   if(_config.mode == MODE_SETUP && wifi.available()) {
      byte data = wifi.read();
      _buffer[_bufferIdx % BUFF_SIZE] = data;
      _bufferIdx++;
      #ifdef DEBUG
        Serial.write((char)data);
      #endif
      /*if(.find("+IPD,")) {
         int connectionId = esp8266.read()-48; // subtract 48 because the read() function returns 
                                               // the ASCII decimal value and 0 (the first decimal number) starts at 48
         String webpage = "<h1>Hello</h1>&lth2>World!</h2><button>LED1</button>";     
         String cipSend = "AT+CIPSEND=";
         cipSend += connectionId;
         cipSend += ",";
         cipSend +=webpage.length();
         cipSend +="\r\n";
         sendData(cipSend,1000,DEBUG);
         sendData(webpage,1000,DEBUG);
         webpage="<button>LED2</button>";
         cipSend = "AT+CIPSEND=";
         cipSend += connectionId;
         cipSend += ",";
         cipSend +=webpage.length();
         cipSend +="\r\n";
         
         sendData(cipSend,1000,DEBUG);
         sendData(webpage,1000,DEBUG);
     
         String closeCommand = "AT+CIPCLOSE="; 
         closeCommand+=connectionId; // append connection id
         closeCommand+="\r\n";
         sendData(closeCommand,3000,DEBUG); 
      }*/
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

void intoSetupMode() {
  if(_config.mode == MODE_SETUP) return;
  _config.mode = MODE_SETUP;
  saveData(&_config,0,sizeof(_config));
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
  uint8_t result = 0;
  long lastMs = millis();
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
         result = checkResString(data, resIdx++);
         if(result == 0) {
            resIdx = 0;
         } else if((result & 0x80) == 0x80) {  
            result = result & 0x7f;
            #ifdef DEBUG
              Serial.println();
              if(result == RES_OK_LEN) 
                  Serial.println("debug :: OK res checked.");
              else if(result == RES_ERROR_LEN) 
                  Serial.println("debug :: ERROR res check. ");
              else if(result == RES_NC_LEN) 
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
  return result;
}

uint8_t checkResString(char ch, uint8_t idx) {
  if(idx < RES_UNKNOWN_LEN && ch == RES_UNKNOWN[idx]) {
     return RES_UNKNOWN_LEN;
  } else if(idx < RES_OK_LEN && ch == RES_OK[idx]) {
     if(idx == RES_OK_LEN - 1) {
       return RES_OK_LEN | 0x80;
     }
     return RES_OK_LEN;
  } else if(idx < RES_ERROR_LEN && ch == RES_ERROR[idx]) {
    if(idx == RES_ERROR_LEN - 1) {
       return RES_ERROR_LEN | 0x80;
     }
     return RES_ERROR_LEN;
  } else if(idx < RES_NC_LEN && ch == RES_NC[idx]) {
    if(idx == RES_NC_LEN - 1) {
       return RES_NC_LEN | 0x80;
     }
     return RES_NC_LEN;
  }
  return 0;
}


void loadData(void* data, int offset, int length) {
    uint8_t* pos = (uint8_t*)data;
    for(int i = 0; --length; ++i,++pos) {
       *pos = EEPROM.read(i);
    }
}

void saveData(const void* data, int start, int length) {
  const uint8_t* pos = (const uint8_t*)data;
  Serial.println(length);
  int ln = length;
  for(int i = start; --length; ++i,++pos) {
      EEPROM.write(i, *pos);
  }
  #ifdef DEBUG
      Serial.begin(9600);
      Serial.println("debug :: config saved");
   #endif
}

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
  
