import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as ordersApi from "../api/orders";
import { Order, OrderStatus, PaymentMethod } from "../types";
import { OrderStatusBadge, PaymentStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "../lib/format";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

const STATUS_FLOW: OrderStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE"];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [payError, setPayError] = useState("");
  const [payingSubmitting, setPayingSubmitting] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setOrder(await ordersApi.getOrder(id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setUpdatingStatus(true);
    setError("");
    try {
      const updated = await ordersApi.updateOrderStatus(order.id, status);
      setOrder(updated);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setPayError("");
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPayError("Enter a valid payment amount.");
      return;
    }
    setPayingSubmitting(true);
    try {
      const updated = await ordersApi.addPayment(order.id, amount, paymentMethod);
      setOrder(updated);
      setPaymentAmount("");
    } catch (err) {
      setPayError(apiErrorMessage(err));
    } finally {
      setPayingSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    if (!confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) return;
    try {
      await ordersApi.deleteOrder(order.id);
      navigate("/orders");
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!order) return <p className="text-slate-500">Order not found.</p>;

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = order.status === "CANCELLED" ? null : STATUS_FLOW[currentIndex + 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/orders" className="text-sm text-brand-600 hover:underline">
          ← Back to orders
        </Link>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => window.print()}>
            🖨️ Print Invoice
          </button>
          {canManage && (
            <button className="btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="card p-5" id="invoice">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Order {order.orderNumber}</h1>
            <p className="text-sm text-slate-500">Placed {formatDateTime(order.createdAt)} by {order.createdBy?.name ?? "—"}</p>
          </div>
          <div className="flex gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-100 py-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase text-slate-400">Customer</h2>
            <Link to={`/customers/${order.customer.id}`} className="font-medium text-brand-700 hover:underline print:text-slate-900 print:no-underline">
              {order.customer.name}
            </Link>
            <p className="text-sm text-slate-500">{order.customer.phone}</p>
            {order.customer.address && <p className="text-sm text-slate-500">{order.customer.address}</p>}
          </div>
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase text-slate-400">Dates</h2>
            <p className="text-sm text-slate-600">Pickup: {formatDate(order.pickupDate)}</p>
            <p className="text-sm text-slate-600">Delivery: {formatDate(order.deliveryDate)}</p>
          </div>
        </div>

        <div className="py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit Price</th>
                <th className="pb-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">{item.service.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-3 w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Items total</span>
              <span>{formatCurrency(order.items.reduce((s, i) => s + i.subtotal, 0))}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.taxRate > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax ({(order.taxRate * 100).toFixed(0)}%)</span>
                <span>+{formatCurrency((order.items.reduce((s, i) => s + i.subtotal, 0) - order.discount) * order.taxRate)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Paid</span>
              <span>{formatCurrency(order.total - order.balanceDue)}</span>
            </div>
            <div className="flex justify-between font-medium text-red-600">
              <span>Balance Due</span>
              <span>{formatCurrency(order.balanceDue)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="border-t border-slate-100 pt-3">
            <h2 className="mb-1 text-xs font-semibold uppercase text-slate-400">Notes</h2>
            <p className="text-sm text-slate-600">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s, i) => (
              <button
                key={s}
                className={`btn text-xs ${
                  s === order.status
                    ? "bg-brand-600 text-white"
                    : i < currentIndex
                    ? "bg-slate-100 text-slate-400"
                    : "btn-secondary"
                }`}
                disabled={updatingStatus || order.status === "CANCELLED"}
                onClick={() => handleStatusChange(s)}
              >
                {titleCase(s)}
              </button>
            ))}
            <button
              className="btn btn-danger text-xs"
              disabled={updatingStatus || order.status === "CANCELLED" || order.status === "COMPLETED"}
              onClick={() => handleStatusChange("CANCELLED")}
            >
              Cancel Order
            </button>
          </div>
          {nextStatus && (
            <button
              className="btn-primary mt-3 w-full"
              disabled={updatingStatus}
              onClick={() => handleStatusChange(nextStatus)}
            >
              Mark as {titleCase(nextStatus)} →
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Payments</h2>
          <div className="mb-3 space-y-1">
            {order.payments.length === 0 && <p className="text-sm text-slate-400">No payments recorded yet.</p>}
            {order.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {titleCase(p.method)} · {formatDateTime(p.createdAt)}
                </span>
                <span className="font-medium">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
          {order.balanceDue > 0 ? (
            <form onSubmit={handleAddPayment} className="flex gap-2">
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={`Up to ${order.balanceDue.toFixed(2)}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <select className="input max-w-[140px]" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {titleCase(m)}
                  </option>
                ))}
              </select>
              <button className="btn-primary shrink-0" disabled={payingSubmitting} type="submit">
                Add
              </button>
            </form>
          ) : (
            <p className="text-sm font-medium text-emerald-600">Fully paid ✓</p>
          )}
          {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
        </div>
      </div>
    </div>
  );
}
