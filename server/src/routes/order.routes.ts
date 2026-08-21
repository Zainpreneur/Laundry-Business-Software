import { Router } from "express";
import {
  addPayment,
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from "../controllers/order.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.post("/:id/payments", addPayment);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), deleteOrder);

export default router;
