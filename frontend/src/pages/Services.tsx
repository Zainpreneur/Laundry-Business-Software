import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { Service } from "../types";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Label, Modal } from "../components/ui";

const emptyForm = { name: "", description: "", durationMinutes: 30, price: 0, category: "" };

export const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/services")
      .then((res) => setServices(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMinutes: s.durationMinutes,
      price: s.price,
      category: s.category ?? "",
    });
    setShowModal(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await api.patch(`/services/${editing.id}`, form);
      } else {
        await api.post("/services", form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this service?")) return;
    await api.delete(`/services/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-sm text-slate-500">Manage the services your shop offers</p>
        </div>
        <Button onClick={openCreate}>+ Add service</Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : services.length === 0 ? (
          <EmptyState message="No services yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2 text-slate-500">{s.category ?? "—"}</td>
                    <td className="py-2 text-slate-500">{s.durationMinutes} min</td>
                    <td className="py-2 text-slate-500">${s.price.toFixed(2)}</td>
                    <td className="py-2">
                      <Badge color={s.active ? "green" : "slate"}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-xs font-medium text-brand-600 hover:underline">
                          Edit
                        </button>
                        {s.active && (
                          <button onClick={() => deactivate(s.id)} className="text-xs font-medium text-red-600 hover:underline">
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit service" : "Add service"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                required
                min={5}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                required
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : editing ? "Save changes" : "Create service"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
