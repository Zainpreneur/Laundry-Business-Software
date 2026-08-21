import { FormEvent, useEffect, useState } from "react";
import * as servicesApi from "../api/services";
import { Service, ServiceCategory, ServiceUnit } from "../types";
import Modal from "../components/Modal";
import { apiErrorMessage } from "../api/client";
import { formatCurrency, titleCase } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const CATEGORIES: ServiceCategory[] = ["WASH_FOLD", "DRY_CLEAN", "IRONING", "ALTERATION", "BEDDING", "OTHER"];
const UNITS: ServiceUnit[] = ["PER_ITEM", "PER_KG", "PER_LOAD"];

const emptyForm = { name: "", category: "WASH_FOLD" as ServiceCategory, unit: "PER_ITEM" as ServiceUnit, price: "" };

export default function Services() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setServices(await servicesApi.listServices(true));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ name: s.name, category: s.category, unit: s.unit, price: String(s.price) });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const input = { name: form.name, category: form.category, unit: form.unit, price: Number(form.price) };
      if (editing) {
        await servicesApi.updateService(editing.id, input);
      } else {
        await servicesApi.createService(input);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(s: Service) {
    try {
      await servicesApi.updateService(s.id, { active: !s.active });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function handleDelete(s: Service) {
    if (!confirm(`Delete service "${s.name}"?`)) return;
    try {
      await servicesApi.deleteService(s.id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Services & Pricing</h1>
          <p className="text-sm text-slate-500">Catalog of services offered and their prices.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>
            + New Service
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {canManage && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{titleCase(s.category)}</td>
                <td className="px-4 py-2.5 text-slate-500">{titleCase(s.unit)}</td>
                <td className="px-4 py-2.5">{formatCurrency(s.price)}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <button className="text-slate-500 hover:text-brand-600" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                    <button className="ml-3 text-slate-500 hover:text-amber-600" onClick={() => handleToggleActive(s)}>
                      {s.active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="ml-3 text-slate-500 hover:text-red-600" onClick={() => handleDelete(s)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!loading && services.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? "Edit Service" : "New Service"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {titleCase(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  className="input"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value as ServiceUnit })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {titleCase(u)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
