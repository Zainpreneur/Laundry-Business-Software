import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../lib/api";
import { Barber, Service } from "../types";
import { Button, Card, ErrorText, Label, Select } from "../components/ui";

const todayISO = () => new Date().toISOString().slice(0, 10);

export const BookAppointment = () => {
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barberId, setBarberId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/users/barbers/all").then((res) => {
      setBarbers(res.data);
      if (res.data[0]) setBarberId(res.data[0].id);
    });
    api.get("/services?active=true").then((res) => setServices(res.data));
  }, []);

  useEffect(() => {
    if (!barberId || !date) return;
    setSelectedSlot("");
    const qs = new URLSearchParams({ barberId, date, serviceIds: selectedServiceIds.join(",") });
    api.get(`/appointments/availability?${qs.toString()}`).then((res) => setSlots(res.data));
  }, [barberId, date, selectedServiceIds]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const totalPrice = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [services, selectedServiceIds]
  );
  const totalMinutes = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.durationMinutes, 0),
    [services, selectedServiceIds]
  );

  const submit = async () => {
    if (!selectedSlot || selectedServiceIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/appointments", {
        barberId,
        serviceIds: selectedServiceIds,
        startTime: selectedSlot,
        notes: notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Book an appointment</h1>

      <Card>
        <Label>Choose a barber</Label>
        <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.specialties ? `— ${b.specialties}` : ""}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        <Label>Choose service(s)</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${
                selectedServiceIds.includes(s.id) ? "border-brand-500 bg-brand-50" : "border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedServiceIds.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                {s.name}
              </span>
              <span className="text-slate-500">${s.price.toFixed(2)}</span>
            </label>
          ))}
        </div>
        {selectedServiceIds.length > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Total: <span className="font-semibold text-slate-800">${totalPrice.toFixed(2)}</span> ·{" "}
            {totalMinutes} min
          </p>
        )}
      </Card>

      <Card>
        <Label>Choose a date</Label>
        <input
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <Label>
          <span className="mt-4 block">Available times</span>
        </Label>
        {selectedServiceIds.length === 0 ? (
          <p className="text-sm text-slate-400">Select a service to see available times.</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-400">No slots available this day — try another date.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  selectedSlot === slot
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-brand-300"
                }`}
              >
                {new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Label>Notes (optional)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </Card>

      <ErrorText message={error} />
      {success && <p className="text-sm font-medium text-emerald-600">Appointment booked! Redirecting...</p>}

      <Button
        className="w-full"
        onClick={submit}
        disabled={!selectedSlot || selectedServiceIds.length === 0 || submitting}
      >
        {submitting ? "Booking..." : "Confirm appointment"}
      </Button>
    </div>
  );
};
