// Who may see / work on an issue
function canView(user, issue) {
  if (user.role === "admin") return true;
  const id = String(user._id);
  const ref = (v) => String((v && v._id) || v || "");
  if (user.role === "student") return ref(issue.createdBy) === id;
  if (user.role === "staff") {
    if (ref(issue.assignedTo) === id) return true;
    return !!user.department && ref(issue.department) === String(user.department);
  }
  return false;
}
module.exports = { canView };
