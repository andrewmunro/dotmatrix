#include <stdlib.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
// #include <WiFiManager.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <AsyncUDP.h>

#define PANEL_WIDTH 64
#define PANEL_HEIGHT 32
#define PANELS_NUMBER 2
#define E_PIN_DEFAULT 18

const char* ssid = "xxx";
const char* password = "xxx";
const int udpPort = 8080;

MatrixPanel_I2S_DMA* dma_display;
AsyncUDP udp;

byte buffers[4][1024]; // Adjust this according to your needs
bool received[4] = {false}; // Flag to track received packets
uint16_t assembledData[4096];
int expectedSequence = 0;

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

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }

  Serial.println("WiFi Connected");

  if (udp.connect(IPAddress(0,0,0,0), udpPort)) {
    Serial.println("Server Connected");
    udp.onPacket([](AsyncUDPPacket packet) {
      int sequence = packet.data()[0]; // Assuming first byte is sequence number
      memcpy(buffers[sequence], packet.data() + 1, packet.length() - 1);
      received[sequence] = true;
    });
    udp.print("hi");
  } else {
    Serial.println("Failed to connect");
    dma_display->clearScreen();
    dma_display->setTextSize(1);     // size 1 == 8 pixels high
    dma_display->setTextWrap(true);  // Don't wrap at end of line - will do ourselves
    dma_display->setCursor(0, 0);
    dma_display->print("Wifi failed :,(");
    delay(2000);
    ESP.restart();
  }
}


void loop() {
  bool allReceived = true;
  for (int i = 0; i < 4; i++) {
    if (!received[i]) {
      allReceived = false;
      break;
    }
  }
  
  if (allReceived) {
    for (int i = 0; i < 4; i++) {
      memcpy(assembledData + (1024 * i), buffers[i], 1024);
      received[i] = false;
    }

    dma_display->drawRGBBitmap(0, 0, assembledData, 128, 32);
  }
}
