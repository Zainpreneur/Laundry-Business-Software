import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ClientUser } from "../types";
import { Badge, Card, EmptyState, Input, Modal, statusColor } from "../components/ui";

export const Clients = () => {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClientUser | null>(null);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .get(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`)
        .then((res) => setClients(res.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const openDetail = async (id: string) => {
    const res = await api.get(`/clients/${id}`);
    setSelected(res.data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">Your customer relationship hub</p>
      </div>

      <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : clients.length === 0 ? (
          <EmptyState message="No clients found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Loyalty pts</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c.id)}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2 text-slate-500">{c.email}</td>
                    <td className="py-2 text-slate-500">{c.phone ?? "—"}</td>
                    <td className="py-2 text-slate-500">{c.clientProfile?.loyaltyPoints ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.name}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-500">Email: {selected.email}</p>
              <p className="text-slate-500">Phone: {selected.phone ?? "—"}</p>
              <p className="text-slate-500">Loyalty points: {selected.clientProfile?.loyaltyPoints ?? 0}</p>
              {selected.clientProfile?.notes && <p className="mt-2 text-slate-600">Notes: {selected.clientProfile.notes}</p>}
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-800">Appointment history</h4>
              {!selected.appointmentsAsClient || selected.appointmentsAsClient.length === 0 ? (
                <EmptyState message="No appointments yet" />
              ) : (
                <ul className="space-y-2">
                  {selected.appointmentsAsClient.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                      <span className="text-slate-600">
                        {a.services?.map((s) => s.service.name).join(", ")} with {a.barber?.user.name}
                        <br />
                        <span className="text-xs text-slate-400">{new Date(a.startTime).toLocaleString()}</span>
                      </span>
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
