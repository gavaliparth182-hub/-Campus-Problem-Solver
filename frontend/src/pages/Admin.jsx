import { useCallback, useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api";
import { useAuth, useSocketEvent } from "../AuthContext.jsx";
import { useToast } from "../ToastContext.jsx";
import { PRIORITIES, ROLE_OPTIONS, cap, statusLabel } from "../constants.js";

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="bar-value">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/analytics").then(({ data }) => setS(data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const timer = useRef();
  const refresh = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 400);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useSocketEvent("issue:created", refresh);
  useSocketEvent("issue:updated", refresh);
  useSocketEvent("issue:deleted", refresh);
  useSocketEvent("feedback:new", refresh);

  if (error) return <div className="alert" role="alert">{error}</div>;
  if (!s) return <p className="muted">Loading figures…</p>;

  const open = s.byStatus.open || 0;
  const progress = s.byStatus.in_progress || 0;
  const done = (s.byStatus.resolved || 0) + (s.byStatus.closed || 0);

  return (
    <div className="stack">
      <div className="stats">
        <div className="stat"><b>{s.total}</b><span>Total issues</span></div>
        <div className="stat"><b>{open}</b><span>Waiting to be picked up</span></div>
        <div className="stat"><b>{progress}</b><span>Being worked on</span></div>
        <div className="stat"><b>{done}</b><span>Resolved or closed</span></div>
        <div className={s.escalated ? "stat stat-alert" : "stat"}><b>{s.escalated}</b><span>Escalated and still open</span></div>
        <div className="stat"><b>{s.avgResolutionHours ?? "–"}</b><span>Average hours to resolve</span></div>
        <div className="stat"><b>{s.avgRating ?? "–"}</b><span>Average rating ({s.ratingCount})</span></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>By category</h2>
          <Bars rows={Object.entries(s.byCategory).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
        </section>
        <section className="card">
          <h2>By priority</h2>
          <Bars rows={PRIORITIES.filter((p) => s.byPriority[p]).map((p) => ({ label: cap(p), value: s.byPriority[p] }))} />
          <h2 className="gap">By status</h2>
          <Bars rows={Object.entries(s.byStatus).map(([k, value]) => ({ label: statusLabel(k), value }))} />
        </section>
      </div>
      <section className="card">
        <h2>Reported in the last 7 days</h2>
        <Bars rows={s.lastSevenDays.map((d) => ({ label: d.date, value: d.count }))} />
      </section>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const load = useCallback(() => {
    api.get("/users").then(({ data }) => setUsers(data.users)).catch((e) => push(errMsg(e), "error"));
  }, [push]);
  useEffect(() => {
    load();
    api.get("/departments").then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, [load]);

  const change = async (u, changes) => {
    try {
      await api.patch(`/users/${u._id}`, changes);
      push(`Updated ${u.name}`);
      load();
    } catch (e) {
      push(errMsg(e), "error");
    }
  };

  return (
    <section className="card">
      <h2>People</h2>
      <p className="muted">Promote a student to staff so they can be assigned issues. Staff also see issues in their department.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select aria-label={`Role for ${u.name}`} value={u.role} disabled={u._id === me._id}
                    onChange={(e) => change(u, { role: e.target.value })}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{cap(r)}</option>)}
                  </select>
                </td>
                <td>
                  <select aria-label={`Department for ${u.name}`} value={u.department?._id || ""}
                    onChange={(e) => change(u, { department: e.target.value || null })}>
                    <option value="">None</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Departments() {
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(() => {
    api.get("/departments").then(({ data }) => setItems(data.departments)).catch((e) => push(errMsg(e), "error"));
  }, [push]);
  useEffect(load, [load]);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/departments", { name, description });
      setName("");
      setDescription("");
      load();
    } catch (err) {
      push(errMsg(err), "error");
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    try {
      await api.delete(`/departments/${d._id}`);
      load();
    } catch (err) {
      push(errMsg(err), "error");
    }
  };

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Departments</h2>
        {!items.length && <p className="muted">No departments yet. Add the first one.</p>}
        <ul className="plain">
          {items.map((d) => (
            <li key={d._id} className="split">
              <div><strong>{d.name}</strong><p className="muted small">{d.description}</p></div>
              <button className="btn btn-quiet" onClick={() => remove(d)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
      <form className="card form" onSubmit={add}>
        <h2>Add a department</h2>
        <label>Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>What it handles<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className="btn">Add department</button>
      </form>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", "Overview"], ["users", "People"], ["departments", "Departments"]];
  return (
    <div>
      <header className="page-head"><h1>Admin</h1></header>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "tab on" : "tab"} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <Users />}
      {tab === "departments" && <Departments />}
    </div>
  );
}
