import express from "express";
import { z } from "zod";
import { Vendor } from "../models/Vendor.js";
import { Order } from "../models/Order.js";
import { Fundraiser } from "../models/Fundraiser.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// ── Admin: list all vendors (optionally filter by fundraiser) ─
router.get("/", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const filter = {};
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    const vendors = await Vendor.find(filter).sort({ bagsSold: -1 }).lean();
    res.json(vendors);
  } catch {
    res.status(500).json({ message: "Unable to list vendors" });
  }
});

// ── Vendor: get own profile ───────────────────────────
router.get("/me", requireAuth, requireRole(ROLES.VENDOR), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.sub }).populate("fundraiserId", "title slug isActive endDate").lean();
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    res.json(vendor);
  } catch {
    res.status(500).json({ message: "Unable to fetch vendor profile" });
  }
});

// ── Vendor: get own orders ────────────────────────────
router.get("/me/orders", requireAuth, requireRole(ROLES.VENDOR), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.sub }).lean();
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    const orders = await Order.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Unable to fetch vendor orders" });
  }
});

// ── Admin: get single vendor ──────────────────────────
router.get("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate("fundraiserId", "title slug").lean();
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch {
    res.status(500).json({ message: "Unable to fetch vendor" });
  }
});

// ── Admin: get orders for a vendor ───────────────────
router.get("/:id/orders", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const orders = await Order.find({ vendorId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Unable to fetch vendor orders" });
  }
});

// ── Admin: create vendor ──────────────────────────────
const createSchema = z.object({
  userId:       z.string().min(10),
  fundraiserId: z.string().min(10),
  referralCode: z.string().min(2).max(6).trim().toUpperCase(),
});

router.post("/", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = createSchema.parse(req.body);

    // Pull name+email from the User record
    const user = await User.findById(body.userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const vendor = await Vendor.create({
      userId:       body.userId,
      fundraiserId: body.fundraiserId,
      referralCode: body.referralCode.toUpperCase(),
      name:         user.name,
      email:        user.email,
    });

    // Bump vendor count on fundraiser
    await Fundraiser.findByIdAndUpdate(body.fundraiserId, { $inc: { vendorCount: 1 } });

    res.status(201).json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Referral code already taken for this fundraiser" });
    }
    res.status(500).json({ message: "Unable to create vendor" });
  }
});

// ── Vendor: update own profile (goal, etc.) ───────────
router.patch("/me", requireAuth, requireRole(ROLES.VENDOR), async (req, res) => {
  try {
    const body = z.object({
      revenueGoal: z.coerce.number().min(0).optional(),
    }).parse(req.body);
    const vendor = await Vendor.findOneAndUpdate({ userId: req.user.sub }, body, { new: true })
      .populate("fundraiserId", "title slug isActive endDate");
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    res.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload" });
    res.status(500).json({ message: "Unable to update profile" });
  }
});

// ── Admin: update vendor ──────────────────────────────
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body = z.object({
      referralCode: z.string().min(2).max(6).trim().toUpperCase().optional(),
      isActive:     z.boolean().optional(),
    }).parse(req.body);

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    res.status(500).json({ message: "Unable to update vendor" });
  }
});

export default router;
