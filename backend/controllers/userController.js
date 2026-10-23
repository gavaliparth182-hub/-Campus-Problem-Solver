const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { ROLES } = require("../config/settings");

exports.list = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).populate("department", "name");
  res.json({ success: true, users });
});

// People an issue can be assigned to
exports.assignable = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: ["staff", "admin"] } })
    .select("name role department")
    .populate("department", "name")
    .sort({ name: 1 });
  res.json({ success: true, users });
});

exports.update = asyncHandler(async (req, res) => {
  const { role, department } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (role) {
    if (!ROLES.includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }
    if (String(user._id) === String(req.user._id) && role !== "admin") {
      res.status(400);
      throw new Error("You cannot remove your own admin access");
    }
    user.role = role;
  }
  if (department !== undefined) user.department = department || undefined;
  await user.save();
  res.json({ success: true, user: await user.populate("department", "name") });
});
