import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/helpers";
import "./style.scss";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// mode: "login" | "register"      role: "user" | "admin"
export default function AuthForm({ mode, role }) {
  const isRegister = mode === "register";
  const isAdmin = role === "admin";

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  // already logged in -> go to your own home
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/home"} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    if (isRegister && (form.username.length < 3 || form.username.length > 20)) {
      return "Username must be 3-20 characters";
    }
    if (!emailRegex.test(form.email)) return "Enter a valid email";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (isRegister && form.password !== form.confirm) return "Passwords do not match";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return toast.error(problem);

    setLoading(true);
    try {
      const base = isAdmin ? "/api/auth/admin" : "/api/auth";
      const payload = isRegister
        ? { username: form.username, email: form.email, password: form.password }
        : { email: form.email, password: form.password };

      const { data } = await api.post(`${base}/${isRegister ? "register" : "login"}`, payload);
      login(data.token);
      toast.success(data.message);

      const back = location.state?.from?.pathname;
      navigate(isAdmin ? "/admin" : back || "/home", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const title = `${isAdmin ? "Admin " : ""}${isRegister ? "Register" : "Login"}`;

  return (
    <div className="auth-page">
      <form className="card-dark auth-card" onSubmit={onSubmit} noValidate>
        <h2 className="mb-1">{title}</h2>
        <p className="text-muted-2 mb-4">
          {isRegister ? "Create your IMovies account" : "Welcome back to IMovies"}
        </p>

        {isRegister && (
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input className="form-control" name="username" value={form.username} onChange={onChange} placeholder="rahul" />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input className="form-control" type="password" name="password" value={form.password} onChange={onChange} placeholder="At least 8 characters" />
        </div>

        {isRegister && (
          <div className="mb-3">
            <label className="form-label">Confirm password</label>
            <input className="form-control" type="password" name="confirm" value={form.confirm} onChange={onChange} />
          </div>
        )}

        <button className="btn btn-accent w-100 py-2" disabled={loading}>
          {loading ? "Please wait..." : title}
        </button>

        <div className="auth-links mt-3">
          {isRegister ? (
            <span>
              Already registered? <Link to={isAdmin ? "/admin/login" : "/login"}>Login</Link>
            </span>
          ) : (
            <span>
              New here? <Link to={isAdmin ? "/admin/register" : "/register"}>Register</Link>
            </span>
          )}
          <br />
          {isAdmin ? <Link to="/login">User login</Link> : <Link to="/admin/login">Admin login</Link>}
        </div>
      </form>
    </div>
  );
}