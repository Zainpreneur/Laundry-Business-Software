import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  active: z.boolean().optional(),
});

const publicFields = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({ select: publicFields, orderBy: { createdAt: "asc" } });
  res.json({ users });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
    select: publicFields,
  });
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);
  if (req.params.id === req.user?.sub && data.active === false) {
    throw new AppError("You cannot deactivate your own account", 400);
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data, select: publicFields });
  res.json({ user });
});
