import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { Barber, ClientUser, Product, Service } from "../types";
import { Button, Card, ErrorText, Label, Select } from "../components/ui";

interface CartLine {
  type: "SERVICE" | "PRODUCT";
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock?: number;
}

export const POS = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [tip, setTip] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "OTHER">("CARD");
  const [taxRate, setTaxRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ total: number } | null>(null);

  useEffect(() => {
    api.get("/services?active=true").then((res) => setServices(res.data));
    api.get("/products?active=true").then((res) => setProducts(res.data));
    api.get("/clients").then((res) => setClients(res.data));
    api.get("/users/barbers/all").then((res) => {
      setBarbers(res.data);
      if (res.data[0]) setBarberId(res.data[0].id);
    });
    api.get("/settings").then((res) => setTaxRate(res.data.taxRate));
  }, []);

  const addToCart = (line: Omit<CartLine, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.type === line.type && l.id === line.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { ...line, quantity: 1 }];
    });
  };

  const updateQty = (idx: number, quantity: number) => {
    setCart((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: Math.max(1, quantity) } : l)));
  };

  const removeLine = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount + tip;

  const checkout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/sales", {
        clientId: clientId || undefined,
        barberId: barberId || undefined,
        items: cart.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
        discountAmount: discount,
        tipAmount: tip,
        taxRate,
        paymentMethod,
      });
      setReceipt({ total: res.data.total });
      setCart([]);
      setDiscount(0);
      setTip(0);
      // refresh product stock levels
      api.get("/products?active=true").then((r) => setProducts(r.data));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Services</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addToCart({ type: "SERVICE", id: s.id, name: s.name, unitPrice: s.price })}
                  className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-brand-400 hover:bg-brand-50"
                >
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-slate-500">${s.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Products</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  disabled={p.stockQuantity <= 0}
                  onClick={() =>
                    addToCart({ type: "PRODUCT", id: p.id, name: p.name, unitPrice: p.price, maxStock: p.stockQuantity })
                  }
                  className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-slate-500">
                    ${p.price.toFixed(2)} · {p.stockQuantity} in stock
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col">
          <h2 className="mb-3 font-semibold text-slate-900">Cart</h2>
          <div>
            <Label>Client (optional)</Label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Walk-in</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-3">
            <Label>Barber</Label>
            <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Unassigned</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 flex-1 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400">Cart is empty</p>
            ) : (
              cart.map((l, idx) => (
                <div key={`${l.type}-${l.id}`} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-700">{l.name}</p>
                    <p className="text-xs text-slate-400">${l.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={l.maxStock}
                      value={l.quantity}
                      onChange={(e) => updateQty(idx, Number(e.target.value))}
                      className="w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-xs"
                    />
                    <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <Label>Discount ($)</Label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Tip ($)</Label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={tip}
                onChange={(e) => setTip(Number(e.target.value))}
                className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Payment method</Label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "OTHER")}
                className="w-28"
              >
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax ({(taxRate * 100).toFixed(1)}%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <ErrorText message={error} />
          {receipt && (
            <p className="mt-2 text-sm font-medium text-emerald-600">
              Sale complete — charged ${receipt.total.toFixed(2)}
            </p>
          )}

          <Button className="mt-4 w-full" onClick={checkout} disabled={cart.length === 0 || submitting}>
            {submitting ? "Processing..." : "Charge & complete sale"}
          </Button>
        </Card>
      </div>
    </div>
  );
};
