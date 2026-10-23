const Issue = require("../models/Issue");
const Comment = require("../models/Comment");
const Feedback = require("../models/Feedback");
const IssueActivity = require("../models/IssueActivity");
const User = require("../models/User");
const Department = require("../models/Department");
const asyncHandler = require("../utils/asyncHandler");
const { canView } = require("../utils/access");
const { PRIORITIES, STATUSES } = require("../config/settings");
const { logActivity } = require("../services/activityService");
const { notify } = require("../services/notificationService");
const { populateIssue, loadIssue, broadcastIssue } = require("../services/issueService");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.createIssue = asyncHandler(async (req, res) => {
  const { title, description, category, priority, location } = req.body;
  if (!title || !description) {
    res.status(400);
    throw new Error("Title and description are required");
  }
  const issue = await Issue.create({
    title,
    description,
    category,
    priority,
    location,
    createdBy: req.user._id,
  });
  await logActivity(issue._id, req.user._id, "created", "Issue reported");

  const admins = await User.find({ role: "admin" }).select("_id");
  await notify(admins.map((a) => a._id), {
    message: `New issue reported: ${issue.title}`,
    issue: issue._id,
    type: "new_issue",
  });

  const full = await loadIssue(issue._id);
  broadcastIssue("issue:created", full);
  res.status(201).json({ success: true, issue: full });
});

exports.listIssues = asyncHandler(async (req, res) => {
  const { status, category, priority, escalated, q } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const filter = {};

  if (req.user.role === "student") filter.createdBy = req.user._id;
  if (req.user.role === "staff") {
    filter.$or = [{ assignedTo: req.user._id }];
    if (req.user.department) filter.$or.push({ department: req.user.department });
  }
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (escalated === "true") filter.escalated = true;
  if (q) filter.title = { $regex: escapeRegex(q), $options: "i" };

  const [issues, total] = await Promise.all([
    populateIssue(Issue.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
    Issue.countDocuments(filter),
  ]);
  res.json({ success: true, issues, total, page });
});

exports.getIssue = asyncHandler(async (req, res) => {
  const issue = await loadIssue(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  if (!canView(req.user, issue)) {
    res.status(403);
    throw new Error("You cannot view this issue");
  }
  const [comments, activity, feedback] = await Promise.all([
    Comment.find({ issue: issue._id }).sort({ createdAt: 1 }).populate("author", "name role"),
    IssueActivity.find({ issue: issue._id }).sort({ createdAt: 1 }).populate("actor", "name role"),
    Feedback.findOne({ issue: issue._id }).populate("user", "name"),
  ]);
  res.json({ success: true, issue, comments, activity, feedback });
});

exports.updateIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  if (!canView(req.user, issue)) {
    res.status(403);
    throw new Error("You cannot update this issue");
  }

  const isAdmin = req.user.role === "admin";
  const { status, priority, assignedTo, department } = req.body;
  const changes = [];
  let newAssignee = null;
  let statusChanged = false;

  if (status && status !== issue.status) {
    if (!STATUSES.includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    changes.push(`status changed from ${issue.status} to ${status}`);
    issue.status = status;
    issue.resolvedAt = ["resolved", "closed"].includes(status) ? new Date() : undefined;
    statusChanged = true;
  }

  if (isAdmin) {
    if (priority && priority !== issue.priority) {
      if (!PRIORITIES.includes(priority)) {
        res.status(400);
        throw new Error("Invalid priority");
      }
      changes.push(`priority changed from ${issue.priority} to ${priority}`);
      issue.priority = priority;
    }
    if (assignedTo !== undefined && String(assignedTo || "") !== String(issue.assignedTo || "")) {
      if (assignedTo) {
        const person = await User.findById(assignedTo);
        if (!person || person.role === "student") {
          res.status(400);
          throw new Error("Issues can only be assigned to staff or admins");
        }
        newAssignee = person;
        changes.push(`assigned to ${person.name}`);
        issue.assignedTo = person._id;
        if (issue.status === "open") {
          issue.status = "in_progress";
          statusChanged = true;
          changes.push("status changed from open to in_progress");
        }
      } else {
        issue.assignedTo = undefined;
        changes.push("assignment removed");
      }
    }
    if (department !== undefined && String(department || "") !== String(issue.department || "")) {
      if (department) {
        const dep = await Department.findById(department);
        if (!dep) {
          res.status(400);
          throw new Error("Department not found");
        }
        changes.push(`department set to ${dep.name}`);
        issue.department = dep._id;
      } else {
        issue.department = undefined;
        changes.push("department removed");
      }
    }
  }

  if (!changes.length) {
    return res.json({ success: true, issue: await loadIssue(issue._id) });
  }

  await issue.save();
  for (const c of changes) await logActivity(issue._id, req.user._id, "updated", c);

  if (statusChanged && String(issue.createdBy) !== String(req.user._id)) {
    await notify([issue.createdBy], {
      message: `Your issue "${issue.title}" is now ${issue.status.replace("_", " ")}`,
      issue: issue._id,
      type: "status",
    });
  }
  if (newAssignee && String(newAssignee._id) !== String(req.user._id)) {
    await notify([newAssignee._id], {
      message: `You were assigned: ${issue.title}`,
      issue: issue._id,
      type: "assigned",
    });
  }

  const full = await loadIssue(issue._id);
  broadcastIssue("issue:updated", full);
  res.json({ success: true, issue: full });
});

exports.deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  await Promise.all([
    Comment.deleteMany({ issue: issue._id }),
    IssueActivity.deleteMany({ issue: issue._id }),
    Feedback.deleteMany({ issue: issue._id }),
    issue.deleteOne(),
  ]);
  broadcastIssue("issue:deleted", { _id: issue._id, createdBy: issue.createdBy, assignedTo: issue.assignedTo });
  res.json({ success: true });
});
