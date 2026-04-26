#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ================= Configurations =================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase Credentials (Make sure to keep the /rest/v1/ at the end of the URL)
const String supabaseUrl = "https://YOUR_PROJECT_ID.supabase.co/rest/v1/";
const String supabaseKey = "YOUR_SUPABASE_ANON_KEY";

// ================= Hardware Pins =================
#define DHTPIN 4
#define DHTTYPE DHT22 // Change to DHT11 if you are using the blue sensor
DHT dht(DHTPIN, DHTTYPE);

const int GREEN_LED = 18;
const int RED_LED = 19;

// ================= Setup =================
void setup() {
  Serial.begin(115200);
  
  // Initialize Pins
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  
  // Start with a nominal "Safe" state for the presentation
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, LOW);

  // Initialize Sensor
  dht.begin();

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
}

// ================= Main Loop =================
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    
    // Step 1: Read Sensor & Send to Cloud
    float h = dht.readHumidity();
    if (!isnan(h)) {
      Serial.println("Humidity: " + String(h) + "%");
      postTelemetry(h);
    } else {
      Serial.println("Failed to read from DHT sensor!");
    }

    // Step 2: Check for AI Commands
    checkCommands();
    
  }
  // Poll every 3 seconds. Fast enough for a live demo, slow enough to avoid API rate limits.
  delay(3000); 
}

// ================= Helper Functions =================

void postTelemetry(float humidity) {
  HTTPClient http;
  http.begin(supabaseUrl + "sensor_telemetry");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + supabaseKey);
  
  // Create JSON payload
  String payload = "{\"humidity\": " + String(humidity) + "}";
  
  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    Serial.println("Telemetry POSTed successfully.");
  } else {
    Serial.print("Error sending telemetry: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void checkCommands() {
  HTTPClient http;
  // Fetch exactly 1 command that hasn't been executed yet
  http.begin(supabaseUrl + "device_commands?executed=eq.false&limit=1");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + supabaseKey);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse the JSON array
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error && doc.size() > 0) {
      int cmd = doc[0]["command_code"];
      int id = doc[0]["id"];
      
      Serial.println("Received Command Code: " + String(cmd));

      // Execute Physical Hardware Logic
      if (cmd == 1) { 
        // 1 = SAFE
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(RED_LED, LOW);
      } else if (cmd == 2) { 
        // 2 = WARNING
        digitalWrite(GREEN_LED, LOW);
        digitalWrite(RED_LED, HIGH);
      }
      
      // Tell Supabase we finished the task so it doesn't loop
      markExecuted(id); 
    }
  }
  http.end();
}

void markExecuted(int id) {
  HTTPClient http;
  // Point directly to the row ID we just processed
  http.begin(supabaseUrl + "device_commands?id=eq." + String(id));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + supabaseKey);
  
  // PATCH only updates the fields we send, leaving everything else intact
  String payload = "{\"executed\": true}";
  int httpResponseCode = http.PATCH(payload);
  
  if (httpResponseCode > 0) {
    Serial.println("Command marked as executed in database.");
  }
  http.end();
}
