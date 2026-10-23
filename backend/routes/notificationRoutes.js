const router = require("express").Router();
const n = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", n.listMine);
router.patch("/read-all", n.markAllRead);
router.patch("/:id/read", n.markRead);

module.exports = router;
