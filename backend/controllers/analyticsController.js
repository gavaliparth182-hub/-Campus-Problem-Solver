const Issue = require("../models/Issue");
const Feedback = require("../models/Feedback");
const asyncHandler = require("../utils/asyncHandler");

const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

exports.summary = asyncHandler(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const group = (field) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];

  const [total, escalated, byStatus, byCategory, byPriority, resolution, daily, rating] =
    await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ escalated: true, status: { $in: ["open", "in_progress"] } }),
      Issue.aggregate(group("status")),
      Issue.aggregate(group("category")),
      Issue.aggregate(group("priority")),
      Issue.aggregate([
        { $match: { resolvedAt: { $exists: true } } },
        { $group: { _id: null, hours: { $avg: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] } } } },
      ]),
      Issue.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]),
    ]);

  res.json({
    success: true,
    total,
    escalated,
    byStatus: toMap(byStatus),
    byCategory: toMap(byCategory),
    byPriority: toMap(byPriority),
    avgResolutionHours: resolution[0] ? Math.round(resolution[0].hours * 10) / 10 : null,
    lastSevenDays: daily.map((d) => ({ date: d._id, count: d.count })),
    avgRating: rating[0] ? Math.round(rating[0].avg * 10) / 10 : null,
    ratingCount: rating[0] ? rating[0].count : 0,
  });
});
