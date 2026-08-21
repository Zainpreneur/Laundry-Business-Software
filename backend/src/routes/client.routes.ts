import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "BARBER"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const clients = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: { clientProfile: true },
      orderBy: { name: "asc" },
    });
    res.json(
      clients.map(({ passwordHash, ...c }) => c)
    );
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        clientProfile: true,
        appointmentsAsClient: {
          include: {
            services: { include: { service: true } },
            barber: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { startTime: "desc" },
        },
      },
    });
    if (!client || client.role !== "CLIENT") throw new ApiError(404, "Client not found");
    const { passwordHash, ...safe } = client;
    res.json(safe);
  })
);

const notesSchema = z.object({
  notes: z.string().optional(),
  loyaltyPoints: z.number().int().optional(),
  preferredBarber: z.string().optional(),
});

router.patch(
  "/:id/profile",
  asyncHandler(async (req, res) => {
    const data = notesSchema.parse(req.body);
    const profile = await prisma.clientProfile.upsert({
      where: { userId: req.params.id },
      update: data,
      create: { userId: req.params.id, ...data },
    });
    res.json(profile);
  })
);

export default router;
