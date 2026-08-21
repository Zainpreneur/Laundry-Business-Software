import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const resolveBarberId = async (req: AuthRequest, barberIdParam: string) => {
  if (req.user!.role === "ADMIN") return barberIdParam;
  const profile = await prisma.barberProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile || profile.id !== barberIdParam) throw new ApiError(403, "Forbidden");
  return barberIdParam;
};

router.get(
  "/:barberId/working-hours",
  asyncHandler(async (req, res) => {
    const hours = await prisma.workingHour.findMany({
      where: { barberId: req.params.barberId },
      orderBy: { dayOfWeek: "asc" },
    });
    res.json(hours);
  })
);

const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isOff: z.boolean().optional(),
});

router.put(
  "/:barberId/working-hours",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req: AuthRequest, res) => {
    const barberId = await resolveBarberId(req, req.params.barberId);
    const hours = z.array(workingHourSchema).parse(req.body);

    const results = await Promise.all(
      hours.map((h) =>
        prisma.workingHour.upsert({
          where: { barberId_dayOfWeek: { barberId, dayOfWeek: h.dayOfWeek } },
          update: { startTime: h.startTime, endTime: h.endTime, isOff: h.isOff ?? false },
          create: { barberId, ...h },
        })
      )
    );
    res.json(results);
  })
);

router.get(
  "/:barberId/time-off",
  asyncHandler(async (req, res) => {
    const timeOff = await prisma.timeOff.findMany({
      where: { barberId: req.params.barberId },
      orderBy: { startDate: "asc" },
    });
    res.json(timeOff);
  })
);

const timeOffSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

router.post(
  "/:barberId/time-off",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req: AuthRequest, res) => {
    const barberId = await resolveBarberId(req, req.params.barberId);
    const data = timeOffSchema.parse(req.body);
    const timeOff = await prisma.timeOff.create({
      data: {
        barberId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
    res.status(201).json(timeOff);
  })
);

router.delete(
  "/time-off/:id",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req: AuthRequest, res) => {
    const timeOff = await prisma.timeOff.findUnique({ where: { id: req.params.id } });
    if (!timeOff) throw new ApiError(404, "Time off entry not found");
    await resolveBarberId(req, timeOff.barberId);
    await prisma.timeOff.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
