import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { generateOrderNumber } from "../utils/orderNumber";

const orderItemSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1, "An order needs at least one item"),
  pickupDate: z.string().datetime().optional().or(z.literal("")).optional(),
  deliveryDate: z.string().datetime().optional().or(z.literal("")).optional(),
  notes: z.string().optional(),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "IN_PROGRESS",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ]),
});

const orderInclude = {
  customer: true,
  createdBy: { select: { id: true, name: true } },
  items: { include: { service: true } },
  payments: { orderBy: { createdAt: "desc" as const } },
};

function computeTotals(items: { subtotal: number }[], discount: number, taxRate: number) {
  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const afterDiscount = Math.max(0, itemsTotal - discount);
  const tax = afterDiscount * taxRate;
  return { itemsTotal, total: Math.round((afterDiscount + tax) * 100) / 100 };
}

async function derivePaymentStatus(orderId: string, total: number) {
  const payments = await prisma.payment.findMany({ where: { orderId } });
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid <= 0) return { paid, status: "UNPAID" as const };
  if (paid >= total) return { paid, status: "PAID" as const };
  return { paid, status: "PARTIAL" as const };
}

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, customerId, search } = req.query as Record<string, string | undefined>;

  const orders = await prisma.order.findMany({
    where: {
      status: status ? (status as any) : undefined,
      customerId: customerId || undefined,
      OR: search
        ? [
            { orderNumber: { contains: search } },
            { customer: { name: { contains: search } } },
            { customer: { phone: { contains: search } } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  const withTotals = orders.map((o) => {
    const { total } = computeTotals(o.items, o.discount, o.taxRate);
    const paid = o.payments.reduce((sum, p) => sum + p.amount, 0);
    return { ...o, total, balanceDue: Math.max(0, Math.round((total - paid) * 100) / 100) };
  });

  res.json({ orders: withTotals });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!order) throw new AppError("Order not found", 404);
  const { total } = computeTotals(order.items, order.discount, order.taxRate);
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  res.json({ order: { ...order, total, balanceDue: Math.max(0, Math.round((total - paid) * 100) / 100) } });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = createOrderSchema.parse(req.body);

  const services = await prisma.service.findMany({
    where: { id: { in: data.items.map((i) => i.serviceId) } },
  });
  if (services.length !== new Set(data.items.map((i) => i.serviceId)).size) {
    throw new AppError("One or more selected services could not be found", 400);
  }
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new AppError("Customer not found", 404);

  const itemsData = data.items.map((i) => {
    const service = services.find((s) => s.id === i.serviceId)!;
    const subtotal = Math.round(service.price * i.quantity * 100) / 100;
    return { serviceId: service.id, quantity: i.quantity, unitPrice: service.price, subtotal };
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: data.customerId,
      notes: data.notes,
      discount: data.discount ?? 0,
      taxRate: data.taxRate ?? 0,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      createdById: req.user?.sub,
      items: { create: itemsData },
    },
    include: orderInclude,
  });

  const { total } = computeTotals(order.items, order.discount, order.taxRate);
  res.status(201).json({ order: { ...order, total, balanceDue: total } });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = updateStatusSchema.parse(req.body);
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: orderInclude,
  });
  res.json({ order });
});

export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  await prisma.order.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE"]).default("CASH"),
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const data = paymentSchema.parse(req.body);
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true, payments: true } });
  if (!order) throw new AppError("Order not found", 404);

  const { total } = computeTotals(order.items, order.discount, order.taxRate);
  const alreadyPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  if (alreadyPaid + data.amount > total + 0.01) {
    throw new AppError(
      `Payment of ${data.amount} exceeds the remaining balance of ${Math.max(0, total - alreadyPaid).toFixed(2)}`,
      400
    );
  }

  await prisma.payment.create({
    data: { orderId: order.id, amount: data.amount, method: data.method, recordedById: req.user?.sub },
  });

  const { status } = await derivePaymentStatus(order.id, total);
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: status },
    include: orderInclude,
  });

  res.status(201).json({ order: updated });
});
