import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "BARBER"));

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

router.get(
  "/summary",
  asyncHandler(async (req: AuthRequest, res) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const barberFilter =
      req.user!.role === "BARBER"
        ? { barberId: (await prisma.barberProfile.findUnique({ where: { userId: req.user!.userId } }))?.id }
        : {};

    const [todayAppointments, upcomingAppointments, todaySales, monthSales, lowStock, totalClients] =
      await Promise.all([
        prisma.appointment.count({
          where: { ...barberFilter, startTime: { gte: todayStart }, status: { notIn: ["CANCELLED"] } },
        }),
        prisma.appointment.findMany({
          where: { ...barberFilter, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
          include: { client: { select: { name: true } }, barber: { include: { user: { select: { name: true } } } }, services: { include: { service: true } } },
          orderBy: { startTime: "asc" },
          take: 10,
        }),
        prisma.sale.aggregate({
          where: { createdAt: { gte: todayStart }, status: "COMPLETED" },
          _sum: { total: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: { createdAt: { gte: monthStart }, status: "COMPLETED" },
          _sum: { total: true },
          _count: true,
        }),
        prisma.product.findMany({ where: { active: true } }),
        prisma.user.count({ where: { role: "CLIENT" } }),
      ]);

    res.json({
      todayAppointmentCount: todayAppointments,
      upcomingAppointments,
      todayRevenue: todaySales._sum.total ?? 0,
      todaySalesCount: todaySales._count,
      monthRevenue: monthSales._sum.total ?? 0,
      monthSalesCount: monthSales._count,
      lowStockProducts: lowStock.filter((p) => p.stockQuantity <= p.reorderThreshold),
      totalClients,
    });
  })
);

// Revenue grouped by day for the last N days (default 14)
router.get(
  "/revenue-trend",
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days ?? 14);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: since }, status: "COMPLETED" },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + sale.total);
    }
    res.json(Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue })));
  })
);

router.get(
  "/top-services",
  asyncHandler(async (_req, res) => {
    const items = await prisma.saleItem.groupBy({
      by: ["name"],
      where: { type: "SERVICE" },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 10,
    });
    res.json(
      items.map((i) => ({ name: i.name, quantity: i._sum.quantity ?? 0, revenue: i._sum.lineTotal ?? 0 }))
    );
  })
);

router.get(
  "/barber-performance",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const barbers = await prisma.barberProfile.findMany({
      include: {
        user: { select: { name: true } },
        appointments: { where: { status: "COMPLETED" } },
        saleItems: { where: { status: "COMPLETED" } },
      },
    });
    res.json(
      barbers.map((b) => ({
        id: b.id,
        name: b.user.name,
        completedAppointments: b.appointments.length,
        revenue: b.saleItems.reduce((sum, s) => sum + s.total, 0),
      }))
    );
  })
);

export default router;
