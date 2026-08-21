import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const services = await prisma.service.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(services);
  })
);

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  active: z.boolean().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service
      .update({ where: { id: req.params.id }, data })
      .catch(() => {
        throw new ApiError(404, "Service not found");
      });
    res.json(service);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.service
      .update({ where: { id: req.params.id }, data: { active: false } })
      .catch(() => {
        throw new ApiError(404, "Service not found");
      });
    res.status(204).send();
  })
);

export default router;
