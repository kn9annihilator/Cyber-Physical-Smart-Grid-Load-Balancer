
/*
 * Smart Socket Sentinel - Arduino Code
 * This code runs on the Arduino Uno to collect sensor data and control relays.
 * It communicates with the ESP8266 via UART for sending data and receiving commands.
 */

// Pin definitions
#define RELAY1_PIN 8      // Socket 1 relay
#define RELAY2_PIN 9      // Socket 2 relay
#define RELAY3_PIN 10     // Socket 3 relay
#define ISOLATION_PIN 11  // Isolation relay

#define VOLTAGE1_PIN A2   // Socket 1 voltage sensor
#define VOLTAGE2_PIN A1   // Socket 2 voltage sensor
#define VOLTAGE3_PIN A0   // Socket 3 voltage sensor

#define CURRENT1_PIN A5   // Socket 1 current sensor
#define CURRENT2_PIN A4   // Socket 2 current sensor
#define CURRENT3_PIN A3   // Socket 3 current sensor

// Constants for sensors
#define VOLTAGE_REFERENCE 5.0   // Arduino reference voltage
#define ADC_RESOLUTION 1024.0   // 10-bit ADC
#define VOLTAGE_CALIBRATION 0.6 // Calibration factor for ZMPT101B
#define CURRENT_SENSITIVITY 66  // mV/A for ACS712 30A

// Communication protocol
#define START_MARKER '<'
#define END_MARKER '>'
#define DATA_SEPARATOR ','

// Data structure for socket measurements
struct SocketData {
  int id;
  bool relayState;
  float voltage;
  float current;
  float power;
  bool isActive;
};

// Global variables
SocketData sockets[3];
bool systemIsolated = false;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 1000; // 1 second

// Setup function
void setup() {
  // Initialize pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  pinMode(ISOLATION_PIN, OUTPUT);
  
  // Relays are active LOW, so initialize them as off (HIGH)
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  digitalWrite(RELAY3_PIN, HIGH);
  digitalWrite(ISOLATION_PIN, HIGH); // Keep isolation relay off initially
  
  // Initialize socket data
  for (int i = 0; i < 3; i++) {
    sockets[i].id = i + 1;
    sockets[i].relayState = false;
    sockets[i].voltage = 0.0;
    sockets[i].current = 0.0;
    sockets[i].power = 0.0;
    sockets[i].isActive = false;
  }
  
  // Initialize serial communication with ESP8266
  Serial.begin(9600);
  delay(100);
}

// Main loop
void loop() {
  // Check for commands from ESP8266
  receiveCommands();
  
  // Read sensor data
  readSensors();
  
  // Send data to ESP8266 at regular intervals
  if (millis() - lastSendTime > SEND_INTERVAL) {
    sendData();
    lastSendTime = millis();
  }
}

// Function to read all sensor data
void readSensors() {
  // Read Socket 1
  sockets[0].voltage = readVoltage(VOLTAGE1_PIN);
  sockets[0].current = readCurrent(CURRENT1_PIN);
  sockets[0].power = sockets[0].voltage * sockets[0].current;
  sockets[0].isActive = sockets[0].power > 10.0; // Consider active if power > 10W
  
  // Read Socket 2
  sockets[1].voltage = readVoltage(VOLTAGE2_PIN);
  sockets[1].current = readCurrent(CURRENT2_PIN);
  sockets[1].power = sockets[1].voltage * sockets[1].current;
  sockets[1].isActive = sockets[1].power > 10.0;
  
  // Read Socket 3
  sockets[2].voltage = readVoltage(VOLTAGE3_PIN);
  sockets[2].current = readCurrent(CURRENT3_PIN);
  sockets[2].power = sockets[2].voltage * sockets[2].current;
  sockets[2].isActive = sockets[2].power > 10.0;
}

// Function to read voltage from ZMPT101B sensor
float readVoltage(int pin) {
  // Read multiple samples for better accuracy
  float sum = 0;
  const int samples = 20;
  
  for (int i = 0; i < samples; i++) {
    float voltage = analogRead(pin) * (VOLTAGE_REFERENCE / ADC_RESOLUTION);
    sum += voltage;
    delay(1);
  }
  
  float avgVoltage = sum / samples;
  
  // Apply calibration factor
  return avgVoltage * VOLTAGE_CALIBRATION * 110.0; // Scale to AC voltage (around 220-240V)
}

