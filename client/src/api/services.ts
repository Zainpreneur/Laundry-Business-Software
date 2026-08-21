import { api } from "./client";
import { Service, ServiceCategory, ServiceUnit } from "../types";

export async function listServices(includeInactive = false) {
  const { data } = await api.get<{ services: Service[] }>("/services", { params: { includeInactive } });
  return data.services;
}

export interface ServiceInput {
  name: string;
  category: ServiceCategory;
  unit: ServiceUnit;
  price: number;
  active?: boolean;
}

export async function createService(input: ServiceInput) {
  const { data } = await api.post<{ service: Service }>("/services", input);
  return data.service;
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const { data } = await api.put<{ service: Service }>(`/services/${id}`, input);
  return data.service;
}

export async function deleteService(id: string) {
  await api.delete(`/services/${id}`);
}
