const express = require("express");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "Campus Problem Solver API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/issues", require("./routes/issueRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
