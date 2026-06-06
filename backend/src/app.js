import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import fundraiserRoutes from "./routes/fundraiser.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import adminRoutes  from "./routes/admin.routes.js";

const app = express();

// ── CORS — must be first, before Helmet ──────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed =
    env.nodeEnv !== "production" ||
    origin === env.frontendUrl;

  if (allowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  // Respond immediately to preflight
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "Routed backend API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/fundraisers", fundraiserRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin",  adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  // Keep payload concise while surfacing useful details in development.
  const details = env.nodeEnv === "development" ? error.message : undefined;
  res.status(500).json({ message: "Unexpected server error", details });
});

export default app;
