require("dotenv").config();
const http = require("http");
const dns = require("dns");
const mongoose = require("mongoose");

dns.setDefaultResultOrder("ipv4first");

const app = require("./app");
const { initSocket } = require("./services/socketService");
const { startEscalation } = require("./services/escalationService");

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => console.log(`API and live updates running on port ${PORT}`));
    startEscalation();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
