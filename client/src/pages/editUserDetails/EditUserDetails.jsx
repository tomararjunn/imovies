import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/helpers";

export default function EditUserDetails() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: user.username, currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    if (form.username.length < 3 || form.username.length > 20) {
      return toast.error("Username must be 3-20 characters");
    }
    if (form.newPassword) {
      if (form.newPassword.length < 8) return toast.error("New password must be at least 8 characters");
      if (form.newPassword !== form.confirm) return toast.error("New passwords do not match");
      if (!form.currentPassword) return toast.error("Enter your current password");
    }

    const body = { username: form.username };
    if (form.newPassword) {
      body.currentPassword = form.currentPassword;
      body.newPassword = form.newPassword;
    }

    setSaving(true);
    try {
      const { data } = await api.put("/api/auth/me", body);
      login(data.token); // new token carries the new username
      toast.success("Profile updated");
      navigate("/profile");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 520 }}>
      <h2 className="page-title">Edit details</h2>

      <form className="card-dark" onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Email (cannot be changed)</label>
          <input className="form-control" value={user.email} disabled />
        </div>

        <div className="mb-3">
          <label className="form-label">Username</label>
          <input className="form-control" name="username" value={form.username} onChange={onChange} />
        </div>

        <hr />
        <p className="text-muted-2 small">Fill these only if you want a new password.</p>

        <div className="mb-3">
          <label className="form-label">Current password</label>
          <input className="form-control" type="password" name="currentPassword" value={form.currentPassword} onChange={onChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">New password</label>
          <input className="form-control" type="password" name="newPassword" value={form.newPassword} onChange={onChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Confirm new password</label>
          <input className="form-control" type="password" name="confirm" value={form.confirm} onChange={onChange} />
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-accent" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button type="button" className="btn btn-outline-light" onClick={() => navigate("/profile")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}