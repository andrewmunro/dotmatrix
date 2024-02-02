#include <stdlib.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <WiFiManager.h>
#include <ArduinoWebsockets.h>

#define PANEL_WIDTH 64
#define PANEL_HEIGHT 32
#define PANELS_NUMBER 2
#define E_PIN_DEFAULT 18

const char* websockets_connection_string = "ws://rgb.mun.sh/sub"; //Enter server adress
using namespace websockets;

MatrixPanel_I2S_DMA* dma_display;
WebsocketsClient client;

void onEventsCallback(WebsocketsEvent event, String data) {
    if(event == WebsocketsEvent::ConnectionOpened) {
        Serial.println("Connnection Opened");
    } else if(event == WebsocketsEvent::ConnectionClosed) {
        Serial.println("Connnection Closed");
        delay(2000);
        ESP.restart();
    }
}

void setup() {
  Serial.begin(115200);

  HUB75_I2S_CFG mxconfig;
  mxconfig.mx_height = PANEL_HEIGHT;      // we have 64 pix heigh panels
  mxconfig.chain_length = PANELS_NUMBER;  // we have 2 panels chained
  mxconfig.gpio.e = E_PIN_DEFAULT;        // we MUST assign pin e to some free pin on a board to drive 64 pix height panels with 1/32 scan
  mxconfig.clkphase = false;

  dma_display = new MatrixPanel_I2S_DMA(mxconfig);

  // Allocate memory and start DMA display
  if (not dma_display->begin())
    Serial.println("****** !KABOOM! I2S memory allocation failed ***********");

  dma_display->setBrightness8(128);  // range is 0-255, 0 - 0%, 255 - 100%

  dma_display->clearScreen();
  dma_display->setTextSize(1);
  dma_display->setTextWrap(true);
  dma_display->setCursor(0,0);
  dma_display->print("Connecting to WIFI...");
  dma_display->setCursor(16, 16);
  dma_display->print("SSID: TrainSignAP");

  WiFiManager wm;
  bool connected;
  connected = wm.autoConnect("TrainSignAP");

  if(!connected) {
      Serial.println("Failed to connect");
      dma_display->clearScreen();
      dma_display->setTextSize(1);     // size 1 == 8 pixels high
      dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
      dma_display->setCursor(0,0);
      dma_display->print("Wifi failed :,(");
      delay(2000);
      ESP.restart();
  }
  
  // run callback when events are occuring
  client.onEvent(onEventsCallback);

  // Connect to server
  connected = client.connect(websockets_connection_string);
  if(!connected) {
    Serial.println("Connnection Closed");
    dma_display->clearScreen();
    dma_display->setTextSize(1);
    dma_display->setTextWrap(true);
    dma_display->setCursor(0,0);
    dma_display->print("Stream failed :,(");

    delay(2000);
    ESP.restart();
  }
}

void loop() {
  auto message = client.readBlocking();

  uint16_t* uint16_data = (uint16_t *) message.c_str();
  dma_display->drawRGBBitmap(0, 0, uint16_data, 128, 32);
}
