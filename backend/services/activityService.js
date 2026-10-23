const IssueActivity = require("../models/IssueActivity");

async function logActivity(issueId, actorId, action, detail = "") {
  return IssueActivity.create({ issue: issueId, actor: actorId, action, detail });
}

module.exports = { logActivity };
