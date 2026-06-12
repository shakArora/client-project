/**
 * Admin-only aggregate endpoints — dashboard stats and user management.
 */
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Fundraiser } from "../models/Fundraiser.js";
import { Order } from "../models/Order.js";
import { Vendor } from "../models/Vendor.js";
import { User, ROLES } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signAuthToken } from "../utils/auth.js";

const router = express.Router();

const adminPassword = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine(p => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
  .refine(p => /[a-z]/.test(p), "Password must contain at least one lowercase letter")
  .refine(p => /[0-9]/.test(p), "Password must contain at least one number")
  .refine(p => /[^A-Za-z0-9]/.test(p), "Password must contain at least one special character");

const vendorPassword = z.string().min(1, "Password is required");

const VENDOR_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function genVendorReferralCode(fundraiserId) {
  let code, attempts = 0;
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += VENDOR_CODE_CHARS[Math.floor(Math.random() * VENDOR_CODE_CHARS.length)];
    attempts++;
    if (attempts > 30) throw new Error("Could not generate unique referral code");
  } while (await Vendor.findOne({ fundraiserId, referralCode: code }));
  return code;
}

// ── Dashboard stats ───────────────────────────────────
router.get("/stats", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const fundraiserId = req.query.fundraiserId;

    const orderFilter  = fundraiserId ? { fundraiserId } : {};
    const vendorFilter = fundraiserId ? { fundraiserId } : {};

    const [fundraiser, orders, vendors, topVendors] = await Promise.all([
      fundraiserId ? Fundraiser.findById(fundraiserId).lean() : Fundraiser.findOne({ isActive: true }).lean(),
      Order.find(orderFilter).lean(),
      Vendor.countDocuments(vendorFilter),
      Vendor.find(vendorFilter).sort({ bagsSold: -1 }).limit(5).lean(),
    ]);

    const totalBags    = orders.reduce((s, o) => s + (o.totalBags    || 0), 0);
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount  || 0), 0);
    const pending      = orders.filter(o => o.status === "pending").length;
    const paid         = orders.filter(o => o.status === "paid").length;
    const refunded     = orders.filter(o => o.status === "refunded").length;

    res.json({
      fundraiser,
      totalBags,
      totalRevenue,
      vendorCount:  vendors,
      orderCount:   orders.length,
      pending,
      paid,
      refunded,
      topVendors,
      recentOrders: orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10),
    });
  } catch {
    res.status(500).json({ message: "Unable to fetch dashboard stats" });
  }
});

// ── Create admin/vendor user account ─────────────────
router.post("/users", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  const schema = z.object({
    name:     z.string().min(2).trim(),
    email:    z.string().email().trim(),
    password: z.string().min(1),
    role:     z.enum([ROLES.VENDOR, ROLES.ADMIN, ROLES.DRIVER]).default(ROLES.VENDOR),
    phone:    z.string().optional(),
  });

  try {
    const body     = schema.parse(req.body);
    if (body.role === ROLES.ADMIN) adminPassword.parse(body.password);
    else vendorPassword.parse(body.password);

    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      name:  body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash,
      role:  body.role,
    });

    const token = signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    res.status(500).json({ message: "Unable to create user" });
  }
});

// ── Create vendor account (User + Vendor in one step) ──
router.post("/vendors", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  const schema = z.object({
    name:         z.string().min(2).trim(),
    email:        z.string().email().trim(),
    password:     vendorPassword,
    fundraiserId: z.string().min(10),
    referralCode: z.string().min(2).max(6).trim().toUpperCase().optional(),
  });

  try {
    const { Vendor }     = await import("../models/Vendor.js");
    const { Fundraiser } = await import("../models/Fundraiser.js");
    const body = schema.parse(req.body);

    let user = await User.findOne({ email: body.email.toLowerCase() });
    if (user?.role === ROLES.ADMIN) {
      return res.status(409).json({ message: "This email belongs to an administrator account." });
    }
    if (!user) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      user = await User.create({
        name:  body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role:  ROLES.VENDOR,
      });
    } else if (user.role !== ROLES.VENDOR) {
      user.role = ROLES.VENDOR;
      await user.save();
    }

    const referralCode = body.referralCode || await genVendorReferralCode(body.fundraiserId);

    const vendor = await Vendor.create({
      userId:       user._id,
      fundraiserId: body.fundraiserId,
      referralCode,
      name:         body.name,
      email:        body.email.toLowerCase(),
    });

    await Fundraiser.findByIdAndUpdate(body.fundraiserId, { $inc: { vendorCount: 1 } });

    res.status(201).json({
      user:   { id: user._id, name: user.name, email: user.email },
      vendor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Referral code already taken" });
    }
    res.status(500).json({ message: "Unable to create vendor account" });
  }
});

// ── List all users ────────────────────────────────────
router.get("/users", requireAuth, requireRole(ROLES.ADMIN), async (_req, res) => {
  try {
    const users = await User.find().select("-passwordHash -googleSub").sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch {
    res.status(500).json({ message: "Unable to list users" });
  }
});

export default router;
