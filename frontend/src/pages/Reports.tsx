import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#6d3bff", "#8862ff", "#a891ff", "#cabfff", "#4a17c9", "#33167f"];
const money = (n: number) => `$${n.toFixed(2)}`;

export const Reports = () => {
  const { user } = useAuth();
  const [trend, setTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [topServices, setTopServices] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [barberPerf, setBarberPerf] = useState<{ name: string; completedAppointments: number; revenue: number }[]>([]);

  useEffect(() => {
    api.get("/dashboard/revenue-trend?days=30").then((res) => setTrend(res.data));
    api.get("/dashboard/top-services").then((res) => setTopServices(res.data));
    if (user?.role === "ADMIN") {
      api.get("/dashboard/barber-performance").then((res) => setBarberPerf(res.data));
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500">Business performance over time</p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900">Revenue — last 30 days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Bar dataKey="revenue" fill="#6d3bff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Top services by revenue</h2>
          {topServices.length === 0 ? (
            <EmptyState message="No sales data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topServices} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topServices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {user?.role === "ADMIN" && (
          <Card>
            <h2 className="mb-4 font-semibold text-slate-900">Barber performance</h2>
            {barberPerf.length === 0 ? (
              <EmptyState message="No performance data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barberPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => (name === "revenue" ? money(v) : v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#6d3bff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completedAppointments" fill="#a891ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
