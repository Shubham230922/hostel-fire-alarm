/*
 * Hostel Fire Alarm System - ESP32 Firmware
 * Sensors: DHT11 (temp), MQ-2 (gas), Flame Sensor
 * Sends data to Firebase Realtime Database
 *
 * Libraries required (install via Arduino Library Manager):
 *   - Firebase ESP32 Client  by Mobizt
 *   - DHT sensor library     by Adafruit
 *   - Adafruit Unified Sensor by Adafruit
 */

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT.h>
#include <time.h>

// ─── WiFi & Firebase Config ───────────────────────────────────────────────────
#define WIFI_SSID       "vivo Y28s 5G"
#define WIFI_PASSWORD   "shubham2309"
#define FIREBASE_HOST   ""
#define FIREBASE_AUTH   ""

// ─── Pin Definitions ──────────────────────────────────────────────────────────
#define DHT_PIN         4       // DHT11 data pin
#define DHT_TYPE        DHT11
#define FLAME_PIN       14      // Flame sensor digital output (LOW = fire)
#define GAS_PIN         27      // MQ-2 digital output (LOW = gas detected)
#define GAS_ANALOG_PIN  34      // MQ-2 analog output (optional, read-only)
#define BUZZER_PIN      26      // Active buzzer

// ─── Thresholds ───────────────────────────────────────────────────────────────
#define TEMP_THRESHOLD  40.0    // °C — trigger alert above this
#define SEND_INTERVAL   3000    // ms between Firebase pushes

// ─── Objects ──────────────────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

// ─── State ────────────────────────────────────────────────────────────────────
bool lastAlertState  = false;
unsigned long lastSendTime = 0;

// ─── Get ISO 8601 Timestamp ───────────────────────────────────────────────────
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "1970-01-01T00:00:00Z";
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// ─── Buzzer Control ───────────────────────────────────────────────────────────
void setBuzzer(bool on) {
  digitalWrite(BUZZER_PIN, on ? HIGH : LOW);
}

// ─── WiFi Connection ──────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
    // Sync time via NTP (needed for timestamps)
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    delay(1500);
  } else {
    Serial.println("\nWiFi FAILED — running in offline mode");
  }
}

// ─── Firebase Initialization ─────────────────────────────────────────────────
void initFirebase() {
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  fbData.setResponseSize(1024);
  Serial.println("Firebase initialized");
}

// ─── Sensor Data Structure ────────────────────────────────────────────────────
struct SensorData {
  float temperature;
  float humidity;
  bool  flameDetected;
  bool  gasDetected;
  int   gasAnalog;
  bool  alertActive;
};

// ─── Read All Sensors ─────────────────────────────────────────────────────────
SensorData readSensors() {
  SensorData s;
  s.temperature   = dht.readTemperature();
  s.humidity      = dht.readHumidity();
  s.flameDetected = (digitalRead(FLAME_PIN) == LOW); // LOW = fire detected
  s.gasDetected   = (digitalRead(GAS_PIN)   == LOW); // LOW = gas detected
  s.gasAnalog     = analogRead(GAS_ANALOG_PIN);      // 0–4095

  // Sanitize NaN from DHT read failures
  if (isnan(s.temperature)) s.temperature = 0.0;
  if (isnan(s.humidity))    s.humidity    = 0.0;

  s.alertActive = s.flameDetected ||
                  s.gasDetected   ||
                  (s.temperature > TEMP_THRESHOLD);
  return s;
}

// ─── Push Sensor Data to Firebase ────────────────────────────────────────────
void pushToFirebase(const SensorData& s) {
  String ts     = getTimestamp();
  String status = s.alertActive ? "ALERT" : "SAFE";

  // Always update sensor readings
  Firebase.setFloat(fbData,  "/sensors/temperature", s.temperature);
  Firebase.setFloat(fbData,  "/sensors/humidity",    s.humidity);
  Firebase.setBool(fbData,   "/sensors/flame",       s.flameDetected);
  Firebase.setBool(fbData,   "/sensors/gas",         s.gasDetected);
  Firebase.setInt(fbData,    "/sensors/gasAnalog",   s.gasAnalog);
  Firebase.setString(fbData, "/sensors/timestamp",   ts);
  Firebase.setString(fbData, "/sensors/status",      status);

  // Only update /alert node on state change (prevents backend spam)
  if (s.alertActive != lastAlertState) {
    Firebase.setBool(fbData,   "/alert/active",    s.alertActive);
    Firebase.setString(fbData, "/alert/timestamp", ts);
    Firebase.setString(fbData, "/alert/reason",
      s.flameDetected ? "FLAME_DETECTED"   :
      s.gasDetected   ? "GAS_DETECTED"     : "HIGH_TEMPERATURE");

    lastAlertState = s.alertActive;
    Serial.println(s.alertActive ? ">>> ALERT TRIGGERED <<<" : ">>> ALERT CLEARED <<<");
  }

  Serial.printf("[%s] Temp:%.1f°C Hum:%.1f%% Flame:%d Gas:%d(%d) Status:%s\n",
    ts.c_str(), s.temperature, s.humidity,
    s.flameDetected, s.gasDetected, s.gasAnalog, status.c_str());
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  pinMode(FLAME_PIN,  INPUT);
  pinMode(GAS_PIN,    INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  setBuzzer(false);

  dht.begin();
  connectWiFi();
  initFirebase();

  // Startup confirmation beeps
  for (int i = 0; i < 3; i++) {
    setBuzzer(true);  delay(100);
    setBuzzer(false); delay(100);
  }

  Serial.println("System ready. Monitoring started.");
}

// ─── Main Loop ────────────────────────────────────────────────────────────────
void loop() {
  // Auto-reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost — reconnecting...");
    connectWiFi();
    return;
  }

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;

    SensorData s = readSensors();
    setBuzzer(s.alertActive);   // Buzzer ON during any alert condition
    pushToFirebase(s);
  }
}
