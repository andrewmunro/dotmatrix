#include <stdlib.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <WiFiManager.h>
#include <ArduinoWebsockets.h>

#define PANEL_WIDTH 64
#define PANEL_HEIGHT 32  // Panel height of 64 will required PIN_E to be defined.
#define PANELS_NUMBER 2  // Number of chained panels, if just a single panel, obviously set to 1
#define PIN_E 32
#define E_PIN_DEFAULT 18
#define PANE_WIDTH PANEL_WIDTH * PANELS_NUMBER
#define PANE_HEIGHT PANEL_HEIGHT
#define useWifiManager 0

const char* wifiSsid = "xxx";
const char* wifiPass = "xxx";

const char* websockets_connection_string = "ws://rgb.mun.sh/sub"; //Enter server adress
using namespace websockets;

MatrixPanel_I2S_DMA* dma_display;
WebsocketsClient client;

void onMessageCallback(WebsocketsMessage message) {
    uint16_t* uint16_data = (uint16_t *) message.c_str();
    dma_display->drawRGBBitmap(0, 0, uint16_data, 128, 32);
}

void onEventsCallback(WebsocketsEvent event, String data) {
    if(event == WebsocketsEvent::ConnectionOpened) {
        Serial.println("Connnection Opened");
        dma_display->fillScreenRGB888(0, 0, 255);
        dma_display->setTextSize(1);     // size 1 == 8 pixels high
        dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
        dma_display->setCursor(0,0);
        dma_display->print("Server Connected :)");
    } else if(event == WebsocketsEvent::ConnectionClosed) {
        Serial.println("Connnection Closed");
        dma_display->fillScreenRGB888(255, 0, 0);
        dma_display->setTextSize(1);     // size 1 == 8 pixels high
        dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
        dma_display->setCursor(0,0);
        dma_display->print("Server failed >:(");

        delay(2000);
        ESP.restart();
    } else if(event == WebsocketsEvent::GotPing) {
        Serial.println("Got a Ping!");
    } else if(event == WebsocketsEvent::GotPong) {
        Serial.println("Got a Pong!");
    }
}

void setup() {
  Serial.begin(115200);

  HUB75_I2S_CFG mxconfig;
  mxconfig.mx_height = PANEL_HEIGHT;      // we have 64 pix heigh panels
  mxconfig.chain_length = PANELS_NUMBER;  // we have 2 panels chained
  mxconfig.gpio.e = PIN_E;                // we MUST assign pin e to some free pin on a board to drive 64 pix height panels with 1/32 scan
  // mxconfig.latch_blanking = 4;
  // mxconfig.i2sspeed = HUB75_I2S_CFG::HZ_10M;
  mxconfig.clkphase = false;

  dma_display = new MatrixPanel_I2S_DMA(mxconfig);

  // Allocate memory and start DMA display
  if (not dma_display->begin())
    Serial.println("****** !KABOOM! I2S memory allocation failed ***********");

  // let's adjust default brightness to about 75%
  dma_display->setBrightness8(255);  // range is 0-255, 0 - 0%, 255 - 100%

  // Write some text
  dma_display->fillScreenRGB888(0, 0, 255);
  dma_display->setTextSize(1);     // size 1 == 8 pixels high
  dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
  dma_display->print("Connecting...config  wifi at SSID:TrainSignAP");
  delay(1000);

  bool connected;

  #if useWifiManager == 0
    // Normal wifi
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid, wifiPass);
    while (WiFi.status() != WL_CONNECTED) {
      delay(100);
      Serial.print(".");
    }

    connected = true;
  #else
    // WIFI MANAGER
    WiFiManager wm;
    connected = wm.autoConnect("TrainSignAP");
  #endif

  
  if(!connected) {
      Serial.println("Failed to connect");
      dma_display->fillScreenRGB888(255, 0, 0);
      dma_display->setTextSize(1);     // size 1 == 8 pixels high
      dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
      dma_display->setCursor(0,0);
      dma_display->print("Wifi failed >:(");
      delay(2000);
      ESP.restart();
  } else {
      //if you get here you have connected to the WiFi    
      Serial.println("connected...yeey :)");

      dma_display->fillScreenRGB888(0, 0, 255);
      dma_display->setTextSize(1);     // size 1 == 8 pixels high
      dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
      dma_display->setCursor(0,0);
      dma_display->print("Wifi Connected :)");
      delay(2000);

      // run callback when messages are received
      client.onMessage(onMessageCallback);
      
      // run callback when events are occuring
      client.onEvent(onEventsCallback);

      // Connect to server
      connected = client.connect(websockets_connection_string);
      if(!connected) {
        Serial.println("Connnection Closed");
        dma_display->fillScreenRGB888(255, 0, 0);
        dma_display->setTextSize(1);     // size 1 == 8 pixels high
        dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
        dma_display->setCursor(0,0);
        dma_display->print("Server failed >:(");

        delay(2000);
        ESP.restart();
      }
  }
}

void loop() {
  client.poll();
}
