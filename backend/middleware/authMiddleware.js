const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not signed in");
  }
  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch (e) {
    res.status(401);
    throw new Error("Session expired, please sign in again");
  }
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error("Account no longer exists");
  }
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    return next(new Error("You do not have permission to do this"));
  }
  next();
};

module.exports = { protect, authorize };
