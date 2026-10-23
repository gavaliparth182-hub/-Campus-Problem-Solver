const Department = require("../models/Department");
const User = require("../models/User");
const Issue = require("../models/Issue");
const asyncHandler = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json({ success: true, departments });
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body.name) {
    res.status(400);
    throw new Error("Department name is required");
  }
  const department = await Department.create({
    name: req.body.name,
    description: req.body.description,
  });
  res.status(201).json({ success: true, department });
});

exports.remove = asyncHandler(async (req, res) => {
  const inUse =
    (await User.exists({ department: req.params.id })) ||
    (await Issue.exists({ department: req.params.id }));
  if (inUse) {
    res.status(400);
    throw new Error("This department is used by users or issues and cannot be deleted");
  }
  await Department.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
