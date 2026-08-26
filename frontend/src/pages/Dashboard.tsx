import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { DashboardSummary } from "../types";
import { Badge, Card, EmptyState, StatCard, statusColor } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (n: number) => `$${n.toFixed(2)}`;

export const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/dashboard/summary"), api.get("/dashboard/revenue-trend?days=14")])
      .then(([s, t]) => {
        setSummary(s.data);
        setTrend(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (!summary) return <EmptyState message="Unable to load dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">Here's what's happening at the shop today.</p>
        </div>
        <Link to="/pos" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          New checkout
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Appointments" value={summary.todayAppointmentCount} />
        <StatCard label="Today's Revenue" value={money(summary.todayRevenue)} sub={`${summary.todaySalesCount} sales`} />
        <StatCard label="This Month" value={money(summary.monthRevenue)} sub={`${summary.monthSalesCount} sales`} />
        <StatCard label="Total Clients" value={summary.totalClients} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Revenue — last 14 days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d3bff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6d3bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#6d3bff" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Low stock alerts</h2>
          {summary.lowStockProducts.length === 0 ? (
            <EmptyState message="All products well stocked" />
          ) : (
            <ul className="space-y-3">
              {summary.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{p.name}</span>
                  <Badge color="red">{p.stockQuantity} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Upcoming appointments</h2>
        {summary.upcomingAppointments.length === 0 ? (
          <EmptyState message="No upcoming appointments" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Barber</th>
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.upcomingAppointments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-700">{a.client?.name}</td>
                    <td className="py-2 text-slate-700">{a.barber?.user.name}</td>
                    <td className="py-2 text-slate-500">
                      {a.services?.map((s) => s.service.name).join(", ")}
                    </td>
                    <td className="py-2 text-slate-500">{new Date(a.startTime).toLocaleString()}</td>
                    <td className="py-2">
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
