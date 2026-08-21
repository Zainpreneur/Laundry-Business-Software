import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/dashboard";
import { DashboardSummary } from "../types";
import StatCard from "../components/StatCard";
import { OrderStatusBadge, PaymentStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDateTime } from "../lib/format";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading dashboard…</p>;
  if (!summary) return <p className="text-slate-500">Could not load dashboard data.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of today's laundry business.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders Today" value={summary.ordersToday} icon="📦" />
        <StatCard label="Active Orders" value={summary.activeOrders} icon="🔄" />
        <StatCard label="Customers" value={summary.totalCustomers} icon="👥" />
        <StatCard
          label="Revenue (This Month)"
          value={formatCurrency(summary.revenueThisMonth)}
          icon="💰"
          hint={`${formatCurrency(summary.ordersValueThisMonth)} in orders placed`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Orders by Status</h2>
          <div className="space-y-2">
            {summary.statusBreakdown.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
            {summary.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <OrderStatusBadge status={s.status} />
                <span className="font-medium text-slate-700">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Orders</h2>
            <Link to="/orders" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <Link to={`/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</p>
                    </td>
                    <td className="py-2">{o.customer.name}</td>
                    <td className="py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-2">
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(o.total)}</td>
                  </tr>
                ))}
                {summary.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No orders yet. Create your first order from the Orders page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
