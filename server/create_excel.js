/*
 * Run once to generate students.xlsx with sample data:
 *   node create_excel.js
 */
const XLSX = require("xlsx");
const path = require("path");

const students = [
  { name: "Shubham Rathod",      room: "101", email: "rathodshubham2278@gmail.com",   phone: "+917843059731" },
  { name: "Tushar Ambhore",      room: "102", email: "tusharambhore51@gmail.com",      phone: "+919518397222" },
  { name: "Krishna Chudavekar",  room: "103", email: "krishnadc2005@gmail.com",        phone: "+91XXXXXXXXXX" },
  { name: "Sudarshan Phade",     room: "104", email: "sudarshanphade0001@gmail.com",   phone: "+91XXXXXXXXXX" },
  { name: "Shivraj Wankhede",    room: "105", email: "wankhedeshivraj691@gmail.com",   phone: "+91XXXXXXXXXX" },
];

const ws = XLSX.utils.json_to_sheet(students);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Students");

// Column widths
ws["!cols"] = [
  { wch: 20 }, // name
  { wch: 8  }, // room
  { wch: 30 }, // email
  { wch: 18 }, // phone
];

const outPath = path.join(__dirname, "students.xlsx");
XLSX.writeFile(wb, outPath);
console.log("✅ students.xlsx created at:", outPath);
console.log("📝 Edit the file with real student data before running the server.");
