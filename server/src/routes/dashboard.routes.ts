import { Router } from "express";
import { getSummary } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/summary", requireAuth, getSummary);

export default router;
