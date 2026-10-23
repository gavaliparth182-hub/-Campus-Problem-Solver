const router = require("express").Router();
const d = require("../controllers/departmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", d.list);
router.post("/", authorize("admin"), d.create);
router.delete("/:id", authorize("admin"), d.remove);

module.exports = router;
