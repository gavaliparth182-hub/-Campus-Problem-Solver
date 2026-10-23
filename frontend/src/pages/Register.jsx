import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { errMsg } from "../api";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", rollNo: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted">Student accounts can report issues. Staff accounts are set up by an admin.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label>Full name<input required value={form.name} onChange={set("name")} /></label>
        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={set("email")} /></label>
        <label>Roll number (optional)<input value={form.rollNo} onChange={set("rollNo")} /></label>
        <label>
          Password
          <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <span className="hint">At least 6 characters</span>
        </label>
        <button className="btn" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="muted small">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
