import { api } from "./client";
import { Customer } from "../types";

export async function listCustomers(search?: string) {
  const { data } = await api.get<{ customers: Customer[] }>("/customers", { params: { search } });
  return data.customers;
}

export async function getCustomer(id: string) {
  const { data } = await api.get<{ customer: Customer }>(`/customers/${id}`);
  return data.customer;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function createCustomer(input: CustomerInput) {
  const { data } = await api.post<{ customer: Customer }>("/customers", input);
  return data.customer;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const { data } = await api.put<{ customer: Customer }>(`/customers/${id}`, input);
  return data.customer;
}

export async function deleteCustomer(id: string) {
  await api.delete(`/customers/${id}`);
}
