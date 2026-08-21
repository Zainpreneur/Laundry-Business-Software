import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as customersApi from "../api/customers";
import { Customer } from "../types";
import { OrderStatusBadge, PaymentStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    customersApi
      .getCustomer(id)
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!customer) return <p className="text-slate-500">Customer not found.</p>;

  return (
    <div className="space-y-4">
      <Link to="/customers" className="text-sm text-brand-600 hover:underline">
        ← Back to customers
      </Link>

      <div className="card p-5">
        <h1 className="text-xl font-semibold">{customer.name}</h1>
        <div className="mt-2 grid gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
          <p>📞 {customer.phone}</p>
          <p>✉️ {customer.email || "—"}</p>
          <p>🏠 {customer.address || "—"}</p>
          <p>🗓️ Customer since {formatDate(customer.createdAt)}</p>
        </div>
        {customer.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{customer.notes}</p>}
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Order History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 text-right font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {(customer.orders ?? []).map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">
                    <Link to={`/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-500">{formatDateTime(o.createdAt)}</td>
                  <td className="py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="py-2">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="py-2 text-right">
                    {o.items.reduce((s, i) => s + i.subtotal, 0) > 0
                      ? formatCurrency(o.items.reduce((s, i) => s + i.subtotal, 0))
                      : "—"}
                  </td>
                </tr>
              ))}
              {(customer.orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
