import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { BusinessSettings } from "../types";
import { Button, Card, ErrorText, Input, Label } from "../components/ui";

export const Settings = () => {
  const [form, setForm] = useState<Partial<BusinessSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/settings")
      .then((res) => setForm(res.data))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.patch("/settings", {
        ...form,
        taxRate: form.taxRate !== undefined ? Number(form.taxRate) : undefined,
      });
      setForm(res.data);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Business Settings</h1>
        <p className="text-sm text-slate-500">Configure your shop's details</p>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Business name</Label>
            <Input
              value={form.businessName ?? ""}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Opening time</Label>
              <Input type="time" value={form.openTime ?? "09:00"} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
            </div>
            <div>
              <Label>Closing time</Label>
              <Input type="time" value={form.closeTime ?? "19:00"} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tax rate (e.g. 0.08 = 8%)</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step="0.001"
                value={form.taxRate ?? 0}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency ?? "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>
          <ErrorText message={error} />
          {saved && <p className="text-sm font-medium text-emerald-600">Settings saved</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </Card>
    </div>
  );
};
