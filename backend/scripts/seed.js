// Creates starter departments and demo accounts. Safe to run more than once.
require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");

dns.setDefaultResultOrder("ipv4first");

const DEPARTMENTS = [
  ["Maintenance", "Buildings, electricity, water, furniture"],
  ["IT Services", "WiFi, labs, portals"],
  ["Hostel Office", "Rooms, mess, hostel facilities"],
  ["Academic Office", "Classes, exams, timetable"],
  ["Security", "Safety and campus security"],
];

const USERS = [
  { name: "Campus Admin", email: "admin@campus.test", password: "Admin@123", role: "admin" },
  { name: "Maintenance Staff", email: "staff@campus.test", password: "Staff@123", role: "staff", dept: "Maintenance" },
  { name: "Demo Student", email: "student@campus.test", password: "Student@123", role: "student", rollNo: "CS2026-001" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const deps = {};
  for (const [name, description] of DEPARTMENTS) {
    deps[name] = await Department.findOneAndUpdate({ name }, { name, description }, { upsert: true, new: true });
  }
  for (const u of USERS) {
    if (await User.findOne({ email: u.email })) continue;
    await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      rollNo: u.rollNo,
      department: u.dept ? deps[u.dept]._id : undefined,
      password: await bcrypt.hash(u.password, 10),
    });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
  }
  console.log("Seed complete. Change these demo passwords before real use.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
