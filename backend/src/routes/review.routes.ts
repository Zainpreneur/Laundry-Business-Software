import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/error";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/barber/:barberId",
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { barberId: req.params.barberId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  })
);

const reviewSchema = z.object({
  appointmentId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

router.post(
  "/",
  requireRole("CLIENT"),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = reviewSchema.parse(req.body);
    const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
    if (!appointment) throw new ApiError(404, "Appointment not found");
    if (appointment.clientId !== req.user!.userId) throw new ApiError(403, "Forbidden");
    if (appointment.status !== "COMPLETED") {
      throw new ApiError(400, "Can only review completed appointments");
    }

    const review = await prisma.review.create({
      data: {
        clientId: req.user!.userId,
        barberId: appointment.barberId,
        appointmentId: appointment.id,
        rating: data.rating,
        comment: data.comment,
      },
    });
    res.status(201).json(review);
  })
);

export default router;
