import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as ordersApi from "../api/orders";
import { Order, OrderStatus } from "../types";
import { OrderStatusBadge, PaymentStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDateTime, titleCase } from "../lib/format";
import NewOrderModal from "../components/NewOrderModal";

const STATUSES: OrderStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOrders(await ordersApi.listOrders({ status, search }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">Track drop-offs through to delivery.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewOrder(true)}>
          + New Order
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search order #, customer name/phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                onClick={() => navigate(`/orders/${o.id}`)}
              >
                <td className="px-4 py-2.5 font-medium">
                  <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{o.customer.name}</td>
                <td className="px-4 py-2.5">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="px-4 py-2.5">
                  <PaymentStatusBadge status={o.paymentStatus} />
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(o.total)}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{formatCurrency(o.balanceDue)}</td>
                <td className="px-4 py-2.5 text-slate-500">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onCreated={(order) => {
            setShowNewOrder(false);
            navigate(`/orders/${order.id}`);
          }}
        />
      )}
    </div>
  );
}
