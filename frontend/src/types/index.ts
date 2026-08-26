export type Role = "ADMIN" | "BARBER" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  category?: string | null;
  active: boolean;
}

export interface WorkingHour {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
}

export interface Barber {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  specialties?: string | null;
  commissionRate: number;
  avatarUrl?: string | null;
  workingHours?: WorkingHour[];
}

export interface AppointmentServiceItem {
  id: string;
  serviceId: string;
  priceSnapshot: number;
  service: Service;
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  totalPrice: number;
  client?: { id: string; name: string; email: string; phone?: string | null };
  barber?: { id: string; user: { id: string; name: string } };
  services?: AppointmentServiceItem[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  costPrice: number;
  stockQuantity: number;
  reorderThreshold: number;
  category?: string | null;
  active: boolean;
}

export interface SaleItem {
  id: string;
  type: "SERVICE" | "PRODUCT";
  productId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  clientId?: string | null;
  barberId?: string | null;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: "CASH" | "CARD" | "OTHER";
  status: "COMPLETED" | "REFUNDED";
  createdAt: string;
  items: SaleItem[];
  client?: { id: string; name: string; email: string } | null;
  barber?: { id: string; user: { id: string; name: string } } | null;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  clientProfile?: { notes?: string | null; loyaltyPoints: number; preferredBarber?: string | null } | null;
  appointmentsAsClient?: Appointment[];
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  openTime: string;
  closeTime: string;
  taxRate: number;
  currency: string;
  timezone: string;
}

export interface DashboardSummary {
  todayAppointmentCount: number;
  upcomingAppointments: Appointment[];
  todayRevenue: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthSalesCount: number;
  lowStockProducts: Product[];
  totalClients: number;
}
