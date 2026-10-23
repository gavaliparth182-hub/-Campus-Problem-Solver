import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api";
import { useAuth, useSocketEvent } from "../AuthContext.jsx";
import { useToast } from "../ToastContext.jsx";
import { PRIORITIES, STATUSES, cap, fmtDateTime } from "../constants.js";
import { EscalatedFlag, PriorityTag, StatusBadge } from "../components/Badges.jsx";

export default function IssueDetail() {
  const { id } = useParams();
  const { user, socket } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const isAdmin = user.role === "admin";
  const canManage = isAdmin || user.role === "staff";

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/issues/${id}`);
      setData(d);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get("/users/assignable").then(({ data: d }) => setPeople(d.users)).catch(() => {});
    api.get("/departments").then(({ data: d }) => setDepartments(d.departments)).catch(() => {});
  }, [isAdmin]);

  // Join the live room for this issue (and rejoin if the connection drops)
  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit("issue:join", id);
    join();
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
      socket.emit("issue:leave", id);
    };
  }, [socket, id]);

  useSocketEvent("issue:updated", (i) => {
    if (i._id === id) load();
  });
  useSocketEvent("issue:deleted", (i) => {
    if (i._id === id) navigate("/");
  });
  useSocketEvent("feedback:new", (p) => {
    if (p.issue === id) load();
  });
  useSocketEvent("comment:new", (c) => {
    if (c.issue !== id) return;
    setData((d) => (d && !d.comments.some((x) => x._id === c._id) ? { ...d, comments: [...d.comments, c] } : d));
  });

  const update = async (changes) => {
    try {
      await api.patch(`/issues/${id}`, changes);
      await load();
    } catch (e) {
      push(errMsg(e), "error");
    }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data: d } = await api.post(`/issues/${id}/comments`, { text });
      setText("");
      setData((cur) => (cur && !cur.comments.some((x) => x._id === d.comment._id) ? { ...cur, comments: [...cur.comments, d.comment] } : cur));
    } catch (err) {
      push(errMsg(err), "error");
    }
  };

  const sendFeedback = async (e) => {
    e.preventDefault();
    if (!rating) return push("Choose a rating from 1 to 5", "error");
    try {
      await api.post(`/issues/${id}/feedback`, { rating, comment: feedbackText });
      push("Thanks for your feedback");
      load();
    } catch (err) {
      push(errMsg(err), "error");
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this issue and all its comments? This cannot be undone.")) return;
    try {
      await api.delete(`/issues/${id}`);
      navigate("/");
    } catch (err) {
      push(errMsg(err), "error");
    }
  };

  if (error) return <div className="alert" role="alert">{error}</div>;
  if (!data) return <p className="muted">Loading issue…</p>;

  const { issue, comments, activity, feedback } = data;
  const isOwner = issue.createdBy?._id === user._id;
  const finished = ["resolved", "closed"].includes(issue.status);

  return (
    <div className="detail">
      <div className="detail-main">
        <header className="detail-head">
          <div className="badges">
            <StatusBadge status={issue.status} />
            {issue.escalated && !finished && <EscalatedFlag />}
            <PriorityTag priority={issue.priority} />
          </div>
          <h1>{issue.title}</h1>
          <p className="meta">
            <span>{issue.category}</span>
            {issue.location && <span>{issue.location}</span>}
            <span>Reported by {issue.createdBy?.name}</span>
            <span>{fmtDateTime(issue.createdAt)}</span>
          </p>
        </header>

        <section className="card">
          <p className="body-text">{issue.description}</p>
        </section>

        {isOwner && finished && (
          <section className="card">
            <h2>How did we do?</h2>
            {feedback ? (
              <p>You rated this {feedback.rating} out of 5{feedback.comment ? `: ${feedback.comment}` : "."}</p>
            ) : (
              <form className="form" onSubmit={sendFeedback}>
                <div className="stars" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} role="radio" aria-checked={rating === n}
                      className={n <= rating ? "star on" : "star"} onClick={() => setRating(n)} aria-label={`${n} out of 5`}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea rows={2} placeholder="Anything we should know? (optional)" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                <button className="btn">Send feedback</button>
              </form>
            )}
          </section>
        )}
        {isAdmin && feedback && (
          <section className="card">
            <h2>Student feedback</h2>
            <p>{feedback.user?.name} rated this {feedback.rating} out of 5{feedback.comment ? `: ${feedback.comment}` : "."}</p>
          </section>
        )}

        <section className="card">
          <h2>Comments</h2>
          {comments.length === 0 && <p className="muted">No comments yet.</p>}
          <ul className="comments">
            {comments.map((c) => (
              <li key={c._id}>
                <div className="comment-head">
                  <strong>{c.author?.name}</strong>
                  <span className="role-tag">{cap(c.author?.role)}</span>
                  <time>{fmtDateTime(c.createdAt)}</time>
                </div>
                <p>{c.text}</p>
              </li>
            ))}
          </ul>
          <form className="comment-form" onSubmit={sendComment}>
            <input aria-label="Add a comment" placeholder="Add a comment" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn" disabled={!text.trim()}>Post comment</button>
          </form>
        </section>
      </div>

      <aside className="detail-side">
        {canManage && (
          <section className="card">
            <h2>Manage</h2>
            <label>
              Status
              <select value={issue.status} onChange={(e) => update({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            {isAdmin && (
              <>
                <label>
                  Priority
                  <select value={issue.priority} onChange={(e) => update({ priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
                  </select>
                </label>
                <label>
                  Assigned to
                  <select value={issue.assignedTo?._id || ""} onChange={(e) => update({ assignedTo: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {people.map((p) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Department
                  <select value={issue.department?._id || ""} onChange={(e) => update({ department: e.target.value || null })}>
                    <option value="">None</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </label>
                <button className="btn btn-danger" onClick={remove}>Delete issue</button>
              </>
            )}
          </section>
        )}

        {!canManage && (
          <section className="card">
            <h2>Handling</h2>
            <dl className="facts">
              <dt>Assigned to</dt><dd>{issue.assignedTo?.name || "Not assigned yet"}</dd>
              <dt>Department</dt><dd>{issue.department?.name || "Not set yet"}</dd>
            </dl>
          </section>
        )}

        <section className="card">
          <h2>History</h2>
          <ol className="timeline">
            {activity.map((a) => (
              <li key={a._id}>
                <span>{a.detail || a.action}</span>
                <small>{a.actor?.name || "System"}, {fmtDateTime(a.createdAt)}</small>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
