import { api } from "./client";
import { User } from "../types";

export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
  return data;
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>("/auth/register", { name, email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>("/auth/me");
  return data.user;
}
