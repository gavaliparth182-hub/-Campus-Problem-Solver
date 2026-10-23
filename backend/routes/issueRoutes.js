const router = require("express").Router();
const issues = require("../controllers/issueController");
const { addComment } = require("../controllers/commentController");
const { submitFeedback } = require("../controllers/feedbackController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(issues.listIssues).post(authorize("student"), issues.createIssue);
router
  .route("/:id")
  .get(issues.getIssue)
  .patch(authorize("admin", "staff"), issues.updateIssue)
  .delete(authorize("admin"), issues.deleteIssue);
router.post("/:id/comments", addComment);
router.post("/:id/feedback", authorize("student"), submitFeedback);

module.exports = router;