// Function to read current from ACS712 sensor
float readCurrent(int pin) {
  // Read multiple samples for better accuracy
  float sum = 0;
  const int samples = 20;
  
  for (int i = 0; i < samples; i++) {
    float voltage = analogRead(pin) * (VOLTAGE_REFERENCE / ADC_RESOLUTION);
    
    // Convert to current: (voltage - offset) / sensitivity
    // 2.5V is the offset for zero current
    float current = (voltage - 2.5) / (CURRENT_SENSITIVITY / 1000.0);
    
    // Ensure positive current value
    current = abs(current);
    
    sum += current;
    delay(1);
  }
  
  return sum / samples;
}

// Function to send data to ESP8266
void sendData() {
  String message = String(START_MARKER);
  
  // Add system status
  message += "STATUS" + String(DATA_SEPARATOR);
  message += String(systemIsolated) + String(DATA_SEPARATOR);
  
  // Add socket data
  for (int i = 0; i < 3; i++) {
    message += "SOCKET" + String(DATA_SEPARATOR);
    message += String(sockets[i].id) + String(DATA_SEPARATOR);
    message += String(sockets[i].relayState) + String(DATA_SEPARATOR);
    message += String(sockets[i].voltage) + String(DATA_SEPARATOR);
    message += String(sockets[i].current) + String(DATA_SEPARATOR);
    message += String(sockets[i].power) + String(DATA_SEPARATOR);
    message += String(sockets[i].isActive) + String(DATA_SEPARATOR);
  }
  
  message += String(END_MARKER);
  Serial.println(message);
}

// Function to receive commands from ESP8266
void receiveCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    
    // Parse command if it has the proper format
    if (command.startsWith(String(START_MARKER)) && command.endsWith(String(END_MARKER))) {
      // Remove markers
      command = command.substring(1, command.length() - 1);
      
      // Parse command type
      int separator = command.indexOf(DATA_SEPARATOR);
      if (separator > 0) {
        String type = command.substring(0, separator);
        String data = command.substring(separator + 1);
        
        if (type == "RELAY") {
          // Format: <RELAY,id,state>
          int nextSeparator = data.indexOf(DATA_SEPARATOR);
          if (nextSeparator > 0) {
            int relayId = data.substring(0, nextSeparator).toInt();
            int state = data.substring(nextSeparator + 1).toInt();
            
            // Control the appropriate relay
            controlRelay(relayId, state == 1);
          }
        } else if (type == "ISOLATE") {
          // Format: <ISOLATE,state>
          int state = data.toInt();
          controlIsolation(state == 1);
        }
      }
    }
  }
}

// Function to control individual socket relays
void controlRelay(int relayId, bool state) {
  // Only control relays if not isolated
  if (!systemIsolated) {
    int pin = -1;
    
    // Map relay ID to pin
    switch (relayId) {
      case 1:
        pin = RELAY1_PIN;
        sockets[0].relayState = state;
        break;
      case 2:
        pin = RELAY2_PIN;
        sockets[1].relayState = state;
        break;
      case 3:
        pin = RELAY3_PIN;
        sockets[2].relayState = state;
        break;
      case 4:
        controlIsolation(state);
        return;
    }
    
    // Control the relay (active LOW, so !state)
    if (pin != -1) {
      digitalWrite(pin, !state);
    }
  }
}

// Function to control the isolation relay
void controlIsolation(bool isolate) {
  systemIsolated = isolate;
  
  // First shut down all socket relays
  digitalWrite(RELAY1_PIN, HIGH); // OFF
  digitalWrite(RELAY2_PIN, HIGH); // OFF
  digitalWrite(RELAY3_PIN, HIGH); // OFF
  
  // Update socket states
  for (int i = 0; i < 3; i++) {
    sockets[i].relayState = false;
  }
  
  // Then control isolation relay (active LOW, so !isolate)
  digitalWrite(ISOLATION_PIN, !isolate);
}
