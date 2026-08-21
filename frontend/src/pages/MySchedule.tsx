import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { WorkingHour } from "../types";
import { Button, Card, Input, Label } from "../components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TimeOff {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export const MySchedule = () => {
  const [barberId, setBarberId] = useState<string | null>(null);
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [saving, setSaving] = useState(false);
  const [newOff, setNewOff] = useState({ startDate: "", endDate: "", reason: "" });

  useEffect(() => {
    api.get("/auth/me").then((res) => {
      const id = res.data.barberProfile?.id;
      setBarberId(id ?? null);
      if (id) {
        api.get(`/schedule/${id}/working-hours`).then((r) => setHours(r.data));
        api.get(`/schedule/${id}/time-off`).then((r) => setTimeOff(r.data));
      }
    });
  }, []);

  const save = async () => {
    if (!barberId) return;
    setSaving(true);
    try {
      const res = await api.put(`/schedule/${barberId}/working-hours`, hours);
      setHours(res.data);
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async (e: FormEvent) => {
    e.preventDefault();
    if (!barberId || !newOff.startDate || !newOff.endDate) return;
    const res = await api.post(`/schedule/${barberId}/time-off`, newOff);
    setTimeOff([...timeOff, res.data]);
    setNewOff({ startDate: "", endDate: "", reason: "" });
  };

  const removeTimeOff = async (id: string) => {
    await api.delete(`/schedule/time-off/${id}`);
    setTimeOff(timeOff.filter((t) => t.id !== id));
  };

  if (!barberId) return <p className="text-slate-500">No barber profile found.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-sm text-slate-500">Set your weekly hours and time off</p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Weekly hours</h2>
        <div className="space-y-2">
          {DAYS.map((label, dayOfWeek) => {
            const h = hours.find((x) => x.dayOfWeek === dayOfWeek);
            return (
              <div key={dayOfWeek} className="flex items-center gap-2 text-sm">
                <span className="w-10 font-medium text-slate-600">{label}</span>
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={!(h?.isOff ?? dayOfWeek === 0)}
                    onChange={(e) => {
                      const next = hours.filter((x) => x.dayOfWeek !== dayOfWeek);
                      next.push({
                        id: h?.id ?? "",
                        barberId,
                        dayOfWeek,
                        startTime: h?.startTime ?? "09:00",
                        endTime: h?.endTime ?? "17:00",
                        isOff: !e.target.checked,
                      });
                      setHours(next);
                    }}
                  />
                  Working
                </label>
                <input
                  type="time"
                  disabled={h?.isOff ?? dayOfWeek === 0}
                  value={h?.startTime ?? "09:00"}
                  onChange={(e) => {
                    const next = hours.filter((x) => x.dayOfWeek !== dayOfWeek);
                    next.push({
                      id: h?.id ?? "",
                      barberId,
                      dayOfWeek,
                      startTime: e.target.value,
                      endTime: h?.endTime ?? "17:00",
                      isOff: h?.isOff ?? dayOfWeek === 0,
                    });
                    setHours(next);
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  disabled={h?.isOff ?? dayOfWeek === 0}
                  value={h?.endTime ?? "17:00"}
                  onChange={(e) => {
                    const next = hours.filter((x) => x.dayOfWeek !== dayOfWeek);
                    next.push({
                      id: h?.id ?? "",
                      barberId,
                      dayOfWeek,
                      startTime: h?.startTime ?? "09:00",
                      endTime: e.target.value,
                      isOff: h?.isOff ?? dayOfWeek === 0,
                    });
                    setHours(next);
                  }}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
            );
          })}
        </div>
        <Button className="mt-4" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save hours"}
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Time off</h2>
        <ul className="mb-4 space-y-2">
          {timeOff.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm">
              <span>
                {new Date(t.startDate).toLocaleDateString()} → {new Date(t.endDate).toLocaleDateString()}
                {t.reason && <span className="text-slate-400"> ({t.reason})</span>}
              </span>
              <button onClick={() => removeTimeOff(t.id)} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addTimeOff} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div>
            <Label>Start</Label>
            <Input type="date" value={newOff.startDate} onChange={(e) => setNewOff({ ...newOff, startDate: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="date" value={newOff.endDate} onChange={(e) => setNewOff({ ...newOff, endDate: e.target.value })} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={newOff.reason} onChange={(e) => setNewOff({ ...newOff, reason: e.target.value })} />
          </div>
          <Button type="submit" className="self-end">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
};
