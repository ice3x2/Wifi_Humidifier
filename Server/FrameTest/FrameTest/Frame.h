//
//  Frame.h
//  FrameTest
//
//  Created by SUNG BEOM HONG on 2015. 6. 27..
//  Copyright (c) 2015년 SUNG BEOM HONG. All rights reserved.
//

#ifndef FrameTest_Frame_h
#define FrameTest_Frame_h
#include <iostream>


#define BT_RES_HEADER "RES"
#define BT_RES_HEADER_SIZE 3
#define BT_RES_LENGHT_INDEX 3
#define BT_RES_DATA_INDEX 4
#define BUFFER_SIZE 128

typedef bool boolean;
typedef unsigned char byte;
typedef unsigned char uint8_t;

class PacketFrame{
    
    
    private :
    uint8_t gCurrentBufferIndex;
    byte gBufferSize;
    byte gCurrentCRC8;
    boolean gIsValidBuffer;
    boolean gIsReadBufferComplete;
    uint8_t gBuffer[BUFFER_SIZE];
    
public:
    PacketFrame();
    void reset();
    boolean update(byte data);
    
    inline byte getDataLength() {
        return gBuffer[BT_RES_LENGHT_INDEX];
    }
    
    inline boolean isValid() {
        return gIsValidBuffer;
    }
    
    inline boolean isReadComplete() {
        return gIsReadBufferComplete;
    }
    
    inline byte* getBuffer() {
        return gBuffer;
    }
    
    inline byte getBufferSize() {
        return gBufferSize;
    }
    
    
    void getData(byte* data) {
        byte dataLength = getDataLength();
        for(int i = 0; i < dataLength; ++i) {
            data[i] = gBuffer[i + BT_RES_DATA_INDEX];
        }
    }
    
    /**
     * 데이터의 길이를 입력한다.
     * @param dataLength : 입력될 데이터의 길이.
     */
    void setDataLength(byte dataLength) {
        if(gIsReadBufferComplete) {
            reset();
        }
        gBuffer[BT_RES_LENGHT_INDEX] = dataLength;
        gCurrentBufferIndex = BT_RES_DATA_INDEX;
        gBufferSize = gCurrentBufferIndex + dataLength + 1;
    }
    
    /**
     *
     */
    boolean pushData(byte data) {
        if(gIsReadBufferComplete) {
            reset();
        }
        //byte length = gBuffer[BT_RES_LENGHT_INDEX];
        gBuffer[gCurrentBufferIndex++] = data;
        gCurrentCRC8 = updateCRC8CITT(gCurrentCRC8, data);
        if(gCurrentBufferIndex + 1 == gBufferSize) {
            gBuffer[gCurrentBufferIndex] = gCurrentCRC8;
            gIsReadBufferComplete = true;
            return true;
        }

        return false;
        
    }
    
    
    void pushData(byte* data, byte length) {
        reset();
        gBufferSize = length + BT_RES_HEADER_SIZE + 1 + 1;
        int idx = 0;
        byte crc8 = 0;
        for(int i = 0; i < BT_RES_HEADER_SIZE; ++idx, ++i) {
            gBuffer[idx] = BT_RES_HEADER[i];
        }
        gBuffer[idx++] = length;
        for(int i = 0; i < length; ++idx, ++i) {
            gBuffer[idx] = data[i];
            crc8 = updateCRC8CITT(crc8, data[i]);
        }
        gBuffer[idx] = crc8;
    }
    
    
    
    
private:
    uint8_t updateCRC8CITT(uint8_t inCrc, uint8_t inData);
    
};

#endif
