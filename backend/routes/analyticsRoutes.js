const router = require("express").Router();
const { summary } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, authorize("admin"), summary);

module.exports = router;
