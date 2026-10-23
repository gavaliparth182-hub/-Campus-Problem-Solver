const router = require("express").Router();
const u = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect, authorize("admin"));
router.get("/", u.list);
router.get("/assignable", u.assignable);
router.patch("/:id", u.update);

module.exports = router;
