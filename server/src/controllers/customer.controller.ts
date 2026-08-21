import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  res.json({ customers });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { service: true } } },
      },
    },
  });
  if (!customer) throw new AppError("Customer not found", 404);
  res.json({ customer });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({
    data: { ...data, email: data.email || null },
  });
  res.status(201).json({ customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = customerSchema.partial().parse(req.body);
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email === "" ? null : data.email },
  });
  res.json({ customer });
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const ordersCount = await prisma.order.count({ where: { customerId: req.params.id } });
  if (ordersCount > 0) {
    throw new AppError("Cannot delete a customer with existing orders", 400);
  }
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
