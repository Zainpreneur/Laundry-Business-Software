import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import * as customersApi from "../api/customers";
import * as servicesApi from "../api/services";
import * as ordersApi from "../api/orders";
import { Customer, Order, Service } from "../types";
import { apiErrorMessage } from "../api/client";
import { formatCurrency, titleCase } from "../lib/format";

interface LineItem {
  serviceId: string;
  quantity: number;
}

export default function NewOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (order: Order) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ serviceId: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customersApi.listCustomers().then(setCustomers);
    servicesApi.listServices().then(setServices);
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { serviceId: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = useMemo(() => {
    const itemsTotal = items.reduce((sum, it) => {
      const service = services.find((s) => s.id === it.serviceId);
      return sum + (service ? service.price * (it.quantity || 0) : 0);
    }, 0);
    return Math.max(0, itemsTotal - (Number(discount) || 0));
  }, [items, services, discount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((it) => it.serviceId && it.quantity > 0);
    if (!customerId) return setError("Please select a customer.");
    if (validItems.length === 0) return setError("Add at least one service line item.");

    setSubmitting(true);
    try {
      const order = await ordersApi.createOrder({
        customerId,
        items: validItems,
        notes: notes || undefined,
        discount: Number(discount) || 0,
      });
      onCreated(order);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Order" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0">Items</label>
            <button type="button" className="text-sm text-brand-600 hover:underline" onClick={addItem}>
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => {
              const service = services.find((s) => s.id === item.serviceId);
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={item.serviceId}
                    onChange={(e) => updateItem(i, { serviceId: e.target.value })}
                  >
                    <option value="">Select a service…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)} / {titleCase(s.unit)})
                      </option>
                    ))}
                  </select>
                  <input
                    className="input w-24"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  />
                  <span className="w-20 shrink-0 text-right text-sm text-slate-500">
                    {service ? formatCurrency(service.price * (item.quantity || 0)) : "—"}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-slate-400 hover:text-red-600"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Discount (USD)</label>
            <input className="input" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="flex items-end justify-end">
            <p className="text-sm text-slate-500">
              Estimated total: <span className="text-base font-semibold text-slate-900">{formatCurrency(total)}</span>
            </p>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create Order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
