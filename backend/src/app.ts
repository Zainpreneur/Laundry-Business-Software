import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import serviceRoutes from "./routes/service.routes";
import productRoutes from "./routes/product.routes";
import appointmentRoutes from "./routes/appointment.routes";
import clientRoutes from "./routes/client.routes";
import saleRoutes from "./routes/sale.routes";
import scheduleRoutes from "./routes/schedule.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import settingsRoutes from "./routes/settings.routes";
import reviewRoutes from "./routes/review.routes";
import { errorHandler } from "./middleware/error";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*",
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/schedule", scheduleRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/reviews", reviewRoutes);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
};
