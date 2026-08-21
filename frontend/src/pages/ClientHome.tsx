import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Appointment } from "../types";
import { Badge, Button, Card, EmptyState, statusColor } from "../components/ui";

export const ClientHome = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get("/appointments")
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    await api.patch(`/appointments/${id}/status`, { status: "CANCELLED" });
    load();
  };

  const upcoming = appointments.filter((a) => ["PENDING", "CONFIRMED"].includes(a.status));
  const past = appointments.filter((a) => !["PENDING", "CONFIRMED"].includes(a.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-500">Manage your upcoming visits</p>
        </div>
        <Link to="/book">
          <Button>Book an appointment</Button>
        </Link>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Upcoming</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : upcoming.length === 0 ? (
          <EmptyState message="No upcoming appointments — book one now!" />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-col justify-between gap-2 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {a.services?.map((s) => s.service.name).join(", ")}
                  </p>
                  <p className="text-sm text-slate-500">
                    with {a.barber?.user.name} · {new Date(a.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  <Button variant="danger" onClick={() => cancel(a.id)}>
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Past visits</h2>
        {past.length === 0 ? (
          <EmptyState message="No past visits yet" />
        ) : (
          <ul className="space-y-3">
            {past.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                <div>
                  <p className="font-medium text-slate-800">
                    {a.services?.map((s) => s.service.name).join(", ")}
                  </p>
                  <p className="text-sm text-slate-500">
                    with {a.barber?.user.name} · {new Date(a.startTime).toLocaleString()}
                  </p>
                </div>
                <Badge color={statusColor(a.status)}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
