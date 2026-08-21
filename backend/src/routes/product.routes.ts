import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const products = await prisma.product.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(products);
  })
);

router.get(
  "/low-stock",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ where: { active: true } });
    res.json(products.filter((p) => p.stockQuantity <= p.reorderThreshold));
  })
);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  reorderThreshold: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  active: z.boolean().optional(),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new ApiError(409, "A product with this SKU already exists");
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product
      .update({ where: { id: req.params.id }, data })
      .catch(() => {
        throw new ApiError(404, "Product not found");
      });
    res.json(product);
  })
);

router.patch(
  "/:id/stock",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req, res) => {
    const { delta } = z.object({ delta: z.number().int() }).parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { stockQuantity: Math.max(0, product.stockQuantity + delta) },
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.product
      .update({ where: { id: req.params.id }, data: { active: false } })
      .catch(() => {
        throw new ApiError(404, "Product not found");
      });
    res.status(204).send();
  })
);

export default router;
