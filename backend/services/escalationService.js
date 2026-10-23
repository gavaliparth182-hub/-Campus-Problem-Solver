const Issue = require("../models/Issue");
const User = require("../models/User");
const { logActivity } = require("./activityService");
const { notify } = require("./notificationService");
const { loadIssue, broadcastIssue } = require("./issueService");

const ORDER = ["low", "medium", "high", "critical"];

async function runEscalation() {
  const hours = Number(process.env.ESCALATION_HOURS) || 48;
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);

  const stale = await Issue.find({
    status: { $in: ["open", "in_progress"] },
    escalated: false,
    createdAt: { $lt: cutoff },
  });
  if (!stale.length) return;

  const admins = await User.find({ role: "admin" }).select("_id");
  for (const issue of stale) {
    issue.escalated = true;
    issue.escalatedAt = new Date();
    const next = Math.min(ORDER.indexOf(issue.priority) + 1, ORDER.length - 1);
    issue.priority = ORDER[next];
    await issue.save();

    await logActivity(issue._id, null, "escalated", `Not resolved within ${hours} hours`);
    await notify(
      [...admins.map((a) => a._id), issue.createdBy],
      { message: `Issue escalated: ${issue.title}`, issue: issue._id, type: "escalation" }
    );
    broadcastIssue("issue:updated", await loadIssue(issue._id));
  }
  console.log(`Escalated ${stale.length} issue(s)`);
}

function startEscalation() {
  const run = () => runEscalation().catch((e) => console.error("Escalation failed:", e.message));
  run();
  return setInterval(run, 10 * 60 * 1000);
}

module.exports = { startEscalation, runEscalation };
