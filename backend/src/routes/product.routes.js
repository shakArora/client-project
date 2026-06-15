/**
 * Provides product list, detail, create, update, and delete endpoints with optional auth-aware visibility. Public users see only active products; admins see all products for a fundraiser.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import express from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verifyAuthToken } from "../utils/auth.js";
import { ROLES } from "../models/User.js";

const router = express.Router();

// Lightweight optional auth — doesn't reject, just populates req.user if valid token present
function tryAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme === "Bearer" && token) {
    try { req.user = verifyAuthToken(token); } catch {}
  }
  next();
}

// ── List products ─────────────────────────────────────
// Public → only isActive:true  |  Admin → all (including hidden)
router.get("/", tryAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.fundraiserId) filter.fundraiserId = req.query.fundraiserId;
    if (req.user?.role !== ROLES.ADMIN) filter.isActive = true;

    const products = await Product.find(filter).sort({ createdAt: 1 }).lean();
    res.json(products);
  } catch {
    res.status(500).json({ message: "Unable to list products" });
  }
});

// ── Public: get single product ────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch {
    res.status(500).json({ message: "Unable to fetch product" });
  }
});

// ── Admin: create ─────────────────────────────────────
const createSchema = z.object({
  fundraiserId: z.string().min(10),
  name:         z.string().min(2).trim(),
  description:  z.string().optional(),
  price:        z.coerce.number().min(0),
  emoji:        z.string().optional(),
  imageUrl:     z.string().url().optional().or(z.literal("")),
  isActive:     z.boolean().default(true),
});

router.post("/", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body    = createSchema.parse(req.body);
    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    console.error("Product create error:", error);
    res.status(500).json({ message: "Unable to create product" });
  }
});

// ── Admin: update product ─────────────────────────────
const updateSchema = createSchema.partial().omit({ fundraiserId: true });

router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const body    = updateSchema.parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: error.issues });
    }
    res.status(500).json({ message: "Unable to update product" });
  }
});

// ── Admin: soft-delete via isActive:false ─────────────
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deactivated" });
  } catch {
    res.status(500).json({ message: "Unable to delete product" });
  }
});

export default router;
