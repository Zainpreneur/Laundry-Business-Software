export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
}

export type ServiceCategory = "WASH_FOLD" | "DRY_CLEAN" | "IRONING" | "ALTERATION" | "BEDDING" | "OTHER";
export type ServiceUnit = "PER_ITEM" | "PER_KG" | "PER_LOAD";

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  unit: ServiceUnit;
  price: number;
  active: boolean;
}

export type OrderStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "ONLINE";

export interface OrderItem {
  id: string;
  serviceId: string;
  service: Service;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  notes?: string | null;
  discount: number;
  taxRate: number;
  items: OrderItem[];
  payments: Payment[];
  total: number;
  balanceDue: number;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
}

export interface DashboardSummary {
  ordersToday: number;
  activeOrders: number;
  totalCustomers: number;
  revenueThisMonth: number;
  ordersValueThisMonth: number;
  statusBreakdown: { status: OrderStatus; count: number }[];
  recentOrders: Order[];
}
