import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";
import { useAuth, useSocketEvent } from "../AuthContext.jsx";
import { CATEGORIES, STATUSES, timeAgo } from "../constants.js";
import { EscalatedFlag, PriorityTag, StatusBadge } from "../components/Badges.jsx";

const TITLES = { student: "My issues", staff: "Assigned to me", admin: "All issues" };

export default function Issues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status) params.status = status;
      if (category) params.category = category;
      if (search.trim()) params.q = search.trim();
      const { data } = await api.get("/issues", { params });
      setIssues(data.issues);
      setTotal(data.total);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status, category, search]);

  // Reload when filters change (search is debounced)
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // Reload shortly after any live change
  const latest = useRef(load);
  latest.current = load;
  const timer = useRef();
  const refresh = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(), 250);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useSocketEvent("issue:created", refresh);
  useSocketEvent("issue:updated", refresh);
  useSocketEvent("issue:deleted", refresh);

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>{TITLES[user.role]}</h1>
          <p className="muted">{total} {total === 1 ? "issue" : "issues"}</p>
        </div>
        {user.role === "student" && <Link className="btn" to="/issues/new">Report an issue</Link>}
      </header>

      <div className="tabs" role="tablist" aria-label="Filter by status">
        <button role="tab" aria-selected={!status} className={!status ? "tab on" : "tab"} onClick={() => setStatus("")}>All</button>
        {STATUSES.map((s) => (
          <button key={s.value} role="tab" aria-selected={status === s.value}
            className={status === s.value ? "tab on" : "tab"} onClick={() => setStatus(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <input type="search" placeholder="Search by title" aria-label="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <p className="muted">Loading issues…</p>}

      {!loading && !error && issues.length === 0 && (
        <div className="empty">
          {user.role === "student" && !status && !category && !search ? (
            <>
              <h2>You have not reported anything yet</h2>
              <p>Spotted a broken light, a leaking tap or a WiFi dead zone? Tell us and track the fix here.</p>
              <Link className="btn" to="/issues/new">Report an issue</Link>
            </>
          ) : (
            <>
              <h2>No issues match</h2>
              <p>Try a different status, category or search.</p>
            </>
          )}
        </div>
      )}

      <ul className="issue-list">
        {issues.map((i) => (
          <li key={i._id} className={`issue-row stripe-${i.status}`}>
            <Link to={`/issues/${i._id}`}>
              <div className="issue-main">
                <h3>{i.title}</h3>
                <p className="meta">
                  <span>{i.category}</span>
                  {i.location && <span>{i.location}</span>}
                  {user.role !== "student" && <span>By {i.createdBy?.name}</span>}
                  {i.assignedTo && <span>Assigned to {i.assignedTo.name}</span>}
                  <span>{timeAgo(i.createdAt)}</span>
                </p>
              </div>
              <div className="issue-side">
                <StatusBadge status={i.status} />
                {i.escalated && ["open", "in_progress"].includes(i.status) && <EscalatedFlag />}
                <PriorityTag priority={i.priority} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
