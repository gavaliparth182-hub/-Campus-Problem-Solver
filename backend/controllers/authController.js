const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department,
  rollNo: u.rollNo,
});

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, rollNo } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }
  // Public sign-up always creates a student. Admins promote users later.
  const user = await User.create({
    name,
    email,
    rollNo,
    password: await bcrypt.hash(password, 10),
    role: "student",
  });
  res.status(201).json({ success: true, token: signToken(user._id), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error("Incorrect email or password");
  }
  res.json({ success: true, token: signToken(user._id), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});
