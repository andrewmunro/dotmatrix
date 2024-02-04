#include <stdlib.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <zlib.h>

#define PANEL_WIDTH 64
#define PANEL_HEIGHT 32
#define PANELS_NUMBER 2
#define E_PIN_DEFAULT 18

WiFiManagerParameter brightness("brightness", "Display Brightness", "128", 40);
WiFiManagerParameter serverAddress("serverAddress", "Server Address", "rgb.mun.sh", 40);
WiFiManagerParameter serverPath("serverPath", "Server Path", "/sub", 40);
WiFiManagerParameter serverPort("serverPort", "Server Port", "80", 40);
WiFiManagerParameter serverReconnectInterval("serverReconnectInterval", "Server Reconnect Delay", "5000", 40);

MatrixPanel_I2S_DMA* dma_display;
WebSocketsClient webSocket;

uLongf destLen = 8192;
Bytef destBuffer[8192];
Bytef resultBuffer[8192];

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
  dma_display->setCursor(0, 0);
  dma_display->print("Connecting to WIFI...");
  dma_display->setCursor(16, 16);
  dma_display->print("SSID: TrainSignAP");

  WiFiManager wm;
  wm.addParameter(&brightness);
  wm.addParameter(&serverAddress);
  wm.addParameter(&serverPath);
  wm.addParameter(&serverPort);
  wm.addParameter(&serverReconnectInterval);

  bool connected;
  connected = wm.autoConnect("TrainSignAP");

  if (!connected) {
    Serial.println("Failed to connect");
    dma_display->clearScreen();
    dma_display->setTextSize(1);     // size 1 == 8 pixels high
    dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
    dma_display->setCursor(0, 0);
    dma_display->print("Wifi failed :,(");
    delay(2000);
    ESP.restart();
  }

  Serial.println("WiFi Connected");

  String brightnessValue = brightness.getValue();
  int brightnessInt = brightnessValue.toInt();
  if (brightnessInt < 0) brightnessInt = 0;
  if (brightnessInt > 255) brightnessInt = 255;
  dma_display->setBrightness8(brightnessInt);

  String portValue = serverPort.getValue();
  int port = portValue.toInt();
  String serverReconnectIntervalValue = serverReconnectInterval.getValue();
  int serverReconnect = serverReconnectIntervalValue.toInt();

  webSocket.begin(serverAddress.getValue(), port, serverPath.getValue());
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(serverReconnect);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  // Decompress the payload
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected!");
      memset(resultBuffer, 0, 8192);

      dma_display->clearScreen();
      dma_display->setTextSize(1);
      dma_display->setTextWrap(true);
      dma_display->setCursor(0, 0);
      dma_display->print("Reconnecting...");
      break;
    case WStype_CONNECTED:
      Serial.printf("Connected to url: %s\n", payload);
      break;
    case WStype_BIN: {
      int result = uncompress(destBuffer, &destLen, payload, length);
      if (result != Z_OK) {
        Serial.println("Decompression failed!");
      }

      // apply result delta to last frame
      for (int i = 0; i < 8192; i++) {
        resultBuffer[i] = resultBuffer[i] + destBuffer[i];
      }

      break;
    }
  }
}

void loop() {
  webSocket.loop();
  if (webSocket.isConnected()) {
    dma_display->drawRGBBitmap(0, 0, (uint16_t*) resultBuffer, 128, 32);
  }
}
