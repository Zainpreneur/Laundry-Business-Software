import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: { id: string; name: string; email: string; role: string; active: boolean }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const userCount = await prisma.user.count();
  // The very first account created becomes an ADMIN so the system is usable out of the box.
  // Any account created after that via public self-registration is plain STAFF; admins can
  // promote users or create MANAGER/ADMIN accounts via the /api/users endpoints.
  const role = userCount === 0 ? "ADMIN" : "STAFF";

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role },
  });

  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  res.status(201).json({ token, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.active) throw new AppError("Invalid email or password", 401);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  res.json({ token, user: toPublicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) throw new AppError("User not found", 404);
  res.json({ user: toPublicUser(user) });
});
