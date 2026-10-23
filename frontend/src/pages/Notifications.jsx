import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api, { errMsg } from "../api";
import { useSocketEvent } from "../AuthContext.jsx";
import { timeAgo } from "../constants.js";

export default function Notifications() {
  const { setUnread } = useOutletContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/notifications")
      .then(({ data }) => {
        setItems(data.notifications);
        setUnread(data.unread);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [setUnread]);

  useSocketEvent("notification:new", (n) => setItems((list) => [n, ...list]));

  const markOne = async (n) => {
    if (n.read) return;
    setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    api.patch(`/notifications/${n._id}/read`).catch(() => {});
  };

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>Notifications</h1>
        {hasUnread && <button className="btn btn-quiet" onClick={markAll}>Mark all as read</button>}
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !items.length && !error && (
        <div className="empty"><h2>Nothing yet</h2><p>You will see updates on your issues here as they happen.</p></div>
      )}
      <ul className="notes">
        {items.map((n) => {
          const body = (
            <>
              <span>{n.message}</span>
              <time>{timeAgo(n.createdAt)}</time>
            </>
          );
          return (
            <li key={n._id} className={n.read ? "note" : "note unread"} onClick={() => markOne(n)}>
              {n.issue ? <Link to={`/issues/${n.issue}`}>{body}</Link> : <div className="note-plain">{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
