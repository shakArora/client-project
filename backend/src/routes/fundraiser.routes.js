import express from "express";
import { z } from "zod";
import { Fundraiser } from "../models/Fundraiser.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verifyAuthToken } from "../utils/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// ── Public: list all fundraisers ──────────────────────
router.get("/", async (_req, res) => {
  try {
    const items = await Fundraiser.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Unable to list fundraisers" });
  }
});

// ── Public: get the currently active fundraiser ───────
router.get("/active", async (_req, res) => {
  try {
    const item = await Fundraiser.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    if (!item) return res.status(404).json({ message: "No active fundraiser" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Unable to fetch active fundraiser" });
  }
});

// ── Public: get by id ─────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const item = await Fundraiser.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Unable to fetch fundraiser" });
  }
});

// ── Admin: dashboard stats for a fundraiser ───────────
router.get("/:id/stats", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const item = await Fundraiser.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });
    res.json({
      soldBags:     item.soldBags,
      totalRevenue: item.totalRevenue,
      vendorCount:  item.vendorCount,
      orderCount:   item.orderCount,
    });
  } catch {
    res.status(500).json({ message: "Unable to fetch stats" });
  }
});

// Safely coerce a date — treats empty strings / null as undefined so they don't crash
const optDate = z.preprocess(
  v => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional(),
);

// ── Shared schema ─────────────────────────────────────
const baseSchema = z.object({
  title:        z.string().min(2).trim(),
  description:  z.string().optional(),
  location: z.object({
    city:  z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  startDate:    optDate,
  endDate:      optDate,
  deliveryDate: optDate,
  // Accept boolean OR coerce "true"/"on"/1 → true
  isActive: z.preprocess(v => {
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "on" || v === "1" || v === 1) return true;
    if (v === "false" || v === "" || v === "0" || v === 0) return false;
    return v;
  }, z.boolean().default(false)),
});

// ── Admin: create ─────────────────────────────────────
router.post("/", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = baseSchema.parse(req.body);

    // If activating, deactivate all others first
    if (body.isActive) {
      await Fundraiser.updateMany({}, { isActive: false });
    }

    // Create — handle slug collision by appending a short hash
    let item;
    try {
      item = await Fundraiser.create({ ...body, adminId: req.user.sub });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        // Slug collision — compute slug explicitly and add timestamp suffix
        const base = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const slug = `${base}-${Date.now().toString(36)}`;
        item = await Fundraiser.create({ ...body, adminId: req.user.sub, slug });
      } else {
        throw dbErr;
      }
    }

    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    console.error("Fundraiser create error:", error);
    res.status(500).json({ message: "Unable to create fundraiser" });
  }
});

// ── Admin: update ─────────────────────────────────────
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = baseSchema.partial().parse(req.body);

    // If setting active, deactivate all others first
    if (body.isActive === true) {
      await Fundraiser.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }

    // Generate slug if title is being changed (findByIdAndUpdate skips save hooks)
    if (body.title && !body.slug) {
      body.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    const item = await Fundraiser.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: false },
    );
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "A fundraiser with that title already exists" });
    }
    console.error("Fundraiser update error:", error);
    res.status(500).json({ message: "Unable to update fundraiser" });
  }
});

// ── Admin: toggle isActive (one live at a time) ───────
router.patch("/:id/activate", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const item = await Fundraiser.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });

    const goingLive = !item.isActive;

    // Deactivate all before activating one
    if (goingLive) {
      await Fundraiser.updateMany({ _id: { $ne: item._id } }, { isActive: false });
    }

    item.isActive = goingLive;
    await item.save();

    // Return the full object so the frontend can update its state
    res.json(item.toObject());
  } catch {
    res.status(500).json({ message: "Unable to toggle fundraiser status" });
  }
});

export default router;
