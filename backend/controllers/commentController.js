const Issue = require("../models/Issue");
const Comment = require("../models/Comment");
const asyncHandler = require("../utils/asyncHandler");
const { canView } = require("../utils/access");
const { notify } = require("../services/notificationService");
const { emitTo } = require("../services/socketService");

exports.addComment = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  if (!canView(req.user, issue)) {
    res.status(403);
    throw new Error("You cannot comment on this issue");
  }
  const text = (req.body.text || "").trim();
  if (!text) {
    res.status(400);
    throw new Error("Comment cannot be empty");
  }

  const created = await Comment.create({ issue: issue._id, author: req.user._id, text });
  const comment = await created.populate("author", "name role");

  const others = [issue.createdBy, issue.assignedTo].filter(
    (id) => id && String(id) !== String(req.user._id)
  );
  await notify(others, {
    message: `${req.user.name} commented on "${issue.title}"`,
    issue: issue._id,
    type: "comment",
  });

  emitTo([`issue:${issue._id}`], "comment:new", comment);
  res.status(201).json({ success: true, comment });
});
