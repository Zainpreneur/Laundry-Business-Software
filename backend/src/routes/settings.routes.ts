import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/error";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) settings = await prisma.businessSettings.create({ data: {} });
    res.json(settings);
  })
);

const settingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

router.patch(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = settingsSchema.parse(req.body);
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) settings = await prisma.businessSettings.create({ data });
    else settings = await prisma.businessSettings.update({ where: { id: settings.id }, data });
    res.json(settings);
  })
);

export default router;
