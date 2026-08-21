import { FormEvent, useEffect, useState } from "react";
import * as usersApi from "../api/users";
import { Role, User } from "../types";
import Modal from "../components/Modal";
import { apiErrorMessage } from "../api/client";
import { formatDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF"];
const emptyForm = { name: "", email: "", password: "", role: "STAFF" as Role };

export default function Staff() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await usersApi.listUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await usersApi.createUser(form);
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(u: User, role: Role) {
    try {
      await usersApi.updateUser(u.id, { role });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function handleToggleActive(u: User) {
    try {
      await usersApi.updateUser(u.id, { active: !u.active });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Staff</h1>
          <p className="text-sm text-slate-500">Manage team accounts and permissions.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New Staff Account
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                <td className="px-4 py-2.5">
                  <select
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                    disabled={u.id === currentUser?.id}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${u.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    className="text-slate-500 hover:text-amber-600 disabled:opacity-40"
                    onClick={() => handleToggleActive(u)}
                    disabled={u.id === currentUser?.id}
                  >
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No staff accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Staff Account" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Temporary password</label>
              <input
                className="input"
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create Account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
