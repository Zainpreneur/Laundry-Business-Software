import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const sanitize = <T extends { passwordHash?: string }>(u: T) => {
  const { passwordHash, ...rest } = u;
  return rest;
};

// List users (admin only), optionally filtered by role
router.get(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: role ? { role: role as "ADMIN" | "BARBER" | "CLIENT" } : undefined,
      include: { barberProfile: true, clientProfile: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users.map(sanitize));
  })
);

// Get single user — admins can view anyone, others only themselves
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user!.role !== "ADMIN" && req.user!.userId !== req.params.id) {
      throw new ApiError(403, "Forbidden");
    }
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { barberProfile: { include: { workingHours: true } }, clientProfile: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(sanitize(user));
  })
);

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "BARBER"]),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
});

// Admin creates staff (admin/barber) accounts
router.post(
  "/staff",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createStaffSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        barberProfile:
          data.role === "BARBER"
            ? {
                create: {
                  bio: data.bio,
                  specialties: data.specialties,
                  commissionRate: data.commissionRate ?? 0.4,
                  workingHours: {
                    create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                      dayOfWeek,
                      startTime: "09:00",
                      endTime: "17:00",
                      isOff: dayOfWeek === 0,
                    })),
                  },
                },
              }
            : undefined,
      },
      include: { barberProfile: true },
    });
    res.status(201).json(sanitize(user));
  })
);

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  active: z.boolean().optional(),
  avatarUrl: z.string().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user!.role !== "ADMIN" && req.user!.userId !== req.params.id) {
      throw new ApiError(403, "Forbidden");
    }
    const data = updateUserSchema.parse(req.body);
    // Only admins may (de)activate accounts
    if (data.active !== undefined && req.user!.role !== "ADMIN") delete data.active;
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(sanitize(user));
  })
);

// List barbers (public-ish: any authenticated user, used for booking pickers)
router.get(
  "/barbers/all",
  asyncHandler(async (_req, res) => {
    const barbers = await prisma.barberProfile.findMany({
      where: { active: true },
      include: { user: true, workingHours: true },
    });
    res.json(
      barbers.map((b) => ({
        id: b.id,
        bio: b.bio,
        specialties: b.specialties,
        commissionRate: b.commissionRate,
        workingHours: b.workingHours,
        name: b.user.name,
        email: b.user.email,
        avatarUrl: b.user.avatarUrl,
      }))
    );
  })
);

export default router;
