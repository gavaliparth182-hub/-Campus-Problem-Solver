const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    detail: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IssueActivity", activitySchema);
