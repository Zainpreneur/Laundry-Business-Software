import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken, TokenPayload } from "../utils/jwt";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["CLIENT", "BARBER", "ADMIN"]).optional(),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    // Public registration only ever creates clients; staff accounts are provisioned by an admin.
    const role = "CLIENT";
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role,
        clientProfile: { create: {} },
      },
    });

    const token = signToken({ userId: user.id, role: user.role as TokenPayload["role"] });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.active) throw new ApiError(401, "Invalid email or password");

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    const token = signToken({ userId: user.id, role: user.role as TokenPayload["role"] });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { barberProfile: true, clientProfile: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  })
);

export default router;
