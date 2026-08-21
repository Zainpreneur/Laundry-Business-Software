import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { ClientHome } from "./pages/ClientHome";
import { BookAppointment } from "./pages/BookAppointment";
import { Appointments } from "./pages/Appointments";
import { Barbers } from "./pages/Barbers";
import { Services } from "./pages/Services";
import { Clients } from "./pages/Clients";
import { POS } from "./pages/POS";
import { Inventory } from "./pages/Inventory";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { MySchedule } from "./pages/MySchedule";

const Home = () => {
  const { user } = useAuth();
  return user?.role === "CLIENT" ? <ClientHome /> : <Dashboard />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<Home />} />
      <Route path="/book" element={<ProtectedRoute roles={["CLIENT"]}><BookAppointment /></ProtectedRoute>} />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute roles={["ADMIN", "BARBER"]}>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={["ADMIN", "BARBER"]}>
            <POS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute roles={["ADMIN", "BARBER"]}>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barbers"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Barbers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Services />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute roles={["ADMIN", "BARBER"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={["ADMIN", "BARBER"]}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-schedule"
        element={
          <ProtectedRoute roles={["BARBER"]}>
            <MySchedule />
          </ProtectedRoute>
        }
      />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
