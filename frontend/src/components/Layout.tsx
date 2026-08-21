import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navByRole: Record<string, { to: string; label: string; icon: string }[]> = {
  ADMIN: [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/appointments", label: "Appointments", icon: "📅" },
    { to: "/pos", label: "Checkout", icon: "🧾" },
    { to: "/clients", label: "Clients", icon: "👥" },
    { to: "/barbers", label: "Barbers", icon: "💈" },
    { to: "/services", label: "Services", icon: "✂️" },
    { to: "/inventory", label: "Inventory", icon: "📦" },
    { to: "/reports", label: "Reports", icon: "📈" },
    { to: "/settings", label: "Settings", icon: "⚙️" },
  ],
  BARBER: [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/appointments", label: "Appointments", icon: "📅" },
    { to: "/pos", label: "Checkout", icon: "🧾" },
    { to: "/clients", label: "Clients", icon: "👥" },
    { to: "/inventory", label: "Inventory", icon: "📦" },
    { to: "/my-schedule", label: "My Schedule", icon: "🕐" },
  ],
  CLIENT: [
    { to: "/", label: "My Appointments", icon: "📅" },
    { to: "/book", label: "Book Now", icon: "✂️" },
  ],
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const items = navByRole[user?.role ?? "CLIENT"];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
          <span className="text-2xl">💈</span>
          <span className="text-lg font-bold text-slate-900">Sharp Edge</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-bold">💈 Sharp Edge</span>
          <button onClick={logout} className="text-sm text-slate-500">
            Log out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
