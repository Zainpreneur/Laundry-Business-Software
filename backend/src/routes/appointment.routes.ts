import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// List appointments — clients see their own, barbers see theirs, admins see all.
// Supports optional ?from=&to=&status=&barberId= filters.
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const { from, to, status, barberId } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};

    if (req.user!.role === "CLIENT") {
      where.clientId = req.user!.userId;
    } else if (req.user!.role === "BARBER") {
      const profile = await prisma.barberProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!profile) throw new ApiError(404, "Barber profile not found");
      where.barberId = profile.id;
    } else if (barberId) {
      where.barberId = barberId;
    }

    if (status) where.status = status;
    if (from || to) {
      where.startTime = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
        services: { include: { service: true } },
      },
      orderBy: { startTime: "asc" },
    });
    res.json(appointments);
  })
);

const createAppointmentSchema = z.object({
  barberId: z.string(),
  serviceIds: z.array(z.string()).min(1),
  startTime: z.string(), // ISO date string
  notes: z.string().optional(),
  clientId: z.string().optional(), // admins/barbers may book on behalf of a client
});

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createAppointmentSchema.parse(req.body);
    const clientId =
      req.user!.role !== "CLIENT" && data.clientId ? data.clientId : req.user!.userId;

    const services = await prisma.service.findMany({
      where: { id: { in: data.serviceIds }, active: true },
    });
    if (services.length !== data.serviceIds.length) {
      throw new ApiError(400, "One or more services are invalid or inactive");
    }

    const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const startTime = new Date(data.startTime);
    if (Number.isNaN(startTime.getTime())) throw new ApiError(400, "Invalid startTime");
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    // Prevent double-booking: reject if an overlapping, non-cancelled appointment exists.
    const overlap = await prisma.appointment.findFirst({
      where: {
        barberId: data.barberId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    if (overlap) throw new ApiError(409, "This time slot is no longer available");

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        barberId: data.barberId,
        startTime,
        endTime,
        notes: data.notes,
        totalPrice,
        status: "CONFIRMED",
        services: {
          create: services.map((s) => ({ serviceId: s.id, priceSnapshot: s.price })),
        },
      },
      include: {
        services: { include: { service: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    res.status(201).json(appointment);
  })
);

// Returns available start-time slots for a barber/date/service combo.
router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const { barberId, date, serviceIds } = req.query as Record<string, string | undefined>;
    if (!barberId || !date) throw new ApiError(400, "barberId and date are required");

    const ids = serviceIds ? serviceIds.split(",") : [];
    const services = ids.length
      ? await prisma.service.findMany({ where: { id: { in: ids } } })
      : [];
    const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;

    const day = new Date(date);
    const dayOfWeek = day.getUTCDay();
    const workingHour = await prisma.workingHour.findUnique({
      where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
    });
    if (!workingHour || workingHour.isOff) return res.json([]);

    const [startH, startM] = workingHour.startTime.split(":").map(Number);
    const [endH, endM] = workingHour.endTime.split(":").map(Number);
    const dayStart = new Date(day);
    dayStart.setUTCHours(startH, startM, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setUTCHours(endH, endM, 0, 0);

    const existing = await prisma.appointment.findMany({
      where: {
        barberId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: { gte: dayStart, lt: dayEnd },
      },
    });
    const timeOff = await prisma.timeOff.findMany({
      where: { barberId, startDate: { lte: dayEnd }, endDate: { gte: dayStart } },
    });

    const slots: string[] = [];
    const slotStep = 15; // minutes
    for (
      let t = new Date(dayStart);
      t.getTime() + durationMinutes * 60_000 <= dayEnd.getTime();
      t = new Date(t.getTime() + slotStep * 60_000)
    ) {
      const slotEnd = new Date(t.getTime() + durationMinutes * 60_000);
      const conflictsAppt = existing.some(
        (a) => t < a.endTime && slotEnd > a.startTime
      );
      const conflictsOff = timeOff.some((o) => t < o.endDate && slotEnd > o.startDate);
      const inThePast = t.getTime() < Date.now();
      if (!conflictsAppt && !conflictsOff && !inThePast) slots.push(t.toISOString());
    }
    res.json(slots);
  })
);

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

router.patch(
  "/:id/status",
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    if (req.user!.role === "CLIENT" && appointment.clientId !== req.user!.userId) {
      throw new ApiError(403, "Forbidden");
    }
    if (req.user!.role === "BARBER") {
      const profile = await prisma.barberProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!profile || profile.id !== appointment.barberId) throw new ApiError(403, "Forbidden");
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
        services: { include: { service: true } },
        sale: true,
        review: true,
      },
    });
    if (!appointment) throw new ApiError(404, "Appointment not found");
    res.json(appointment);
  })
);

export default router;
