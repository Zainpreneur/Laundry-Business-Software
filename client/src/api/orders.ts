import { api } from "./client";
import { Order, OrderStatus, PaymentMethod } from "../types";

export interface OrderFilters {
  status?: OrderStatus | "";
  search?: string;
  customerId?: string;
}

export async function listOrders(filters: OrderFilters = {}) {
  const { data } = await api.get<{ orders: Order[] }>("/orders", { params: filters });
  return data.orders;
}

export async function getOrder(id: string) {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export interface CreateOrderInput {
  customerId: string;
  items: { serviceId: string; quantity: number }[];
  notes?: string;
  discount?: number;
  taxRate?: number;
  pickupDate?: string;
  deliveryDate?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const { data } = await api.post<{ order: Order }>("/orders", input);
  return data.order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}/status`, { status });
  return data.order;
}

export async function addPayment(id: string, amount: number, method: PaymentMethod) {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/payments`, { amount, method });
  return data.order;
}

export async function deleteOrder(id: string) {
  await api.delete(`/orders/${id}`);
}
