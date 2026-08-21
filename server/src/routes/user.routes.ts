import { Router } from "express";
import { createUser, listUsers, updateUser } from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);

export default router;
