import express from "express";
import { z } from "zod";
import { DriverRoute } from "../models/DriverRoute.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// ── Public: get route by OTP (driver login flow) ──────
router.get("/routes/:otp", async (req, res) => {
  try {
    const route = await DriverRoute.findOne({ otp: req.params.otp.toUpperCase() })
      .populate("fundraiserId", "title")
      .lean({ virtuals: true });
    if (!route) return res.status(404).json({ message: "Invalid driver code" });

    // Mark as started if first access
    if (!route.startedAt) {
      await DriverRoute.findByIdAndUpdate(route._id, { startedAt: new Date() });
      route.startedAt = new Date();
    }

    res.json(route);
  } catch {
    res.status(500).json({ message: "Unable to fetch driver route" });
  }
});

// ── Public (OTP-gated): mark a stop as delivered ──────
router.patch("/routes/:otp/stops/:stopIndex/complete", async (req, res) => {
  try {
    const otp   = req.params.otp.toUpperCase();
    const idx   = Number(req.params.stopIndex);

    const route = await DriverRoute.findOne({ otp });
    if (!route) return res.status(404).json({ message: "Invalid driver code" });
    if (idx < 0 || idx >= route.stops.length) {
      return res.status(400).json({ message: "Stop index out of range" });
    }
    if (route.stops[idx].status === "delivered") {
      return res.status(409).json({ message: "Stop already delivered" });
    }

    route.stops[idx].status      = "delivered";
    route.stops[idx].deliveredAt = new Date();
    route.completedStops         = route.stops.filter(s => s.status === "delivered").length;

    // Mark route complete if all stops done
    if (route.completedStops === route.stops.length) {
      route.completedAt = new Date();
    }

    await route.save();

    const populated = await DriverRoute.findById(route._id).lean({ virtuals: true });
    res.json(populated);
  } catch {
    res.status(500).json({ message: "Unable to complete stop" });
  }
});

// ── Admin: create driver route ────────────────────────
const stopSchema = z.object({
  customerName:    z.string().min(2).trim(),
  deliveryAddress: z.string().min(5).trim(),
  bags:            z.number().int().min(1),
  comment:         z.string().optional(),
  orderId:         z.string().min(10).optional(),
});

const createSchema = z.object({
  fundraiserId: z.string().min(10),
  otp:          z.string().min(4).max(8).trim().toUpperCase(),
  driverName:   z.string().optional(),
  stops:        z.array(stopSchema).default([]),
});

router.post("/routes", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body  = createSchema.parse(req.body);
    const route = await DriverRoute.create(body);
    res.status(201).json(route);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid route payload", issues: error.issues });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "OTP already exists for this fundraiser" });
    }
    res.status(500).json({ message: "Unable to create driver route" });
  }
});

// ── Admin: list all routes for a fundraiser ───────────
router.get("/routes", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const filter = {};
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    const routes = await DriverRoute.find(filter)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    res.json(routes);
  } catch {
    res.status(500).json({ message: "Unable to list driver routes" });
  }
});

export default router;
