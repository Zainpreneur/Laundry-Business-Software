import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { Appointment, AppointmentStatus, Barber, ClientUser, Service } from "../types";
import { Badge, Button, Card, EmptyState, ErrorText, Label, Modal, Select, statusColor } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    api
      .get(`/appointments${qs}`)
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    await api.patch(`/appointments/${id}/status`, { status });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Manage bookings across the shop</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button onClick={() => setShowNew(true)}>+ New appointment</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : appointments.length === 0 ? (
          <EmptyState message="No appointments found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Barber</th>
                  <th className="pb-2">Services</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-700">{a.client?.name}</td>
                    <td className="py-2 text-slate-700">{a.barber?.user.name}</td>
                    <td className="py-2 text-slate-500">{a.services?.map((s) => s.service.name).join(", ")}</td>
                    <td className="py-2 text-slate-500">{new Date(a.startTime).toLocaleString()}</td>
                    <td className="py-2 text-slate-500">${a.totalPrice.toFixed(2)}</td>
                    <td className="py-2">
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                          <>
                            {a.status === "PENDING" && (
                              <button
                                onClick={() => updateStatus(a.id, "CONFIRMED")}
                                className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(a.id, "COMPLETED")}
                              className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, "NO_SHOW")}
                              className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                            >
                              No-show
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, "CANCELLED")}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </>
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

      {user && (
        <NewAppointmentModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      )}
    </div>
  );
};

const NewAppointmentModal = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [barberId, setBarberId] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/users/barbers/all").then((res) => {
      setBarbers(res.data);
      if (res.data[0]) setBarberId(res.data[0].id);
    });
    api.get("/services?active=true").then((res) => setServices(res.data));
    api.get("/clients").then((res) => setClients(res.data));
  }, [open]);

  useEffect(() => {
    if (!barberId || !date) return;
    setSlot("");
    const qs = new URLSearchParams({ barberId, date, serviceIds: serviceIds.join(",") });
    api.get(`/appointments/availability?${qs.toString()}`).then((res) => setSlots(res.data));
  }, [barberId, date, serviceIds]);

  const toggleService = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const totalPrice = useMemo(
    () => services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [services, serviceIds]
  );

  const submit = async () => {
    if (!slot || serviceIds.length === 0 || !clientId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/appointments", { barberId, clientId, serviceIds, startTime: slot });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New appointment">
      <div className="space-y-4">
        <div>
          <Label>Client</Label>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Barber</Label>
          <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Services</Label>
          <div className="space-y-1">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                {s.name} — ${s.price.toFixed(2)}
              </label>
            ))}
          </div>
          {serviceIds.length > 0 && <p className="mt-1 text-xs text-slate-500">Total: ${totalPrice.toFixed(2)}</p>}
        </div>
        <div>
          <Label>Date</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label>Time slot</Label>
          {slots.length === 0 ? (
            <p className="text-sm text-slate-400">No slots available — pick another date/service.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    slot === s ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          )}
        </div>
        <ErrorText message={error} />
        <Button className="w-full" onClick={submit} disabled={submitting || !slot || !clientId || serviceIds.length === 0}>
          {submitting ? "Booking..." : "Book appointment"}
        </Button>
      </div>
    </Modal>
  );
};
