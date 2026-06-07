import express from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Vendor } from "../models/Vendor.js";
import { Fundraiser } from "../models/Fundraiser.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// ── Admin / Vendor: list orders ───────────────────────
// Admin sees all; vendor sees only their own
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.VENDOR) {
      const vendor = await Vendor.findOne({ userId: req.user.sub }).lean();
      if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
      filter.vendorId = vendor._id;
    }
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    if (req.query.status)       filter.status = req.query.status;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Unable to list orders" });
  }
});

// ── Auth: get single order ────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("vendorId", "name referralCode").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch {
    res.status(500).json({ message: "Unable to fetch order" });
  }
});

// ── Public: place a new order ─────────────────────────
const orderItemSchema = z.object({
  productId:   z.string().min(10),
  productName: z.string().min(1),
  quantity:    z.number().int().min(1),
  unitPrice:   z.number().min(0),
});

const createSchema = z.object({
  fundraiserId:    z.string().min(10),
  referralCode:    z.string().min(2).max(6).trim().toUpperCase().optional(),
  customerName:    z.string().min(2).trim(),
  customerEmail:   z.string().email().trim(),
  deliveryAddress: z.string().min(5).trim(),
  comments:        z.string().optional(),
  items:           z.array(orderItemSchema).min(1),
  paymentIntentId: z.string().optional(),
});

router.post("/", async (req, res) => {
  try {
    const body = createSchema.parse(req.body);

    // Resolve vendor by referral code (if provided)
    let vendorId = null;
    if (body.referralCode) {
      const vendor = await Vendor.findOne({
        fundraiserId: body.fundraiserId,
        referralCode: body.referralCode,
        isActive: true,
      });
      if (vendor) vendorId = vendor._id;
    }

    const totalBags   = body.items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const order = await Order.create({
      ...body,
      vendorId,
      totalBags,
      totalAmount,
      status: body.paymentIntentId ? "paid" : "pending",
    });

    // Increment fundraiser counters
    await Fundraiser.findByIdAndUpdate(body.fundraiserId, {
      $inc: { soldBags: totalBags, totalRevenue: totalAmount, orderCount: 1 },
    });

    // Increment vendor counters
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, {
        $inc: { bagsSold: totalBags, totalRevenue: totalAmount, orderCount: 1 },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid order payload", issues: error.issues });
    }
    res.status(500).json({ message: "Unable to place order" });
  }
});

// ── Admin: update order status ────────────────────────
router.patch("/:id/status", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(["pending", "paid", "fulfilled", "delivered", "refunded", "cancelled"]),
    }).parse(req.body);

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid status", issues: error.issues });
    }
    res.status(500).json({ message: "Unable to update order status" });
  }
});

export default router;
