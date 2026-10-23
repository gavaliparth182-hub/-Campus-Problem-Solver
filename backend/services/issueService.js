const Issue = require("../models/Issue");
const { emitTo } = require("./socketService");

const populateIssue = (query) =>
  query
    .populate("createdBy", "name email role")
    .populate("assignedTo", "name email role")
    .populate("department", "name");

async function loadIssue(id) {
  return populateIssue(Issue.findById(id));
}

// Push the latest version of an issue to everyone who should see it
function broadcastIssue(event, issue) {
  const rooms = [
    "role:admin",
    `user:${issue.createdBy._id || issue.createdBy}`,
    issue.assignedTo ? `user:${issue.assignedTo._id || issue.assignedTo}` : null,
    `issue:${issue._id}`,
  ];
  emitTo(rooms, event, issue);
}

module.exports = { populateIssue, loadIssue, broadcastIssue };
