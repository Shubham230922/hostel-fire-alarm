# 🔥 Hostel Fire Alarm System — IoT Project

Real-time fire monitoring using **ESP32 + Firebase + Node.js + Web Dashboard**

---

## 📁 Project Structure

```
hostel_fire_monitoring/
├── esp32/
│   └── fire_alarm.ino          # ESP32 firmware (Arduino IDE)
├── server/
│   ├── server.js               # Node.js backend
│   ├── create_excel.js         # Script to generate students.xlsx
│   ├── students.xlsx           # Student contact data (generated)
│   ├── serviceAccountKey.json  # Firebase Admin SDK key (YOU ADD THIS)
│   ├── .env                    # Environment variables (YOU FILL THIS)
│   └── package.json
├── dashboard/
│   └── index.html              # Web dashboard (served by Node.js)
├── firebase.rules.json         # Firebase security rules
└── README.md
```

---

## ⚡ ESP32 Wiring

| Component       | ESP32 Pin |
|-----------------|-----------|
| DHT11 Data      | GPIO 4    |
| Flame Sensor DO | GPIO 14   |
| MQ-2 DO         | GPIO 27   |
| MQ-2 AO         | GPIO 34   |
| Buzzer (+)      | GPIO 26   |
| All GND         | GND       |
| All VCC         | 3.3V / 5V |

> **Note:** Flame sensor and MQ-2 output LOW when triggered.

---

## 🔥 Firebase Setup

### Step 1 — Create Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `hostel-fire-alarm`
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Realtime Database
1. Left sidebar → **Build** → **Realtime Database**
2. Click **Create Database** → choose region → **Start in test mode**
3. Copy the database URL: `https://your-project-id-default-rtdb.firebaseio.com`

### Step 3 — Apply Security Rules
1. In Realtime Database → **Rules** tab
2. Paste the contents of `firebase.rules.json`
3. Click **Publish**

### Step 4 — Get Database Secret (for ESP32)
1. Project Settings (gear icon) → **Service accounts**
2. Scroll down → **Database secrets** → **Show** → copy the secret
3. Paste into `esp32/fire_alarm.ino` as `FIREBASE_AUTH`

### Step 5 — Service Account Key (for Node.js)
1. Project Settings → **Service accounts** tab
2. Click **Generate new private key** → download JSON
3. Rename to `serviceAccountKey.json`
4. Place in `server/` folder

### Step 6 — Web App Config (for Dashboard)
1. Project Settings → **General** → scroll to **Your apps**
2. Click **</>** (Web) → register app → copy `firebaseConfig` object
3. Paste into `dashboard/index.html` replacing the placeholder config

---

## 🛠 Arduino IDE Setup (ESP32)

### Install Libraries (Tools → Manage Libraries)
- `Firebase ESP32 Client` by Mobizt
- `DHT sensor library` by Adafruit
- `Adafruit Unified Sensor` by Adafruit

### Board Setup
1. File → Preferences → Additional Board URLs:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Tools → Board Manager → search `esp32` → install **esp32 by Espressif**
3. Tools → Board → **ESP32 Dev Module**

### Flash
1. Open `esp32/fire_alarm.ino`
2. Fill in `WIFI_SSID`, `WIFI_PASSWORD`, `FIREBASE_HOST`, `FIREBASE_AUTH`
3. Select correct COM port → Upload

---

## 🚀 Backend Setup & Run

```bash
cd server

# 1. Install dependencies
npm install

# 2. Generate students Excel file
npm run setup-excel
# Then edit students.xlsx with real student names, emails, phones

# 3. Fill in .env file (see .env for instructions)
# Required: FIREBASE_DATABASE_URL, EMAIL_USER, EMAIL_PASS,
#           TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE

# 4. Place serviceAccountKey.json in server/ folder

# 5. Start server
npm start
```

Server runs at: `http://localhost:3000`
Dashboard at:   `http://localhost:3000` (served automatically)

---

## 📧 Gmail App Password Setup

1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Search for **App passwords** → Select app: Mail → Device: Other → name it `FireAlarm`
4. Copy the 16-character password → paste into `.env` as `EMAIL_PASS`

---

## 📱 Twilio SMS Setup

1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Get a free phone number
3. Copy **Account SID**, **Auth Token**, and **Phone Number**
4. Paste into `.env`
5. For trial accounts: verify recipient phone numbers in Twilio console

---

## 📊 Firebase Data Structure

```json
{
  "sensors": {
    "temperature": 28.5,
    "humidity": 65.0,
    "flame": false,
    "gas": false,
    "gasAnalog": 450,
    "timestamp": "2025-01-15T10:30:00Z",
    "status": "SAFE"
  },
  "alert": {
    "active": false,
    "timestamp": "2025-01-15T10:30:00Z",
    "reason": "FLAME_DETECTED"
  },
  "alertLog": {
    "-abc123": {
      "temperature": 45.2,
      "flame": true,
      "gas": false,
      "reason": "FLAME_DETECTED",
      "timestamp": "2025-01-15T10:30:00Z",
      "dispatchedAt": "2025-01-15T10:30:01Z",
      "studentsNotified": 5
    }
  }
}
```

---

## 🌐 API Endpoints

| Method | Endpoint          | Description              |
|--------|-------------------|--------------------------|
| GET    | `/api/sensors`    | Current sensor readings  |
| GET    | `/api/alerts`     | Last 20 alert log entries|
| GET    | `/api/students`   | Loaded student list      |
| POST   | `/api/test-alert` | Trigger a test alert     |

---

## 📋 students.xlsx Format

| name          | room | email              | phone         |
|---------------|------|--------------------|---------------|
| Rahul Sharma  | 101  | rahul@example.com  | +91XXXXXXXXXX |
| Priya Patel   | 102  | priya@example.com  | +91XXXXXXXXXX |

> Phone numbers must include country code (e.g., `+91` for India)

---

## 🔔 Alert Logic

| Condition              | Trigger |
|------------------------|---------|
| Flame sensor LOW       | ✅ Alert |
| MQ-2 gas sensor LOW    | ✅ Alert |
| Temperature > 40°C     | ✅ Alert |

- **Cooldown:** 5 minutes between repeated alerts (prevents spam)
- **State-based:** Alert only fires on state change (SAFE → ALERT)
- **All students** receive both Email + SMS simultaneously

---

## 🎯 Demo Checklist

- [ ] ESP32 flashed and connected to WiFi
- [ ] Firebase database receiving data (check console)
- [ ] Backend server running (`npm start`)
- [ ] Dashboard open at `http://localhost:3000`
- [ ] Test alert: `POST http://localhost:3000/api/test-alert`
- [ ] Trigger flame sensor → verify buzzer + dashboard alert + email/SMS
