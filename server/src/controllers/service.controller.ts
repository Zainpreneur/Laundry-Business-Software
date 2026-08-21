import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["WASH_FOLD", "DRY_CLEAN", "IRONING", "ALTERATION", "BEDDING", "OTHER"]),
  unit: z.enum(["PER_ITEM", "PER_KG", "PER_LOAD"]),
  price: z.number().positive(),
  active: z.boolean().optional(),
});

export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const services = await prisma.service.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
  });
  res.json({ services });
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const data = serviceSchema.parse(req.body);
  const service = await prisma.service.create({ data });
  res.status(201).json({ service });
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const data = serviceSchema.partial().parse(req.body);
  const service = await prisma.service.update({ where: { id: req.params.id }, data });
  res.json({ service });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const usedCount = await prisma.orderItem.count({ where: { serviceId: req.params.id } });
  if (usedCount > 0) {
    // Preserve history: soft-delete instead of hard-deleting a service used on past orders.
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    return res.json({ service, softDeleted: true });
  }
  await prisma.service.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
