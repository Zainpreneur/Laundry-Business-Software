import { Router } from "express";
import { createService, deleteService, listServices, updateService } from "../controllers/service.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listServices);
router.post("/", requireRole("ADMIN", "MANAGER"), createService);
router.put("/:id", requireRole("ADMIN", "MANAGER"), updateService);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), deleteService);

export default router;
