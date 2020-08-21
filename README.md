# Deprecated
 

# Wifi_Humidifier
![](https://github.com/ice3x2/Wifi_Humidifier/blob/master/image/photo1.JPG)
![](https://raw.githubusercontent.com/ice3x2/Wifi_Humidifier/master/image/photo6.jpg)
 * 데모 서버 : http://devlab.iptime.org:8080/
 * 개발기 : http://www.dev.re.kr/82
 * 크롬,모바일 크롬, 사파리, 모바일 사파리, 익스프롤러 11 이상에서 동작. 
 
## Hardware
![](https://raw.githubusercontent.com/ice3x2/Wifi_Humidifier/master/image/Schematic.jpg)
* 파트
  * 보만 미니 가습기 (Bomann mini humidifier)
    * 가습기와 함께 제공되는 아답터는 24v, 750mA 를 공급하는 AC/DC 아답터이다. 
    * 아래 사진처럼 밑 뚜껑을 열고 위 회로도 그림에서 점선 표시 된 부품들을 넣는다. 그 외의 파트는 외벽에 구멍을 뚫어 케이블을 밖으로 빼서 연결한다. 
      * ![](https://github.com/ice3x2/Wifi_Humidifier/blob/master/image/photo3.JPG)
      * ![](https://github.com/ice3x2/Wifi_Humidifier/blob/master/image/photo5.JPG)
    * 물 경고 LED의 + 에 Arduino 의 analog pin 2 을 연결한다. 마찬가지로 power LED + 에는 Arduino 의 analog pin 1 을 연결한다.
      * ![](https://github.com/ice3x2/Wifi_Humidifier/blob/master/image/photo4.JPG)
    * 팬의 그라운드와 메인보드의 그라운드 케이블을 끊어서 NPN 트랜지스터(tip120) 에 연결한다.
    * 모든 부품을 가습기 내부에 넣을 수 있지만, 바람이 지나가는 공간이 좁아져 분무량에 영향을 미치게 된다.  
    * PWM 제어를 위하여 NPN 트랜지스터를 이용하였고, ESP8266 의 소비전력이 크기 때문에 분무량이 약간 감소한다. 
    * 다른 가습기라도 구조는 같으므로 위와 같이 사용할 수 있다. 다만, 아답터 분리형이 아닌 경우 감전의 위험이 있으므로 각별히 주의해야 할 것이다.
  * Arduino 
  * Step down DC to DC converter
    * 구입처 : http://www.xn--e-pn9e73fo4c93z9wmk2j.com/product/detail.html?product_no=430&cate_no=33&display_group=1
    * 가변저항을 돌려 24v -> 6.5v 로 세팅한다. 주의할 6.5v 를 맞춰줘야 한다. 만약 5v 정전압 converter 가 있다면 그것을 쓰는 것이 더 이득이다.
  * LM7805 x 1
  * TIP120 x 2
  * 1K ohm 저항 x 3
  * 2.2k ohm 저항 x 1
  * 10k ohm 저항 x 1
  * push switch x 1
  * 22uf Capacitor x 3
  * 0.1uf(100nf) Capacitor x 3
  * DHT22 (am2302) x 1
  * ESP8266 x 1
    * v0.9.2.2 AT 펌웨어 사용, 설치법 참고 : http://m.blog.naver.com/damtaja/220311412393
  * 1117 3.3V (ams1117, ld1117 ...) 연결시 핀 방향에 주의.
  
## 시작하기
### 환경설정 
  * Wifi_Humidifier/Server/.properties 파일을 수정한다.
  ```
# 포트 번호
web.port 8080 
# 인증 키
control.key beom 
# 데이터 베이스파일 저장 경로
database ../data_base
  
  ```
  
### 서버 시작하기
  * Node.js 가 필요하다. (https://nodejs.org/en/)
  ```
  git clone https://github.com/ice3x2/Wifi_Humidifier.git
  cd ./Wifi_Humidifier/Server
  npm install -g gulp
  npm install -g bower
 	npm install
  bower install
  gulp run
  	
  ```
  
### 가습기 동작 상태 확인
  * LED 의 깜빡임으로 동작 상태를 확인할 수 있다.
    * 항상 켜져있음 : 초기화중.
    * 1초 간격으로 천천히 깜빡임 : 설정 모드
    * 0.2초 간격으로 깜빡임 : 서버 연결 실패. 또는 인증 실패.
    * 아주 빠르게 깜빡임 : AP(무선 공유기) 연결 실패.
    * 꺼져있음 : 정상 동작중
    
### 가습기 설정
  * 설정모드 진입 방법 : LED 가 1초 간격으로 천천히 깜빡일 때 까지 푸쉬 버튼을 누르고 있는다.
  * 설정모드에서 AP(무선 공유기) 정보와 서버 정보 입력 방법. 
     1. LED 가 1초 간격으로 깜빡일때 까지 푸쉬 버튼을 누른다.
     2. WIFI와 인터넷 브라우저를 사용할 수 있는 기기(스마트폰)에서 wifi 를 가습기(esp8266 모듈)에 연결한다.
     3. 인터넷 브라우저를 열고 192.168.4.1 를 입력하고 접속한다. 접속이 안 될 경우 현재 ip 주소를 확인하고 가장 마지막 자리 숫자만 1로 바꿔서 접속한다. 설정 안내 메시지가 뜨는 것을 확인한다.
     4. 	`htt p://192.168.4.1/ssid(공유기 이름)/패스워드/서버 주소/서버 포트 번호/인증키/` 와 같은 형식에 맞춰서 주소창에 정확하게 입력한다. 만약 설정이 완료될 경우 공유기 연결 상태나 서버 접속 가능과 관계 없이 Setup OK 라는 메세지가 출력된다. 만약, 공유기 이름이 iptime, 패스워드가 test, 서버 주소 192.168.0.4, 서버의 포트 번호 8080 `(주의 : http 기본 포트인 80포트를 사용하여도 포트 번호를 입력해야 한다.)`, 인증키가 beom 일 경우 다음과 같이 입력하여 설정할 수 있다. `http://192.168.4.1/iptime/test/192.168.0.4/8080/beom/`
     5. 전원을 제거하고 다시 연결한다. LED 가 깜빡일 경우 위 4번 과정에서 설정값을 잘못 입력 하였거나 서버가 동작중이 아닌 것이며, 정상적으로 동작한다면 초기화 완료뒤에 LED 가 꺼진다. 
  
  
