const Issue = require("../models/Issue");
const Feedback = require("../models/Feedback");
const asyncHandler = require("../utils/asyncHandler");
const { emitTo } = require("../services/socketService");

exports.submitFeedback = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  if (String(issue.createdBy) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Only the person who reported the issue can rate it");
  }
  if (!["resolved", "closed"].includes(issue.status)) {
    res.status(400);
    throw new Error("You can rate an issue once it is resolved");
  }
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }
  const feedback = await Feedback.findOneAndUpdate(
    { issue: issue._id },
    { user: req.user._id, rating, comment: req.body.comment || "" },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  emitTo([`issue:${issue._id}`, "role:admin"], "feedback:new", { issue: issue._id, feedback });
  res.status(201).json({ success: true, feedback });
});
