import { api } from "./client";
import { Role, User } from "../types";

export async function listUsers() {
  const { data } = await api.get<{ users: User[] }>("/users");
  return data.users;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<{ user: User }>("/users", input);
  return data.user;
}

export async function updateUser(id: string, input: Partial<{ name: string; role: Role; active: boolean }>) {
  const { data } = await api.put<{ user: User }>(`/users/${id}`, input);
  return data.user;
}
