import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";
import { Product } from "../types";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Label, Modal } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  sku: "",
  description: "",
  price: 0,
  costPrice: 0,
  stockQuantity: 0,
  reorderThreshold: 5,
  category: "",
};

export const Inventory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description ?? "",
      price: p.price,
      costPrice: p.costPrice,
      stockQuantity: p.stockQuantity,
      reorderThreshold: p.reorderThreshold,
      category: p.category ?? "",
    });
    setShowModal(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await api.patch(`/products/${editing.id}`, form);
      else await api.post("/products", form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const adjustStock = async (id: string, delta: number) => {
    await api.patch(`/products/${id}/stock`, { delta });
    load();
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Track and restock retail products</p>
        </div>
        {isAdmin && <Button onClick={openCreate}>+ Add product</Button>}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : products.length === 0 ? (
          <EmptyState message="No products yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Stock</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2 text-slate-500">{p.sku}</td>
                    <td className="py-2 text-slate-500">${p.price.toFixed(2)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustStock(p.id, -1)}
                          className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          −
                        </button>
                        <span
                          className={p.stockQuantity <= p.reorderThreshold ? "font-semibold text-red-600" : "text-slate-700"}
                        >
                          {p.stockQuantity}
                        </span>
                        <button
                          onClick={() => adjustStock(p.id, 1)}
                          className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          +
                        </button>
                        {p.stockQuantity <= p.reorderThreshold && <Badge color="red">Low</Badge>}
                      </div>
                    </td>
                    <td className="py-2">
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="text-xs font-medium text-brand-600 hover:underline">
                            Edit
                          </button>
                          {p.active && (
                            <button onClick={() => deactivate(p.id)} className="text-xs font-medium text-red-600 hover:underline">
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit product" : "Add product"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>SKU</Label>
            <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                required
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Cost price ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stock quantity</Label>
              <Input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Reorder threshold</Label>
              <Input
                type="number"
                min={0}
                value={form.reorderThreshold}
                onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : editing ? "Save changes" : "Create product"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
