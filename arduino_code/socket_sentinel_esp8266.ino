
/*
 * Smart Socket Sentinel - ESP8266 Code
 * This code runs on the ESP8266 to:
 * 1. Communicate with Arduino via UART
 * 2. Serve as a web server for the dashboard
 * 3. Implement security features
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>  // For MQTT (optional)

// Wi-Fi credentials
const char* ssid = "YourWiFiSSID";      // Replace with your WiFi SSID
const char* password = "YourWiFiPass";   // Replace with your WiFi password

// MQTT Settings (optional)
const char* mqtt_server = "your-mqtt-broker.com";
const int mqtt_port = 1883;
const char* mqtt_user = "mqtt_user";
const char* mqtt_password = "mqtt_password";
const char* mqtt_topic_data = "socket_sentinel/data";
const char* mqtt_topic_command = "socket_sentinel/command";
bool useMqtt = false;  // Set to true if you want to use MQTT

// Security settings
String adminPassword = "admin123";       // Default admin password
bool communicationBlocked = false;       // Flag for blocked communication
bool abnormalDetected = false;           // Flag for abnormal activity
String isolationReason = "";             // Reason for isolation
String allowedIPs[10] = {"0.0.0.0"};     // List of allowed IPs (0.0.0.0 means all IPs allowed)
int allowedIPsCount = 1;                 // Number of allowed IPs

// Pin mappings for direct relay control
#define RELAY1_DIRECT_PIN D3     // Socket 1 direct control
#define RELAY2_DIRECT_PIN D4     // Socket 2 direct control
#define RELAY3_DIRECT_PIN D5     // Socket 3 direct control
#define ISOLATION_DIRECT_PIN D6  // Isolation direct control

// UART communication with Arduino
#define START_MARKER '<'
#define END_MARKER '>'
#define DATA_SEPARATOR ','

// Web server and MQTT clients
ESP8266WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// System data
struct SocketData {
  int id;
  bool status;
  float voltage;
  float current;
  float power;
  bool isActive;
};

SocketData sockets[3];
bool systemIsolated = false;
unsigned long lastArduinoData = 0;
bool arduinoConnected = false;
unsigned long lastDataPublish = 0;
const unsigned long PUBLISH_INTERVAL = 5000; // 5 seconds

// Setup function
void setup() {
  // Initialize serial communication with Arduino
  Serial.begin(9600);
  
  // Initialize direct control pins
  pinMode(RELAY1_DIRECT_PIN, OUTPUT);
  pinMode(RELAY2_DIRECT_PIN, OUTPUT);
  pinMode(RELAY3_DIRECT_PIN, OUTPUT);
  pinMode(ISOLATION_DIRECT_PIN, OUTPUT);
  
  // Initialize direct control pins to HIGH (relays OFF)
  digitalWrite(RELAY1_DIRECT_PIN, HIGH);
  digitalWrite(RELAY2_DIRECT_PIN, HIGH);
  digitalWrite(RELAY3_DIRECT_PIN, HIGH);
  digitalWrite(ISOLATION_DIRECT_PIN, HIGH);
  
  // Initialize socket data
  for (int i = 0; i < 3; i++) {
    sockets[i].id = i + 1;
    sockets[i].status = false;
    sockets[i].voltage = 0.0;
    sockets[i].current = 0.0;
    sockets[i].power = 0.0;
    sockets[i].isActive = false;
  }
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  
  // Wait for connection
  int connectionAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && connectionAttempts < 20) {
    delay(500);
    connectionAttempts++;
  }
  
  // If connected to WiFi, set up web server
  if (WiFi.status() == WL_CONNECTED) {
    // Configure server endpoints
    server.on("/api/system", HTTP_GET, handleGetSystemData);
    server.on("/api/relay", HTTP_POST, handleRelayControl);
    server.on("/api/isolation", HTTP_POST, handleIsolationControl);
    server.on("/api/config", HTTP_POST, handleConfigUpdate);
    server.on("/api/reset", HTTP_POST, handleCommunicationReset);
    
    // Handle OPTIONS for CORS
    server.on("/api/system", HTTP_OPTIONS, handleCORS);
    server.on("/api/relay", HTTP_OPTIONS, handleCORS);
    server.on("/api/isolation", HTTP_OPTIONS, handleCORS);
    server.on("/api/config", HTTP_OPTIONS, handleCORS);
    server.on("/api/reset", HTTP_OPTIONS, handleCORS);
    
    // Start server
    server.begin();
    
    // Setup MQTT if enabled
    if (useMqtt) {
      mqttClient.setServer(mqtt_server, mqtt_port);
      mqttClient.setCallback(mqttCallback);
    }
  }
}

// Main loop
void loop() {
  // Handle web server clients
  server.handleClient();
  
  // Check for data from Arduino
  if (!communicationBlocked) {
    receiveDataFromArduino();
  }
  
  // Check if Arduino connection is lost
  if (millis() - lastArduinoData > 5000) {
    arduinoConnected = false;
  }
  
  // Handle MQTT if enabled
  if (useMqtt) {
    // Maintain MQTT connection
    if (!mqttClient.connected()) {
      reconnectMqtt();
    }
    
    // Process MQTT messages
    mqttClient.loop();
    
    // Publish data at regular intervals
    if (millis() - lastDataPublish > PUBLISH_INTERVAL) {
      publishSystemData();
      lastDataPublish = millis();
    }
  }
}

// MQTT reconnection function
void reconnectMqtt() {
  // Attempt to connect to MQTT broker
  if (mqttClient.connect("ESP8266Client", mqtt_user, mqtt_password)) {
    // Subscribe to command topic
    mqttClient.subscribe(mqtt_topic_command);
  }
}

// MQTT callback function
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  // Process message if it's a command
  if (String(topic) == mqtt_topic_command) {
    // Parse JSON command
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, message);
    
    if (!error) {
      // Process relay control command
      if (doc.containsKey("relay")) {
        int relayId = doc["relay"]["id"];
        bool state = doc["relay"]["state"];
        
        // Control relay
        controlRelay(relayId, state);
      }
      
      // Process isolation command
      if (doc.containsKey("isolate")) {
        bool isolate = doc["isolate"]["state"];
        String password = doc["isolate"]["password"];
        
        // Only isolate if password is correct
        if (password == adminPassword) {
          controlIsolation(isolate);
        }
      }
    }
  }
}

// Function to publish system data via MQTT
void publishSystemData() {
  if (!mqttClient.connected()) {
    return;
  }
  
  // Create JSON document
  DynamicJsonDocument doc(2048);
  
  // Add socket data
  JsonArray socketsArray = doc.createNestedArray("sockets");
  for (int i = 0; i < 3; i++) {
    JsonObject socketObj = socketsArray.createNestedObject();
    socketObj["id"] = sockets[i].id;
    socketObj["status"] = sockets[i].status;
    socketObj["voltage"] = sockets[i].voltage;
    socketObj["current"] = sockets[i].current;
    socketObj["power"] = sockets[i].power;
    socketObj["isActive"] = sockets[i].isActive;
  }
  
  // Add system status
  doc["systemStatus"]["isConnected"] = arduinoConnected;
  doc["systemStatus"]["isIsolated"] = systemIsolated;
  doc["systemStatus"]["isolationReason"] = isolationReason;
  
  // Serialize and publish
  String jsonString;
  serializeJson(doc, jsonString);
  mqttClient.publish(mqtt_topic_data, jsonString.c_str());
}

// Function to receive data from Arduino
void receiveDataFromArduino() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    
    // Parse data if it has the proper format
    if (data.startsWith(String(START_MARKER)) && data.endsWith(String(END_MARKER))) {
      // Remove markers
      data = data.substring(1, data.length() - 1);
      
      // Update last data timestamp
      lastArduinoData = millis();
      arduinoConnected = true;
      
      // Parse the data
      int startIdx = 0;
      int endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
      
      while (startIdx < data.length() && endIdx != -1) {
        String type = data.substring(startIdx, endIdx);
        startIdx = endIdx + 1;
        
        if (type == "STATUS") {
          // Parse system status
          endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
          systemIsolated = data.substring(startIdx, endIdx) == "1";
          startIdx = endIdx + 1;
        } 
        else if (type == "SOCKET") {
          // Parse socket data
          // Format: SOCKET,id,state,voltage,current,power,isActive,
          
          // Parse socket ID
          endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
          int socketId = data.substring(startIdx, endIdx).toInt() - 1;
          startIdx = endIdx + 1;
          
          if (socketId >= 0 && socketId < 3) {
            // Parse relay state
            endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
            sockets[socketId].status = data.substring(startIdx, endIdx) == "1";
            startIdx = endIdx + 1;
            
            // Parse voltage
            endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
            sockets[socketId].voltage = data.substring(startIdx, endIdx).toFloat();
            startIdx = endIdx + 1;
            
            // Parse current
            endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
            sockets[socketId].current = data.substring(startIdx, endIdx).toFloat();
            startIdx = endIdx + 1;
            
            // Parse power
            endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
            sockets[socketId].power = data.substring(startIdx, endIdx).toFloat();
            startIdx = endIdx + 1;
            
            // Parse isActive
            endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
            sockets[socketId].isActive = data.substring(startIdx, endIdx) == "1";
            startIdx = endIdx + 1;
          }
        }
        
        // Find next type
        endIdx = data.indexOf(DATA_SEPARATOR, startIdx);
      }
    }
  }
}

// Function to send command to Arduino
void sendCommandToArduino(String command) {
  // Only send if communication is not blocked
  if (!communicationBlocked) {
    Serial.println(command);
  }
}

// Function to control relay through Arduino
void controlRelay(int relayId, bool state) {
  // First try Arduino communication
  String command = String(START_MARKER) + "RELAY" + String(DATA_SEPARATOR) + 
                  String(relayId) + String(DATA_SEPARATOR) + 
                  String(state ? 1 : 0) + String(END_MARKER);
  
  sendCommandToArduino(command);
  
  // Also try direct control as backup
  int pin = -1;
  switch (relayId) {
    case 1:
      pin = RELAY1_DIRECT_PIN;
      break;
    case 2:
      pin = RELAY2_DIRECT_PIN;
      break;
    case 3:
      pin = RELAY3_DIRECT_PIN;
      break;
    case 4:
      pin = ISOLATION_DIRECT_PIN;
      break;
  }
  
  if (pin != -1) {
    digitalWrite(pin, !state); // Active LOW
  }
  
  // Update local state if needed
  if (relayId >= 1 && relayId <= 3) {
    sockets[relayId - 1].status = state;
  } else if (relayId == 4) {
    systemIsolated = state;
  }
}

// Function to control isolation
void controlIsolation(bool isolate) {
  // Send isolation command to Arduino
  String command = String(START_MARKER) + "ISOLATE" + String(DATA_SEPARATOR) + 
                   String(isolate ? 1 : 0) + String(END_MARKER);
  
  sendCommandToArduino(command);
  
  // Also try direct control
  digitalWrite(ISOLATION_DIRECT_PIN, !isolate); // Active LOW
  
  // Update local state
  systemIsolated = isolate;
  
  // Turn off all sockets if isolated
  if (isolate) {
    digitalWrite(RELAY1_DIRECT_PIN, HIGH); // OFF
    digitalWrite(RELAY2_DIRECT_PIN, HIGH); // OFF
    digitalWrite(RELAY3_DIRECT_PIN, HIGH); // OFF
    
    for (int i = 0; i < 3; i++) {
      sockets[i].status = false;
    }
  }
}

// API endpoint handlers
void handleGetSystemData() {
  // Check IP for security
  if (!checkIPAllowed()) {
    return; // handleIPNotAllowed already set the response
  }
  
  // Calculate total power
  float totalPower = 0;
  for (int i = 0; i < 3; i++) {
    totalPower += sockets[i].power;
  }
  
  // Create JSON response
  DynamicJsonDocument doc(4096);
  
  // Add socket data
  JsonArray socketsArray = doc.createNestedArray("sockets");
  for (int i = 0; i < 3; i++) {
    JsonObject socketObj = socketsArray.createNestedObject();
    socketObj["id"] = sockets[i].id;
    socketObj["name"] = "Socket " + String(sockets[i].id);
    socketObj["status"] = sockets[i].status;
    socketObj["voltage"] = sockets[i].voltage;
    socketObj["current"] = sockets[i].current;
    socketObj["power"] = sockets[i].power;
    socketObj["isActive"] = sockets[i].isActive;
  }
  
  // Add system status
  JsonObject statusObj = doc.createNestedObject("systemStatus");
  statusObj["isConnected"] = arduinoConnected;
  statusObj["isIsolated"] = systemIsolated;
  statusObj["isolationReason"] = isolationReason;
  statusObj["isCommunicationBlocked"] = communicationBlocked;
  statusObj["lastUpdated"] = getISOTimestamp();
  statusObj["ipAddress"] = WiFi.localIP().toString();
  statusObj["totalPower"] = totalPower;
  statusObj["abnormalDetected"] = abnormalDetected;
  
  // Add power history (mock data since we don't store history)
  JsonArray historyArray = doc.createNestedArray("powerHistory");
  unsigned long now = millis();
  
  for (int i = 0; i < 60; i++) {
    JsonObject historyPoint = historyArray.createNestedObject();
    
    // Create timestamp for each point (going back from now)
    String timestamp = getISOTimestamp(now - (60 - i) * 60000);
    historyPoint["timestamp"] = timestamp;
    
    // For mock data, create some variation using sin waves
    float factor = 1.0 + 0.3 * sin(i * 0.1) + 0.2 * sin(i * 0.05);
    float socket1Power = sockets[0].power > 0 ? sockets[0].power * factor : 50 * factor;
    float socket2Power = sockets[1].power > 0 ? sockets[1].power * factor : 80 * factor;
    float socket3Power = sockets[2].power > 0 ? sockets[2].power * factor : 70 * factor;
    
    historyPoint["socket1"] = socket1Power;
    historyPoint["socket2"] = socket2Power;
    historyPoint["socket3"] = socket3Power;
    historyPoint["total"] = socket1Power + socket2Power + socket3Power;
  }
  
  // Add empty predictions (they'll be calculated by the frontend)
  doc.createNestedArray("predictions");
  
  // Add empty alerts (they'll be managed by the frontend)
  doc.createNestedArray("alerts");
  
  // Add config
  JsonObject configObj = doc.createNestedObject("config");
  configObj["adminPassword"] = adminPassword;
  
  JsonArray allowedIPsArray = configObj.createNestedArray("allowedIPs");
  for (int i = 0; i < allowedIPsCount; i++) {
    allowedIPsArray.add(allowedIPs[i]);
  }
  
  configObj["highPowerThreshold"] = 1000;
  configObj["autoLoadBalance"] = true;
  configObj["predictionEnabled"] = true;
  configObj["mockDataEnabled"] = false;
  
  // Send response
  String response;
  serializeJson(doc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", response);
}

void handleRelayControl() {
  // Check IP for security
  if (!checkIPAllowed()) {
    return; // handleIPNotAllowed already set the response
  }
  
  // Check if system is isolated
  if (systemIsolated) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(403, "application/json", "{\"error\":\"System is currently isolated\"}");
    return;
  }
  
  // Check if communication is blocked
  if (communicationBlocked) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(403, "application/json", "{\"error\":\"Communication is blocked\"}");
    return;
  }
  
  // Parse JSON request
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Get parameters
  int socketId = doc["socketId"];
  bool status = doc["status"];
  
  // Validate socketId
  if (socketId < 1 || socketId > 4) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(400, "application/json", "{\"error\":\"Invalid socket ID\"}");
    return;
  }
  
  // Control relay
  controlRelay(socketId, status);
  
  // Send response
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", "{\"success\":true,\"id\":" + String(socketId) + ",\"status\":" + String(status ? "true" : "false") + "}");
}

void handleIsolationControl() {
  // Check IP for security
  if (!checkIPAllowed()) {
    return; // handleIPNotAllowed already set the response
  }
  
  // Parse JSON request
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Get parameters
  bool status = doc["status"];
  String password = doc["password"];
  
  // Validate password
  if (password != adminPassword) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(401, "application/json", "{\"error\":\"Invalid admin password\"}");
    return;
  }
  
  // Control isolation
  controlIsolation(status);
  
  // Update isolation reason
  isolationReason = status ? "Manual isolation" : "";
  
  // Send response
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", "{\"success\":true,\"status\":" + String(status ? "true" : "false") + "}");
}

void handleConfigUpdate() {
  // Check IP for security
  if (!checkIPAllowed()) {
    return; // handleIPNotAllowed already set the response
  }
  
  // Parse JSON request
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Update admin password if provided
  if (doc.containsKey("adminPassword")) {
    adminPassword = doc["adminPassword"].as<String>();
  }
  
  // Update allowed IPs if provided
  if (doc.containsKey("allowedIPs")) {
    JsonArray ips = doc["allowedIPs"].as<JsonArray>();
    
    allowedIPsCount = min((int)ips.size(), 10); // Maximum 10 IPs
    
    for (int i = 0; i < allowedIPsCount; i++) {
      allowedIPs[i] = ips[i].as<String>();
    }
  }
  
  // Prepare response with current config
  DynamicJsonDocument responseDoc(2048);
  
  responseDoc["adminPassword"] = adminPassword;
  
  JsonArray allowedIPsArray = responseDoc.createNestedArray("allowedIPs");
  for (int i = 0; i < allowedIPsCount; i++) {
    allowedIPsArray.add(allowedIPs[i]);
  }
  
  // Copy other config values from request or use defaults
  responseDoc["highPowerThreshold"] = doc.containsKey("highPowerThreshold") ? doc["highPowerThreshold"].as<int>() : 1000;
  responseDoc["autoLoadBalance"] = doc.containsKey("autoLoadBalance") ? doc["autoLoadBalance"].as<bool>() : true;
  responseDoc["predictionEnabled"] = doc.containsKey("predictionEnabled") ? doc["predictionEnabled"].as<bool>() : true;
  responseDoc["mockDataEnabled"] = doc.containsKey("mockDataEnabled") ? doc["mockDataEnabled"].as<bool>() : false;
  
  // Serialize and send response
  String response;
  serializeJson(responseDoc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", response);
}

void handleCommunicationReset() {
  // Check IP for security
  if (!checkIPAllowed()) {
    return; // handleIPNotAllowed already set the response
  }
  
  // Parse JSON request
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Get parameters
  String password = doc["password"];
  
  // Validate password
  if (password != adminPassword) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(401, "application/json", "{\"error\":\"Invalid admin password\"}");
    return;
  }
  
  // Reset communication
  communicationBlocked = false;
  abnormalDetected = false;
  
  // Send response
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Communication reset successfully\"}");
}

void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// Helper Functions
bool checkIPAllowed() {
  // Get client IP
  IPAddress clientIP = server.client().remoteIP();
  String clientIPStr = clientIP.toString();
  
  // Check for abnormal activity
  if (abnormalDetected) {
    // Block communication for safety
    communicationBlocked = true;
    
    // Send error response
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(403, "application/json", "{\"error\":\"System has detected abnormal activity and blocked communication\"}");
    return false;
  }
  
  // If no IPs configured or "0.0.0.0" in list, allow all
  if (allowedIPsCount == 0 || (allowedIPsCount == 1 && allowedIPs[0] == "0.0.0.0")) {
    return true;
  }
  
  // Check if client IP is in allowed list
  for (int i = 0; i < allowedIPsCount; i++) {
    if (clientIPStr == allowedIPs[i]) {
      return true;
    }
  }
  
  // IP not allowed, log abnormal activity
  abnormalDetected = true;
  isolationReason = "Unauthorized access attempt from " + clientIPStr;
  
  // Isolate system for security
  controlIsolation(true);
  
  // Block communication
  communicationBlocked = true;
  
  // Send error response
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(403, "application/json", "{\"error\":\"Unauthorized IP address. System isolated for security.\"}");
  
  return false;
}

String getISOTimestamp() {
  return getISOTimestamp(millis());
}

String getISOTimestamp(unsigned long milliseconds) {
  // This is a simplified version that assumes the device starts at the Unix epoch
  // In a real implementation, you'd use NTP to get the actual time
  unsigned long seconds = milliseconds / 1000;
  
  // Format: YYYY-MM-DDThh:mm:ss.sssZ
  // For simplicity, we'll just use a fixed date and calculate time from millis
  String timestamp = "2023-06-01T";
  
  // Calculate hours, minutes, seconds
  int hours = (seconds / 3600) % 24;
  int minutes = (seconds / 60) % 60;
  int secs = seconds % 60;
  int ms = milliseconds % 1000;
  
  // Format time
  if (hours < 10) timestamp += "0";
  timestamp += String(hours) + ":";
  
  if (minutes < 10) timestamp += "0";
  timestamp += String(minutes) + ":";
  
  if (secs < 10) timestamp += "0";
  timestamp += String(secs) + ".";
  
  if (ms < 100) timestamp += "0";
  if (ms < 10) timestamp += "0";
  timestamp += String(ms) + "Z";
  
  return timestamp;
}
