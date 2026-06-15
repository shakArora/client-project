import express from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Vendor } from "../models/Vendor.js";
import { Fundraiser } from "../models/Fundraiser.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";
import { geocodeImportAddress, searchAddresses } from "../utils/geocode.js";
import { deleteOrderById } from "../services/fundraiserCleanup.js";

const router = express.Router();

// ── Public: search valid addresses (dropdown) ───────
router.get("/address-search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 3) return res.json([]);
    const results = await searchAddresses(q, 6);
    res.json(results);
  } catch {
    res.status(500).json({ message: "Address search failed" });
  }
});

// ── Admin / Vendor: list orders ───────────────────────
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

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Unable to list orders" });
  }
});

// ── Auth: get single order ────────────────────────────
// ── Public: validate a delivery address (geocode) ─────
router.post("/validate-address", async (req, res) => {
  try {
    const { address } = z.object({ address: z.string().min(5).trim() }).parse(req.body);
    const coords = await geocodeImportAddress(address);
    if (!coords.ok) {
      return res.status(400).json({
        valid: false,
        message: coords.reason === "not_a_street_address"
          ? "Enter a street address with a house number."
          : "We couldn't locate that address. Please double-check and try again.",
      });
    }
    res.json({ valid: true, coords: coords.coords });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid address" });
    res.status(500).json({ message: "Unable to validate address" });
  }
});

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
  quantity:    z.coerce.number().int().min(1),
  unitPrice:   z.coerce.number().min(0),
});

const createSchema = z.object({
  fundraiserId:    z.string().min(10),
  referralCode:    z.string().min(2).max(6).trim().toUpperCase().optional(),
  customerName:    z.string().min(2).trim(),
  customerEmail:   z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? undefined : v),
    z.string().email().trim().optional(),
  ),
  customerPhone:   z.preprocess(
    (v) => (typeof v === "string" && !v.trim() ? undefined : v),
    z.string().trim().optional(),
  ),
  deliveryAddress: z.string().min(5).trim(),
  comments:        z.string().optional(),
  items:           z.array(orderItemSchema).min(1),
  paymentIntentId: z.string().optional(),
});

router.post("/", async (req, res) => {
  try {
    const body = createSchema.parse(req.body);

    const fr = await Fundraiser.findById(body.fundraiserId).lean();
    if (!fr || !fr.isActive) {
      return res.status(403).json({ message: "This fundraiser is not accepting orders right now." });
    }
    if (fr.endDate) {
      const end = new Date(fr.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date() > end) {
        return res.status(403).json({ message: "Ordering has closed for this fundraiser." });
      }
    }

    const coords = await geocodeImportAddress(body.deliveryAddress);
    if (!coords.ok) {
      return res.status(400).json({
        message: coords.reason === "not_a_street_address"
          ? "Enter a street address with a house number."
          : "We couldn't locate that address. Please double-check and try again.",
      });
    }

    // Resolve vendor
    let vendorId = null;
    if (body.referralCode) {
      const vendor = await Vendor.findOne({ fundraiserId: body.fundraiserId, referralCode: body.referralCode, isActive: true });
      if (vendor) vendorId = vendor._id;
    }

    const totalBags   = body.items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const order = await Order.create({
      ...body,
      vendorId,
      totalBags,
      totalAmount,
      coords: coords.coords,
      status: body.paymentIntentId ? "paid" : "pending",
    });

    await Fundraiser.findByIdAndUpdate(body.fundraiserId, {
      $inc: { soldBags: totalBags, totalRevenue: totalAmount, orderCount: 1 },
    });
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, {
        $inc: { bagsSold: totalBags, totalRevenue: totalAmount, orderCount: 1 },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid order payload", issues: error.issues });
    res.status(500).json({ message: "Unable to place order" });
  }
});

// ── Admin: update order status ────────────────────────
router.patch("/:id/status", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(["pending", "paid", "fulfilled", "delivered", "refunded", "cancelled"]),
    }).parse(req.body);

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid status" });
    res.status(500).json({ message: "Unable to update order status" });
  }
});

// ── Admin: refund an order ────────────────────────────
router.post("/:id/refund", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "refunded") return res.status(409).json({ message: "Order already refunded" });

    order.status = "refunded";
    await order.save();

    // Reverse the fundraiser and vendor counters
    await Fundraiser.findByIdAndUpdate(order.fundraiserId, {
      $inc: { soldBags: -order.totalBags, totalRevenue: -order.totalAmount, orderCount: -1 },
    });
    if (order.vendorId) {
      await Vendor.findByIdAndUpdate(order.vendorId, {
        $inc: { bagsSold: -order.totalBags, totalRevenue: -order.totalAmount, orderCount: -1 },
      });
    }

    res.json(order);
  } catch {
    res.status(500).json({ message: "Unable to refund order" });
  }
});

// ── Admin: delete an order ────────────────────────────
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const stats = await deleteOrderById(req.params.id, req.user.sub);
    res.json({ message: "Order deleted", ...stats });
  } catch (err) {
    res.status(400).json({ message: err.message || "Unable to delete order" });
  }
});

export default router;
