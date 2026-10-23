const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Issue = require("../models/Issue");
const { canView } = require("../utils/access");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.join(`role:${socket.user.role}`);

    // Live view of one issue (comments, status changes)
    socket.on("issue:join", async (issueId) => {
      try {
        const issue = await Issue.findById(issueId);
        if (issue && canView(socket.user, issue)) socket.join(`issue:${issueId}`);
      } catch (e) {
        /* ignore bad ids */
      }
    });
    socket.on("issue:leave", (issueId) => socket.leave(`issue:${issueId}`));
  });

  return io;
}

// rooms: array of room names, e.g. ["role:admin", "user:123"]
function emitTo(rooms, event, payload) {
  if (!io) return;
  const list = [...new Set(rooms.filter(Boolean))];
  if (list.length) io.to(list).emit(event, payload);
}

module.exports = { initSocket, emitTo };
