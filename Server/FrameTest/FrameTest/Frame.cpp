#include "Frame.h"


PacketFrame::PacketFrame() {
    reset();
}

boolean PacketFrame::update(byte data) {
    gBuffer[gCurrentBufferIndex] = data;
    if(gCurrentBufferIndex == BT_RES_HEADER_SIZE) {
        // +1 은 Size 정보 크기
        gBufferSize = (byte)(BT_RES_HEADER_SIZE + 1 + data);
        ++gCurrentBufferIndex;
    }
    else if(gCurrentBufferIndex > BT_RES_HEADER_SIZE && gCurrentBufferIndex < gBufferSize) {
        gCurrentCRC8 = updateCRC8CITT(gCurrentCRC8, data);
        ++gCurrentBufferIndex;
    } else if(gCurrentBufferIndex == gBufferSize) {
        gIsReadBufferComplete = true;
        gIsValidBuffer = gCurrentCRC8 == data;
        ++gCurrentBufferIndex;
        return  true;
    } else if((gCurrentBufferIndex == 0  && BT_RES_HEADER[0] == data) || (gIsReadBufferComplete  && BT_RES_HEADER[0] == data)) {
        reset();
        gCurrentBufferIndex = 1;
    }  else if(gCurrentBufferIndex < BT_RES_HEADER_SIZE  && BT_RES_HEADER[gCurrentBufferIndex] == data) {
        ++gCurrentBufferIndex;
    }
    
    return false;
}

void PacketFrame::reset() {
    gCurrentBufferIndex = 0;
    gBufferSize = -1;
    gCurrentCRC8 = 0;
    gIsValidBuffer = false;
    gIsReadBufferComplete = false;
    memset(gBuffer, 0, BUFFER_SIZE);
    for(int i = 0; i < BT_RES_HEADER_SIZE; ++i) {
        gBuffer[i] = BT_RES_HEADER[i];
    }
}

uint8_t PacketFrame::updateCRC8CITT (uint8_t inCrc, uint8_t inData)  {
    uint8_t   i;
    uint8_t   data;
    
    data = inCrc ^ inData;
    
    for ( i = 0; i < 8; i++ )
    {
        if (( data & 0x80 ) != 0 )
        {
            data <<= 1;
            data ^= 0x07;
        }
        else
        {
            data <<= 1;
        }
    }
    return data;
}

