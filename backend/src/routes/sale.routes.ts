import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    const sales = await prisma.sale.findMany({
      where: {
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  })
);

const lineItemSchema = z.object({
  type: z.enum(["SERVICE", "PRODUCT"]),
  id: z.string(), // serviceId or productId
  quantity: z.number().int().positive().default(1),
});

const createSaleSchema = z.object({
  clientId: z.string().optional(),
  barberId: z.string().optional(),
  appointmentId: z.string().optional(),
  items: z.array(lineItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  tipAmount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(1).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "OTHER"]).default("CASH"),
});

// Checkout: create a POS sale, decrementing product stock and totaling the order.
router.post(
  "/",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createSaleSchema.parse(req.body);

    const lineItems: {
      type: "SERVICE" | "PRODUCT";
      productId?: string;
      name: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const item of data.items) {
      if (item.type === "SERVICE") {
        const service = await prisma.service.findUnique({ where: { id: item.id } });
        if (!service) throw new ApiError(400, `Service ${item.id} not found`);
        lineItems.push({
          type: "SERVICE",
          name: service.name,
          unitPrice: service.price,
          quantity: item.quantity,
          lineTotal: service.price * item.quantity,
        });
      } else {
        const product = await prisma.product.findUnique({ where: { id: item.id } });
        if (!product) throw new ApiError(400, `Product ${item.id} not found`);
        if (product.stockQuantity < item.quantity) {
          throw new ApiError(400, `Insufficient stock for ${product.name}`);
        }
        lineItems.push({
          type: "PRODUCT",
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        });
      }
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
    let taxRate = data.taxRate;
    if (taxRate === undefined) {
      const settings = await prisma.businessSettings.findFirst();
      taxRate = settings?.taxRate ?? 0;
    }
    const taxableAmount = Math.max(0, subtotal - data.discountAmount);
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount + data.tipAmount;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          clientId: data.clientId,
          barberId: data.barberId,
          appointmentId: data.appointmentId,
          subtotal,
          taxAmount,
          tipAmount: data.tipAmount,
          discountAmount: data.discountAmount,
          total,
          paymentMethod: data.paymentMethod,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      for (const item of lineItems) {
        if (item.type === "PRODUCT" && item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }
      return created;
    });

    res.status(201).json(sale);
  })
);

router.get(
  "/:id",
  requireRole("ADMIN", "BARBER"),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!sale) throw new ApiError(404, "Sale not found");
    res.json(sale);
  })
);

router.post(
  "/:id/refund",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!sale) throw new ApiError(404, "Sale not found");
    if (sale.status === "REFUNDED") throw new ApiError(400, "Sale already refunded");

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: sale.id }, data: { status: "REFUNDED" } });
      for (const item of sale.items) {
        if (item.type === "PRODUCT" && item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
    });
    res.json({ ok: true });
  })
);

export default router;
