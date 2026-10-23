const mongoose = require("mongoose");
const { ROLES } = require("../config/settings");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: "student" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    rollNo: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
