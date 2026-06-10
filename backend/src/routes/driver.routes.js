import express from "express";
import { z } from "zod";
import { DriverRoute } from "../models/DriverRoute.js";
import { Order } from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// ── Generate a random 6-char OTP ──────────────────────
function genOTP() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Distribute all non-refunded orders across drivers by bag capacity. */
async function autoGenerateRoutes(fundraiserId) {
  const drivers = await DriverRoute.find({ fundraiserId }).sort({ createdAt: 1 });
  if (!drivers.length) return { drivers: [], message: "No drivers" };

  const orders = await Order.find({
    fundraiserId,
    status: { $nin: ["refunded", "cancelled"] },
  }).sort({ createdAt: 1 }).lean();
  if (!orders.length) return { drivers, message: "No orders" };

  for (const d of drivers) {
    d.stops = [];
    d.completedStops = 0;
    d.startedAt = undefined;
    d.completedAt = undefined;
  }

  let driverIdx = 0;
  for (const order of orders) {
    let assigned = false;
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[(driverIdx + i) % drivers.length];
      const usedCapacity = d.stops.reduce((s, stop) => s + stop.bags, 0);
      if ((d.capacity || 999) - usedCapacity >= order.totalBags) {
        d.stops.push({
          orderId:         order._id,
          customerName:    order.customerName,
          deliveryAddress: order.deliveryAddress,
          bags:            order.totalBags,
          comment:         order.comments || "",
        });
        driverIdx = (driverIdx + i + 1) % drivers.length;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      const leastLoaded = drivers.reduce((min, d) => {
        const used = d.stops.reduce((s, stop) => s + stop.bags, 0);
        const minUsed = min.stops.reduce((s, stop) => s + stop.bags, 0);
        return used < minUsed ? d : min;
      });
      leastLoaded.stops.push({
        orderId:         order._id,
        customerName:    order.customerName,
        deliveryAddress: order.deliveryAddress,
        bags:            order.totalBags,
        comment:         order.comments || "",
      });
    }
  }

  await Promise.all(drivers.map(d => d.save()));
  return {
    drivers,
    message: `Routes generated for ${drivers.length} driver(s)`,
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
    res.status(500).json({ message: "Unable to generate routes" });
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
    await DriverRoute.findByIdAndDelete(req.params.id);
    res.json({ message: "Driver removed" });
  } catch {
    res.status(500).json({ message: "Unable to remove driver" });
  }
});

export default router;
