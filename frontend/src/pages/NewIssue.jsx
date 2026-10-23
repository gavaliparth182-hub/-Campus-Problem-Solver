import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errMsg } from "../api";
import { CATEGORIES, PRIORITIES, cap } from "../constants.js";

export default function NewIssue() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", category: "Infrastructure", priority: "medium", location: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/issues", form);
      navigate(`/issues/${data.issue._id}`);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <header className="page-head">
        <div>
          <h1>Report an issue</h1>
          <p className="muted">Be specific about what is wrong and where. Admins are notified straight away.</p>
        </div>
      </header>
      <form className="card form" onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        <label>
          What is the problem?
          <input required maxLength={120} placeholder="Example: Tap leaking in Block B washroom" value={form.title} onChange={set("title")} />
        </label>
        <label>
          Details
          <textarea required rows={5} maxLength={2000} placeholder="When did it start, how bad is it, who is affected?" value={form.description} onChange={set("description")} />
        </label>
        <label>
          Where is it?
          <input maxLength={120} placeholder="Building, floor or room" value={form.location} onChange={set("location")} />
        </label>
        <div className="row">
          <label>
            Category
            <select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            How urgent is it?
            <select value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </label>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Submitting…" : "Submit issue"}</button>
      </form>
    </div>
  );
}
