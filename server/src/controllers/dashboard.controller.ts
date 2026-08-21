import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [ordersToday, activeOrders, totalCustomers, orders, payments, statusCounts] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: { in: ["RECEIVED", "IN_PROGRESS", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } } }),
    prisma.customer.count(),
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { id: true, discount: true, taxRate: true, items: { select: { subtotal: true } } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const revenueThisMonth = payments._sum.amount ?? 0;

  const monthOrdersValue = orders.reduce((sum, o) => {
    const itemsTotal = o.items.reduce((s, i) => s + i.subtotal, 0);
    const afterDiscount = Math.max(0, itemsTotal - o.discount);
    return sum + afterDiscount + afterDiscount * o.taxRate;
  }, 0);

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { customer: true, items: { include: { service: true } }, payments: true },
  });

  const recentWithTotals = recentOrders.map((o) => {
    const itemsTotal = o.items.reduce((s, i) => s + i.subtotal, 0);
    const afterDiscount = Math.max(0, itemsTotal - o.discount);
    const total = Math.round((afterDiscount + afterDiscount * o.taxRate) * 100) / 100;
    return { ...o, total };
  });

  res.json({
    ordersToday,
    activeOrders,
    totalCustomers,
    revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    ordersValueThisMonth: Math.round(monthOrdersValue * 100) / 100,
    statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    recentOrders: recentWithTotals,
  });
});
