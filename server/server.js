/*
 * Hostel Fire Alarm System - Node.js Backend
 * Firebase Admin SDK + Nodemailer + Twilio + Excel student data
 */

require("dotenv").config();

const express        = require("express");
const admin          = require("firebase-admin");
const nodemailer     = require("nodemailer");
const twilio         = require("twilio");
const XLSX           = require("xlsx");
const path           = require("path");
const fs             = require("fs");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../dashboard")));

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://hostel-fire-alarms-default-rtdb.firebaseio.com",
});

const db = admin.database();

// ─── Nodemailer (Gmail) ───────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Twilio SMS ───────────────────────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─── Load Students from Excel ─────────────────────────────────────────────────
function loadStudents() {
  const filePath = path.join(__dirname, "students.xlsx");

  if (!fs.existsSync(filePath)) {
    console.warn("⚠ students.xlsx not found – no alerts will be sent");
    return [];
  }

  const workbook  = XLSX.readFile(filePath);
  const sheet     = workbook.Sheets[workbook.SheetNames[0]];
  const rows      = XLSX.utils.sheet_to_json(sheet);

  console.log(`✅ Loaded ${rows.length} students`);

  return rows;
}

const students = loadStudents();

// ─── Alert State (debounce) ───────────────────────────────────────────────────
let alertSent = false;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 5 * 60 * 1000;

// ─── Send Email ───────────────────────────────────────────────────────────────
async function sendEmail(student, sensorData) {
  try {
  const { temperature, flame, gas, timestamp, reason } = sensorData;

  const email = student.email || student.Email;
  const name  = student.name  || student.Name;

  const mailOptions = {
    from: `"Hostel Safety & Security System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "URGENT: Fire Alert Detected \u2014 Immediate Evacuation Required",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#b91c1c;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">\uD83D\uDD25 FIRE ALERT \u2014 EVACUATE IMMEDIATELY</h1>
        </div>
        <div style="padding:24px;background:#fff">
          <p style="font-size:15px">Dear <b>${name}</b>,</p>
          <p style="font-size:15px">The automated fire monitoring system has detected a fire emergency in the hostel premises. You are requested to <b>evacuate the building immediately</b> and move to the nearest assembly point.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#fef2f2">
              <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Temperature</td>
              <td style="padding:10px;border:1px solid #fca5a5">${temperature}\u00b0C (Above Safe Limit)</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Flame Detected</td>
              <td style="padding:10px;border:1px solid #fca5a5">${flame ? "Yes" : "No"}</td>
            </tr>
            <tr style="background:#fef2f2">
              <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Gas Detected</td>
              <td style="padding:10px;border:1px solid #fca5a5">${gas ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Reason</td>
              <td style="padding:10px;border:1px solid #fca5a5">${reason}</td>
            </tr>
            <tr style="background:#fef2f2">
              <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Alert Time</td>
              <td style="padding:10px;border:1px solid #fca5a5">${new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            </tr>
          </table>
          <div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:16px;border-radius:4px;margin-top:16px">
            <p style="margin:0;font-size:15px"><b>Do not use elevators. Use emergency staircases only.</b></p>
            <p style="margin:8px 0 0">Fire Emergency Helpline: <b>101</b> &nbsp;|&nbsp; Hostel Warden: <b>+91XXXXXXXXXX</b></p>
          </div>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280">
          This is an automated alert from the Hostel Fire Monitoring System. Do not reply to this email.
        </div>
      </div>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${email}`);
  } catch (err) {
    console.error(`❌ Email failed for ${email}:`, err.message);
  }
}

// ─── Send SMS ─────────────────────────────────────────────────────────────────
async function sendSMS(student, sensorData) {
  const { temperature, flame, gas, reason } = sensorData;

  const phone = student.phone || student.Phone;
  const name  = student.name  || student.Name;

  const alertTime = new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const body =
    `FIRE ALERT - Hostel Safety System\n` +
    `Dear ${name}, fire has been detected in the hostel premises.\n` +
    `Temp: ${temperature}\u00b0C | Flame: ${flame ? "YES" : "NO"} | Gas: ${gas ? "YES" : "NO"}\n` +
    `Please evacuate immediately via emergency staircases.\n` +
    `Fire Helpline: 101\n` +
    `Time: ${alertTime}`;

  try {
  await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });
  console.log(`📱 SMS sent to ${name}`);
  } catch (err) {
  console.error(`❌ SMS failed for ${name} (${phone}):`, err.message);
  }
}

// ─── Dispatch Alerts ──────────────────────────────────────────────────────────
async function dispatchAlerts(sensorData) {
  const now = Date.now();

  if (alertSent && now - lastAlertTime < ALERT_COOLDOWN) {
    console.log("⏳ Cooldown active – skipping duplicate alerts");
    return;
  }

  alertSent = true;
  lastAlertTime = now;

  console.log("🚨 FIRE DETECTED – Sending alerts...");

  await db.ref("/alertLog").push({
    ...sensorData,
    dispatchedAt: new Date().toISOString(),
  });

  await Promise.allSettled(
    students.flatMap((student) => [
      sendEmail(student, sensorData),
      sendSMS(student, sensorData),
    ])
  );

  console.log("✅ Alerts sent");
}

// ─── Firebase Listener (FIXED) ────────────────────────────────────────────────
function startFirebaseListener() {
  const alertRef = db.ref("/sensors/alert");

  alertRef.on("value", async (snapshot) => {
    const isAlert = snapshot.val();

    if (isAlert === true) {
      const sensorSnap = await db.ref("/sensors").once("value");
      const sensors = sensorSnap.val() || {};

      await dispatchAlerts({
        temperature: sensors.temperature || 0,
        humidity: sensors.humidity || 0,
        flame: sensors.flame || false,
        gas: sensors.gas || false,
        reason: "AUTO_DETECTED",
        timestamp: new Date().toISOString(),
      });
    } else {
      if (alertSent) {
        alertSent = false;
        console.log("✅ Alert cleared");
      }
    }
  });

  console.log("👂 Listening to /sensors/alert...");
}

// ─── API ──────────────────────────────────────────────────────────────────────
app.get("/api/sensors", async (req, res) => {
  const snap = await db.ref("/sensors").once("value");
  res.json(snap.val());
});

app.post("/api/test-alert", async (req, res) => {
  alertSent = false;

  await dispatchAlerts({
    temperature: 45,
    humidity: 60,
    flame: true,
    gas: false,
    reason: "MANUAL_TEST",
    timestamp: new Date().toISOString(),
  });

  res.json({ message: "Test alert sent" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startFirebaseListener();
});