const mongoose = require("mongoose");
const { CATEGORIES, PRIORITIES, STATUSES } = require("../config/settings");

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: "Other" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    status: { type: String, enum: STATUSES, default: "open" },
    location: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    escalated: { type: Boolean, default: false },
    escalatedAt: Date,
    resolvedAt: Date,
  },
  { timestamps: true }
);

issueSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);
