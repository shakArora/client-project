import express from "express";
import { z } from "zod";
import { Fundraiser } from "../models/Fundraiser.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";
import { uniqueSlug } from "../utils/slug.js";
import { isPublishReady } from "../utils/publishChecks.js";

const router = express.Router();

// ── Public: list active fundraisers ───────────────────
router.get("/", async (_req, res) => {
  try {
    const items = await Fundraiser.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Unable to list fundraisers" });
  }
});

// ── Public: get fundraiser by slug (customer page) ────
router.get("/by-slug/:slug", async (req, res) => {
  try {
    const item = await Fundraiser.findOne({ slug: req.params.slug.toLowerCase() }).lean();
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Unable to fetch fundraiser" });
  }
});

// ── Public: get the currently active fundraiser ───────
router.get("/active", async (_req, res) => {
  try {
    const item = await Fundraiser.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    if (!item) return res.status(404).json({ message: "No active fundraiser" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Unable to fetch active fundraiser" });
  }
});

// ── Admin: list THIS admin's fundraisers ──────────────
router.get("/mine", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const items = await Fundraiser.find({ adminId: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Unable to list fundraisers" });
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

// ── Date coercion helper ──────────────────────────────
const optDate = z.preprocess(
  v => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional(),
);

// ── Shared schema ─────────────────────────────────────
const baseSchema = z.object({
  title:         z.string().min(2).trim(),
  description:   z.string().optional(),
  location:      z.object({ city: z.string().optional(), state: z.string().optional() }).optional(),
  contactName:   z.string().optional(),
  contactEmail:  z.string().email().optional().or(z.literal("")),
  contactPhone:  z.string().optional(),
  deliveryNotes: z.string().optional(),
  coverImageUrl: z.string().optional(),
  startDate:     optDate,
  endDate:       optDate,
  deliveryDate:  optDate,
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
    if (body.isActive) await Fundraiser.updateMany({ adminId: req.user.sub }, { isActive: false });

    const slug = await uniqueSlug(Fundraiser, body.title);
    const item = await Fundraiser.create({ ...body, adminId: req.user.sub, slug });
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    console.error("Fundraiser create error:", error);
    res.status(500).json({ message: "Unable to create fundraiser" });
  }
});

// ── Admin: update ─────────────────────────────────────
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = baseSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await Fundraiser.findOne({ _id: req.params.id, adminId: req.user.sub });
    if (!existing) return res.status(404).json({ message: "Fundraiser not found" });

    if (body.isActive === true) {
      await Fundraiser.updateMany({ adminId: req.user.sub, _id: { $ne: req.params.id } }, { isActive: false });
    }
    if (body.title) {
      body.slug = await uniqueSlug(Fundraiser, body.title, req.params.id);
    }

    const item = await Fundraiser.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: false });
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    if (error.code === 11000) return res.status(409).json({ message: "A fundraiser with that title already exists" });
    console.error("Fundraiser update error:", error);
    res.status(500).json({ message: "Unable to update fundraiser" });
  }
});

// ── Admin: toggle live / paused (one live per admin) ──
router.patch("/:id/activate", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const item = await Fundraiser.findOne({ _id: req.params.id, adminId: req.user.sub });
    if (!item) return res.status(404).json({ message: "Fundraiser not found" });

    if (!item.isActive) {
      const { Product } = await import("../models/Product.js");
      const productCount = await Product.countDocuments({ fundraiserId: item._id, isActive: true });
      if (!isPublishReady(item, productCount)) {
        return res.status(400).json({
          message: "Complete the publishing checklist before going live.",
        });
      }
      await Fundraiser.updateMany({ adminId: req.user.sub, _id: { $ne: item._id } }, { isActive: false });
    }
    item.isActive = !item.isActive;
    await item.save();
    res.json(item.toObject());
  } catch {
    res.status(500).json({ message: "Unable to toggle fundraiser status" });
  }
});

export default router;
