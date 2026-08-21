import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("lb_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lb_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then((u) => {
        setUser(u);
        localStorage.setItem("lb_user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("lb_token");
        localStorage.removeItem("lb_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await authApi.login(email, password);
    localStorage.setItem("lb_token", token);
    localStorage.setItem("lb_user", JSON.stringify(user));
    setUser(user);
  }

  async function register(name: string, email: string, password: string) {
    const { token, user } = await authApi.register(name, email, password);
    localStorage.setItem("lb_token", token);
    localStorage.setItem("lb_user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("lb_token");
    localStorage.removeItem("lb_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
