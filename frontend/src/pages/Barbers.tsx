import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { Barber } from "../types";
import { Button, Card, ErrorText, Input, Label, Modal, Select } from "../components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Barbers = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Barber | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    bio: "",
    specialties: "",
    commissionRate: 0.4,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/users/barbers/all")
      .then((res) => setBarbers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/users/staff", { ...form, role: "BARBER" });
      setShowModal(false);
      setForm({ name: "", email: "", password: "", phone: "", bio: "", specialties: "", commissionRate: 0.4 });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Barbers</h1>
          <p className="text-sm text-slate-500">Manage your team</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add barber</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {b.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.email}</p>
                </div>
              </div>
              {b.specialties && <p className="mt-3 text-sm text-slate-500">{b.specialties}</p>}
              <p className="mt-2 text-xs text-slate-400">Commission: {(b.commissionRate * 100).toFixed(0)}%</p>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => setScheduleFor(b)}>
                View schedule
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add barber">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Specialties</Label>
            <Input
              placeholder="Fades, Beard trims"
              value={form.specialties}
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
            />
          </div>
          <div>
            <Label>Bio</Label>
            <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <Label>Commission rate ({(form.commissionRate * 100).toFixed(0)}%)</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create barber account"}
          </Button>
        </form>
      </Modal>

      {scheduleFor && <ScheduleModal barber={scheduleFor} onClose={() => setScheduleFor(null)} />}
    </div>
  );
};

const ScheduleModal = ({ barber, onClose }: { barber: Barber; onClose: () => void }) => {
  const [hours, setHours] = useState(
    DAYS.map((_, dayOfWeek) => {
      const existing = barber.workingHours?.find((h) => h.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "17:00",
        isOff: existing?.isOff ?? dayOfWeek === 0,
      };
    })
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/schedule/${barber.id}/working-hours`, hours);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${barber.name}'s schedule`}>
      <div className="space-y-2">
        {hours.map((h, i) => (
          <div key={h.dayOfWeek} className="flex items-center gap-2 text-sm">
            <span className="w-10 font-medium text-slate-600">{DAYS[h.dayOfWeek]}</span>
            <label className="flex items-center gap-1 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={!h.isOff}
                onChange={(e) => {
                  const copy = [...hours];
                  copy[i] = { ...h, isOff: !e.target.checked };
                  setHours(copy);
                }}
              />
              Working
            </label>
            <input
              type="time"
              disabled={h.isOff}
              value={h.startTime}
              onChange={(e) => {
                const copy = [...hours];
                copy[i] = { ...h, startTime: e.target.value };
                setHours(copy);
              }}
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              disabled={h.isOff}
              value={h.endTime}
              onChange={(e) => {
                const copy = [...hours];
                copy[i] = { ...h, endTime: e.target.value };
                setHours(copy);
              }}
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
            />
          </div>
        ))}
        <Button className="mt-4 w-full" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save schedule"}
        </Button>
      </div>
    </Modal>
  );
};
