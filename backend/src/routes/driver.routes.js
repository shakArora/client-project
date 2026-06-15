import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { DriverRoute } from "../models/DriverRoute.js";
import { Order } from "../models/Order.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";
import { Fundraiser } from "../models/Fundraiser.js";
import {
  optimizeRoutes,
  distributeAllOrders,
  buildStopsFromOrders,
  splitOrdersIntoRoutes,
  getDriverProfiles,
  ROUTE_MAX_BAGS,
} from "../utils/routeOptimizer.js";
import { deleteDriverById } from "../services/fundraiserCleanup.js";

const router = express.Router();

function genOTP() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function genUniqueOTP(fundraiserId) {
  let otp;
  for (let attempts = 0; attempts < 50; attempts++) {
    otp = genOTP();
    const exists = await DriverRoute.findOne({ fundraiserId, otp });
    if (!exists) return otp;
  }
  throw new Error("Could not generate unique driver code");
}

/** Assign orders to drivers, then split each driver into ≤100-bag routes. */
async function autoGenerateRoutes(fundraiserId) {
  const existingRoutes = await DriverRoute.find({ fundraiserId }).sort({ createdAt: 1 });
  if (!existingRoutes.length) return { drivers: [], message: "No drivers" };

  const profiles = getDriverProfiles(existingRoutes);
  const driverSlots = profiles.map((p) => ({
    _id: p.driverGroupId,
    driverName: p.driverName,
  }));

  const orders = await Order.find({
    fundraiserId,
    status: { $nin: ["refunded", "cancelled"] },
  }).sort({ createdAt: 1 });
  if (!orders.length) return { drivers: existingRoutes, message: "No orders" };

  const fr = await Fundraiser.findById(fundraiserId).lean();
  let hubCoords = fr?.deliveryHubCoords || fr?.pickupCoords || null;

  let plan = null;
  try {
    plan = await optimizeRoutes({ orders, drivers: driverSlots, fundraiser: fr });
    hubCoords = plan?.hubCoords || hubCoords;
  } catch (err) {
    console.error("Route optimization failed, using distribute fallback:", err);
  }

  if (!plan?.stopsByDriver) {
    plan = distributeAllOrders({ orders, drivers: driverSlots, hubCoords });
  }

  if (plan.unassigned?.length) {
    const remaining = plan.unassigned.filter((o) => (o.totalBags || 0) <= ROUTE_MAX_BAGS);
    const oversized = plan.unassigned.filter((o) => (o.totalBags || 0) > ROUTE_MAX_BAGS);
    const fb = distributeAllOrders({
      orders: remaining,
      drivers: driverSlots,
      hubCoords,
      existingStops: plan.stopsByDriver,
    });
    plan.stopsByDriver = fb.stopsByDriver;
    plan.unassigned = [...fb.unassigned, ...oversized];
  }

  if (!Array.isArray(plan.stopsByDriver) || plan.stopsByDriver.length !== profiles.length) {
    throw new Error("Route planner returned an invalid driver assignment.");
  }

  const routeDocs = [];
  let splitUnassigned = [];

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const orderList = plan.stopsByDriver[i] || [];
    const { routes: chunks, unassigned } = splitOrdersIntoRoutes(orderList);
    splitUnassigned.push(...unassigned);

    for (let ri = 0; ri < chunks.length; ri++) {
      routeDocs.push({
        fundraiserId,
        driverGroupId: profile.driverGroupId,
        routeNumber: ri + 1,
        driverName: profile.driverName,
        driverPhone: profile.driverPhone,
        driverTotalCapacity: profile.driverTotalCapacity,
        capacity: ROUTE_MAX_BAGS,
        stops: buildStopsFromOrders(chunks[ri].orders),
        otp: await genUniqueOTP(fundraiserId),
        completedStops: 0,
      });
    }
  }

  const allUnassigned = [...(plan.unassigned || []), ...splitUnassigned];

  await DriverRoute.deleteMany({ fundraiserId });
  const drivers = await DriverRoute.insertMany(routeDocs);

  const method = plan.optimized ? "optimized" : "distributed";
  const routeCount = drivers.length;
  const driverCount = profiles.length;

  let message = `Generated ${routeCount} route(s) for ${driverCount} driver(s) (max ${ROUTE_MAX_BAGS} bags per route, ${method})`;
  if (allUnassigned.length) {
    message += `. ${allUnassigned.length} order(s) exceed ${ROUTE_MAX_BAGS} bags and need to be split manually.`;
  }

  return {
    drivers,
    message,
    unassigned: allUnassigned.length,
    routeCount,
    driverCount,
  };
}

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

    if (route.stops[idx].orderId) {
      await Order.findByIdAndUpdate(route.stops[idx].orderId, { status: "delivered" });
    }

    const updated = await DriverRoute.findById(route._id);
    res.json(updated.toJSON());
  } catch {
    res.status(500).json({ message: "Unable to complete stop" });
  }
});

router.post("/drivers", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = z.object({
      fundraiserId: z.string().min(10),
      driverName:   z.string().min(2).trim(),
      capacity:     z.coerce.number().int().min(1).max(9999),
      driverPhone:  z.string().optional(),
    }).parse(req.body);

    const driverGroupId = new mongoose.Types.ObjectId();
    const otp = await genUniqueOTP(body.fundraiserId);

    const route = await DriverRoute.create({
      fundraiserId: body.fundraiserId,
      driverGroupId,
      routeNumber: 1,
      otp,
      driverName:  body.driverName,
      driverPhone: body.driverPhone,
      driverTotalCapacity: body.capacity,
      capacity:    ROUTE_MAX_BAGS,
      stops:       [],
    });

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

    const fresh = await DriverRoute.find({ fundraiserId: body.fundraiserId, driverGroupId });
    res.status(201).json({
      message: "Driver added",
      driverGroupId,
      routes: fresh.map((r) => r.toJSON()),
      vendor: fresh[0]?.toJSON(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    res.status(500).json({ message: "Unable to add driver" });
  }
});

router.post("/routes/generate", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { fundraiserId } = z.object({ fundraiserId: z.string().min(10) }).parse(req.body);
    const result = await autoGenerateRoutes(fundraiserId);
    if (!result.drivers.length && result.message === "No drivers") {
      return res.status(400).json({ message: "Add drivers first before generating routes" });
    }
    if (result.message === "No orders") return res.status(400).json({ message: "No orders to assign yet" });
    res.json({
      message: result.message,
      routeCount: result.routeCount,
      driverCount: result.driverCount,
      drivers: result.drivers.map((d) => ({
        otp: d.otp,
        driverName: d.driverName,
        routeNumber: d.routeNumber,
        stops: d.stops.length,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload" });
    console.error("Route generation error:", error);
    const detail = error?.message || String(error);
    res.status(500).json({ message: `Unable to generate routes: ${detail}` });
  }
});

router.get("/routes", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const filter = {};
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    const routes = await DriverRoute.find(filter).sort({ driverName: 1, routeNumber: 1, createdAt: 1 });
    res.json(routes.map(r => r.toJSON()));
  } catch {
    res.status(500).json({ message: "Unable to list driver routes" });
  }
});

router.delete("/drivers/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    await deleteDriverById(req.params.id, req.user.sub);
    res.json({ message: "Driver removed" });
  } catch (err) {
    res.status(400).json({ message: err.message || "Unable to remove driver" });
  }
});

export default router;
