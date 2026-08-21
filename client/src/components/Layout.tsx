import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/orders", label: "Orders", icon: "🧾" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/services", label: "Services & Pricing", icon: "🧺" },
  { to: "/staff", label: "Staff", icon: "🧑‍💼", adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-4 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl">🧺</span>
          <div>
            <p className="text-sm font-semibold leading-tight">LaundryBiz</p>
            <p className="text-xs text-slate-500 leading-tight">Business Manager</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-sm font-medium">{user?.name}</p>
          <p className="truncate px-2 text-xs text-slate-500">{user?.role}</p>
          <button onClick={logout} className="btn-secondary mt-2 w-full">
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧺</span>
            <span className="font-semibold">LaundryBiz</span>
          </div>
          <button onClick={logout} className="btn-secondary text-xs">
            Log out
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 sm:hidden">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-600"
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 bg-slate-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
