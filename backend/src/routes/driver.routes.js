import express from "express";
import { z } from "zod";
import { DriverRoute } from "../models/DriverRoute.js";
import { Order } from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";
import { Fundraiser } from "../models/Fundraiser.js";
import { optimizeRoutes, capacityFallback, buildStopsFromOrders } from "../utils/routeOptimizer.js";
import { deleteDriverById } from "../services/fundraiserCleanup.js";

const router = express.Router();

// ── Generate a random 6-char OTP ──────────────────────
function genOTP() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Distribute orders across drivers — OSRM-optimized when possible. */
async function autoGenerateRoutes(fundraiserId) {
  const drivers = await DriverRoute.find({ fundraiserId }).sort({ createdAt: 1 });
  if (!drivers.length) return { drivers: [], message: "No drivers" };

  const orders = await Order.find({
    fundraiserId,
    status: { $nin: ["refunded", "cancelled"] },
  }).sort({ createdAt: 1 });
  if (!orders.length) return { drivers, message: "No orders" };

  const fr = await Fundraiser.findById(fundraiserId).lean();

  for (const d of drivers) {
    d.stops = [];
    d.completedStops = 0;
    d.startedAt = undefined;
    d.completedAt = undefined;
  }

  let plan = null;
  let hubCoords = fr?.deliveryHubCoords || fr?.pickupCoords || null;

  try {
    plan = await optimizeRoutes({ orders, drivers, fundraiser: fr });
    hubCoords = plan?.hubCoords || hubCoords;
  } catch (err) {
    console.error("Route optimization failed, using capacity fallback:", err);
  }

  if (!plan?.stopsByDriver) {
    plan = capacityFallback({ orders, drivers, hubCoords });
  }

  if (plan.unassigned?.length) {
    const fb = capacityFallback({
      orders: plan.unassigned,
      drivers,
      hubCoords,
      existingStops: plan.stopsByDriver,
    });
    plan.stopsByDriver = fb.stopsByDriver;
    plan.unassigned = fb.unassigned;
  }

  if (!Array.isArray(plan.stopsByDriver) || plan.stopsByDriver.length !== drivers.length) {
    throw new Error("Route planner returned an invalid driver assignment.");
  }

  plan.stopsByDriver.forEach((orderList, i) => {
    drivers[i].stops = buildStopsFromOrders(orderList);
  });

  await Promise.all(drivers.map((d) => d.save()));

  const method = plan.optimized ? "optimized" : "capacity";
  const overCap = drivers.filter((d) => {
    const used = d.stops.reduce((s, stop) => s + (stop.bags || 0), 0);
    return used > (d.capacity || 999);
  });

  let message = `Routes generated for ${drivers.length} driver(s) (${method})`;
  if (plan.unassigned?.length) {
    message += `. ${plan.unassigned.length} order(s) could not fit any driver capacity — add drivers or raise caps.`;
  }
  if (overCap.length) {
    console.error("Route generation exceeded capacity for drivers:", overCap.map((d) => d.otp));
  }

  return {
    drivers,
    message,
    unassigned: plan.unassigned?.length || 0,
  };
}

// ── Public: get route by OTP (driver accesses their route) ──
router.get("/routes/:otp", async (req, res) => {
  try {
    const route = await DriverRoute.findOne({ otp: req.params.otp.toUpperCase() })
      .populate("fundraiserId", "title");
    if (!route) return res.status(404).json({ message: "Invalid driver code" });

    if (!route.startedAt) {
      route.startedAt = new Date();
      await route.save();
    }
    res.json(route.toJSON());
  } catch {
    res.status(500).json({ message: "Unable to fetch driver route" });
  }
});

// ── Public (OTP-gated): mark a stop as delivered ──────
router.patch("/routes/:otp/stops/:stopIndex/complete", async (req, res) => {
  try {
    const otp = req.params.otp.toUpperCase();
    const idx = Number(req.params.stopIndex);
    const route = await DriverRoute.findOne({ otp });
    if (!route) return res.status(404).json({ message: "Invalid driver code" });
    if (idx < 0 || idx >= route.stops.length) return res.status(400).json({ message: "Stop index out of range" });
    if (route.stops[idx].status === "delivered") return res.status(409).json({ message: "Stop already delivered" });

    route.stops[idx].status      = "delivered";
    route.stops[idx].deliveredAt = new Date();
    route.completedStops = route.stops.filter(s => s.status === "delivered").length;
    if (route.completedStops === route.stops.length) route.completedAt = new Date();
    await route.save();

    // Also mark the order as delivered
    if (route.stops[idx].orderId) {
      await Order.findByIdAndUpdate(route.stops[idx].orderId, { status: "delivered" });
    }

    const updated = await DriverRoute.findById(route._id);
    res.json(updated.toJSON());
  } catch {
    res.status(500).json({ message: "Unable to complete stop" });
  }
});

// ── Admin: add a driver (auto-assign OTP) ─────────────
router.post("/drivers", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = z.object({
      fundraiserId: z.string().min(10),
      driverName:   z.string().min(2).trim(),
      capacity:     z.coerce.number().int().min(1).max(999),
      driverPhone:  z.string().optional(),
    }).parse(req.body);

    // Generate a unique OTP for this fundraiser
    let otp, attempts = 0;
    do {
      otp = genOTP();
      attempts++;
      if (attempts > 20) return res.status(500).json({ message: "Could not generate unique OTP" });
    } while (await DriverRoute.findOne({ fundraiserId: body.fundraiserId, otp }));

    const route = await DriverRoute.create({
      fundraiserId: body.fundraiserId,
      otp,
      driverName:  body.driverName,
      driverPhone: body.driverPhone,
      capacity:    body.capacity,
      stops:       [],
    });

    // Auto-fill routes when orders exist
    const orderCount = await Order.countDocuments({
      fundraiserId: body.fundraiserId,
      status: { $nin: ["refunded", "cancelled"] },
    });
    if (orderCount > 0) {
      try {
        await autoGenerateRoutes(body.fundraiserId);
      } catch (err) {
        console.error("Auto route generation failed:", err);
      }
    }

    const fresh = await DriverRoute.findById(route._id);
    res.status(201).json(fresh.toJSON());
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    res.status(500).json({ message: "Unable to add driver" });
  }
});

// ── Admin: auto-generate routes from orders ───────────
router.post("/routes/generate", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { fundraiserId } = z.object({ fundraiserId: z.string().min(10) }).parse(req.body);
    const result = await autoGenerateRoutes(fundraiserId);
    if (!result.drivers.length) return res.status(400).json({ message: "Add drivers first before generating routes" });
    if (result.message === "No orders") return res.status(400).json({ message: "No orders to assign yet" });
    res.json({
      message: result.message,
      drivers: result.drivers.map(d => ({ otp: d.otp, driverName: d.driverName, stops: d.stops.length })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload" });
    console.error("Route generation error:", error);
    const detail = error?.message || String(error);
    res.status(500).json({ message: `Unable to generate routes: ${detail}` });
  }
});

// ── Admin: list all routes for a fundraiser ───────────
router.get("/routes", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const filter = {};
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    const routes = await DriverRoute.find(filter).sort({ createdAt: 1 });
    res.json(routes.map(r => r.toJSON()));
  } catch {
    res.status(500).json({ message: "Unable to list driver routes" });
  }
});

// ── Admin: delete a driver/route ──────────────────────
router.delete("/drivers/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    await deleteDriverById(req.params.id, req.user.sub);
    res.json({ message: "Driver removed" });
  } catch (err) {
    res.status(400).json({ message: err.message || "Unable to remove driver" });
  }
});

export default router;
