import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import api from "../api";
import { useAuth, useSocketEvent } from "../AuthContext.jsx";
import { useToast } from "../ToastContext.jsx";
import { cap } from "../constants.js";

export default function Layout() {
  const { user, socket, logout } = useAuth();
  const { push } = useToast();
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    api.get("/notifications").then(({ data }) => setUnread(data.unread)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const on = () => setLive(true);
    const off = () => setLive(false);
    setLive(socket.connected);
    socket.on("connect", on);
    socket.on("disconnect", off);
    return () => {
      socket.off("connect", on);
      socket.off("disconnect", off);
    };
  }, [socket]);

  useSocketEvent("notification:new", (n) => {
    setUnread((c) => c + 1);
    push(n.message);
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✓</span>
          <span>Campus Problem Solver</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>{user.role === "student" ? "My issues" : user.role === "staff" ? "Assigned to me" : "All issues"}</NavLink>
          {user.role === "student" && <NavLink to="/issues/new">Report an issue</NavLink>}
          <NavLink to="/notifications">
            Notifications
            {unread > 0 && <span className="count">{unread > 99 ? "99+" : unread}</span>}
          </NavLink>
          {user.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="sidebar-foot">
          <div className={`live ${live ? "on" : ""}`}>
            <span className="dot" /> {live ? "Live updates on" : "Reconnecting…"}
          </div>
          <div className="who">
            <strong>{user.name}</strong>
            <span>{cap(user.role)}</span>
          </div>
          <button className="btn btn-quiet" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet context={{ setUnread }} />
      </main>
    </div>
  );
}
