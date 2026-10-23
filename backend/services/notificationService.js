const Notification = require("../models/Notification");
const { emitTo } = require("./socketService");

// Saves a notification for each user and pushes it live over the socket
async function notify(userIds, { message, issue, type = "info" }) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (!unique.length) return;
  const docs = await Notification.insertMany(
    unique.map((user) => ({ user, message, issue, type }))
  );
  docs.forEach((d) => emitTo([`user:${d.user}`], "notification:new", d));
}

module.exports = { notify };
