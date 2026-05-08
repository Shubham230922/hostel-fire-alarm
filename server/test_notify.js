require("dotenv").config();
const nodemailer = require("nodemailer");
const twilio = require("twilio");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const students = [
  { name: "Shubham Rathod", email: "rathodshubham2278@gmail.com", phone: "+917843059731" },
  { name: "Shubham Rathod", email: "shubhamrathod2278@gmail.com", phone: "+919373162862" },
];

const alertTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

async function run() {
  for (const s of students) {
    try {
      await transporter.sendMail({
        from: `"Hostel Safety & Security System" <${process.env.EMAIL_USER}>`,
        to: s.email,
        subject: "URGENT: Fire Alert Detected — Immediate Evacuation Required",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
            <div style="background:#b91c1c;padding:24px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:24px">🔥 FIRE ALERT — EVACUATE IMMEDIATELY</h1>
            </div>
            <div style="padding:24px;background:#fff">
              <p style="font-size:15px">Dear <b>${s.name}</b>,</p>
              <p style="font-size:15px">The automated fire monitoring system has detected a fire emergency in the hostel premises. You are requested to <b>evacuate the building immediately</b> and move to the nearest assembly point.</p>
              <table style="width:100%;border-collapse:collapse;margin:20px 0">
                <tr style="background:#fef2f2">
                  <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Temperature</td>
                  <td style="padding:10px;border:1px solid #fca5a5">52°C (Above Safe Limit)</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Flame Detected</td>
                  <td style="padding:10px;border:1px solid #fca5a5">Yes</td>
                </tr>
                <tr style="background:#fef2f2">
                  <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Gas Detected</td>
                  <td style="padding:10px;border:1px solid #fca5a5">Yes</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #fca5a5;font-weight:bold">Alert Time</td>
                  <td style="padding:10px;border:1px solid #fca5a5">${alertTime}</td>
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
      });
      console.log("✅ Email sent to", s.email);
    } catch (e) {
      console.error("❌ Email failed for", s.email, ":", e.message);
    }

    try {
      await twilioClient.messages.create({
        body: `FIRE ALERT - Hostel Safety System\nDear ${s.name}, fire has been detected in the hostel.\nTemp: 52C | Flame: YES | Gas: YES\nPlease evacuate immediately via emergency staircases.\nFire Helpline: 101\nTime: ${alertTime}`,
        from: process.env.TWILIO_PHONE,
        to: s.phone,
      });
      console.log("✅ SMS sent to", s.phone);
    } catch (e) {
      console.error("❌ SMS failed for", s.phone, ":", e.message);
    }
  }
}

run();
