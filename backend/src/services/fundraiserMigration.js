import bcrypt from "bcryptjs";
import { Fundraiser } from "../models/Fundraiser.js";
import { Product } from "../models/Product.js";
import { Vendor } from "../models/Vendor.js";
import { Order } from "../models/Order.js";
import { DriverRoute } from "../models/DriverRoute.js";
import { User, ROLES } from "../models/User.js";
import { geocodeImportAddress, validateImportAddresses, formatRegionHint } from "../utils/geocode.js";

const EXPORT_VERSION = 1;

const DEFAULT_OPTIONS = {
  orders:    "append",
  products:  "upsert",
  vendors:   "skip-existing",
  drivers:   "skip-existing",
  fundraiser: "merge",
  geocode:   true,
};

function normalizeOptions(payload) {
  return { ...DEFAULT_OPTIONS, ...(payload.options || {}) };
}

function normalizeAddress(addr) {
  return String(addr || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ORDER_STATUSES = new Set([
  "pending", "paid", "fulfilled", "delivered", "refunded", "cancelled",
]);

function normalizeOrderStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return ORDER_STATUSES.has(s) ? s : "pending";
}

function emptyStats() {
  return {
    products: 0,
    vendors: 0,
    orders: 0,
    drivers: 0,
    skipped: [],
    warnings: [],
    details: {
      products:  { created: 0, updated: 0 },
      vendors:   { created: 0, skipped: 0 },
      orders:    { created: 0, skipped: 0, duplicates: 0, addressWarnings: 0 },
      drivers:   { created: 0, skipped: 0 },
      fundraiser: { updated: false },
    },
  };
}

export async function exportFundraiser(fundraiserId) {
  const fr = await Fundraiser.findById(fundraiserId).lean();
  if (!fr) throw new Error("Fundraiser not found");

  const [products, vendors, orders, drivers] = await Promise.all([
    Product.find({ fundraiserId }).lean(),
    Vendor.find({ fundraiserId }).lean(),
    Order.find({ fundraiserId }).sort({ createdAt: 1 }).lean(),
    DriverRoute.find({ fundraiserId }).sort({ createdAt: 1 }).lean(),
  ]);

  const { adminId, _id, __v, ...frData } = fr;

  return {
    routedExportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    fundraiser: frData,
    products: products.map(({ fundraiserId: _f, __v, ...p }) => p),
    vendors: vendors.map(({ fundraiserId: _f, userId, __v, ...v }) => v),
    orders: orders.map(({ fundraiserId: _f, vendorId, __v, ...o }) => o),
    drivers: drivers.map(({ fundraiserId: _f, __v, ...d }) => ({
      driverName:  d.driverName,
      driverPhone: d.driverPhone,
      capacity:    d.capacity,
      otp:         d.otp,
      stops: (d.stops || []).map(s => ({
        customerName:    s.customerName,
        deliveryAddress: s.deliveryAddress,
        bags:            s.bags,
        comment:         s.comment || "",
        status:          s.status,
      })),
    })),
  };
}

const VENDOR_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const OTP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genOTP() {
  let code = "";
  for (let i = 0; i < 6; i++) code += OTP_CHARS[Math.floor(Math.random() * OTP_CHARS.length)];
  return code;
}

async function genReferralCode(fundraiserId, preferred) {
  if (preferred) {
    const exists = await Vendor.findOne({ fundraiserId, referralCode: preferred.toUpperCase() });
    if (!exists) return preferred.toUpperCase();
  }
  let code, attempts = 0;
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += VENDOR_CODE_CHARS[Math.floor(Math.random() * VENDOR_CODE_CHARS.length)];
    attempts++;
  } while (await Vendor.findOne({ fundraiserId, referralCode: code }) && attempts < 30);
  return code;
}

async function isDuplicateOrder(fundraiserId, order) {
  const addr  = normalizeAddress(order.deliveryAddress || order.coords?.display);
  const bags  = order.totalBags || 0;
  const email = String(order.customerEmail || "").trim().toLowerCase();
  if (!addr || !bags) return false;
  if (!email && !String(order.customerName || "").trim()) return false;

  const filter = { fundraiserId, totalBags: bags };
  if (email) filter.customerEmail = email;
  else filter.customerName = { $regex: new RegExp(`^${escapeRegex(order.customerName.trim())}$`, "i") };

  const existing = await Order.findOne(filter).lean();
  if (!existing) return false;
  return normalizeAddress(existing.deliveryAddress) === addr;
}

function fundraiserRegionHint(fr) {
  return formatRegionHint(fr?.location)
    || formatRegionHint(fr?.pickupAddress)
    || formatRegionHint(fr?.deliveryHubAddress)
    || null;
}

export async function validateOrderImportAddresses(fundraiserId, adminId, rows) {
  const fr = await Fundraiser.findOne({ _id: fundraiserId, adminId }).lean();
  if (!fr) throw new Error("Fundraiser not found");
  return validateImportAddresses(rows, { regionHint: fundraiserRegionHint(fr) });
}

export async function importFundraiser(fundraiserId, adminId, payload) {
  const fr = await Fundraiser.findOne({ _id: fundraiserId, adminId });
  if (!fr) throw new Error("Fundraiser not found");

  const options = normalizeOptions(payload);
  const stats = emptyStats();

  if (payload.fundraiser && options.fundraiser !== "skip") {
    const allowed = [
      "title", "description", "location", "pickupAddress", "pickupCoords",
      "deliveryHubAddress", "deliveryHubCoords", "contactName", "contactEmail",
      "contactPhone", "deliveryNotes", "paymentMethod", "paymentDestination", "paymentNotes",
      "coverImageUrl", "startDate", "endDate", "deliveryDate",
    ];
    for (const key of allowed) {
      if (payload.fundraiser[key] !== undefined) fr[key] = payload.fundraiser[key];
    }
    await fr.save();
    stats.details.fundraiser.updated = true;
  }

  const productMap = {};
  for (const p of payload.products || []) {
    const existing = await Product.findOne({ fundraiserId, name: p.name });
    if (existing) {
      if (options.products === "skip-existing") {
        productMap[p.name] = existing._id;
        continue;
      }
      Object.assign(existing, {
        description: p.description,
        price: p.price,
        emoji: p.emoji,
        imageUrl: p.imageUrl,
        isActive: p.isActive ?? true,
      });
      await existing.save();
      productMap[p.name] = existing._id;
      stats.details.products.updated++;
    } else {
      const created = await Product.create({ ...p, fundraiserId });
      productMap[p.name] = created._id;
      stats.details.products.created++;
    }
    stats.products++;
  }

  const vendorByCode = {};
  const existingVendors = await Vendor.find({ fundraiserId }).lean();
  for (const v of existingVendors) {
    vendorByCode[v.referralCode] = v;
  }

  for (const v of payload.vendors || []) {
    const email = v.email?.toLowerCase();
    if (!email) {
      stats.skipped.push(`Vendor ${v.name || "(unnamed)"}: missing email`);
      stats.details.vendors.skipped++;
      continue;
    }

    let vendor = await Vendor.findOne({ fundraiserId, email });
    if (vendor) {
      vendorByCode[vendor.referralCode] = vendor;
      if (v.referralCode) vendorByCode[v.referralCode.toUpperCase()] = vendor;
      stats.details.vendors.skipped++;
      stats.skipped.push(`Vendor ${v.name}: already exists (${email})`);
      continue;
    }

    const code = await genReferralCode(fundraiserId, v.referralCode);
    const password = String(v.password || "").trim() || "vendor";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: v.name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: ROLES.VENDOR,
      });
    } else if (v.password?.trim()) {
      user.passwordHash = await bcrypt.hash(password, 10);
      if (!user.name && v.name) user.name = v.name;
      await user.save();
    }

    vendor = await Vendor.create({
      userId: user._id,
      fundraiserId,
      name: v.name,
      email,
      referralCode: code,
      bagsSold: v.bagsSold || 0,
      totalRevenue: v.totalRevenue || 0,
      orderCount: v.orderCount || 0,
      revenueGoal: v.revenueGoal || 0,
      isActive: v.isActive ?? true,
    });
    await Fundraiser.findByIdAndUpdate(fundraiserId, { $inc: { vendorCount: 1 } });
    vendorByCode[code] = vendor;
    if (v.referralCode) vendorByCode[v.referralCode.toUpperCase()] = vendor;
    stats.details.vendors.created++;
    stats.vendors++;
  }

  const dbProducts = await Product.find({ fundraiserId });
  for (const p of dbProducts) {
    if (!productMap[p.name]) productMap[p.name] = p._id;
  }

  async function ensureOrderProduct(name, unitPrice) {
    const trimmed = String(name || "").trim() || "Imported";
    if (productMap[trimmed]) return productMap[trimmed];

    const existing = await Product.findOne({ fundraiserId, name: trimmed });
    if (existing) {
      productMap[trimmed] = existing._id;
      return existing._id;
    }

    const price = Math.max(0, Number(unitPrice) || 0);
    const created = await Product.create({
      fundraiserId,
      name: trimmed,
      price,
      isActive: true,
    });
    productMap[trimmed] = created._id;
    stats.details.products.created++;
    stats.products++;
    return created._id;
  }

  for (const o of payload.orders || []) {
    if (options.orders === "skip") continue;

    const rawAddress = String(o.deliveryAddress || "").trim();
    if (!rawAddress) {
      stats.details.orders.skipped++;
      stats.skipped.push(`Order ${o.customerName || "(unknown)"}: missing address`);
      continue;
    }

    const draft = {
      customerEmail: o.customerEmail,
      customerName: o.customerName,
      deliveryAddress: rawAddress,
      coords: o.coords,
      totalBags: o.totalBags,
    };

    if (await isDuplicateOrder(fundraiserId, draft)) {
      stats.details.orders.duplicates++;
      stats.skipped.push(`Order ${o.customerName}: duplicate (same customer, address, bags)`);
      continue;
    }

    let coords;
    let deliveryAddress = rawAddress;
    let addressNeedsReview = false;

    if (o.coords?.lat != null && o.coords?.lon != null) {
      coords = {
        lat: o.coords.lat,
        lon: o.coords.lon,
        display: o.coords.display || rawAddress,
      };
      deliveryAddress = coords.display;
    } else if (options.geocode === false) {
      coords = undefined;
      deliveryAddress = rawAddress;
      addressNeedsReview = true;
    } else {
      const parsed = await geocodeImportAddress(rawAddress, { regionHint: fundraiserRegionHint(fr) });
      if (!parsed.ok) {
        coords = undefined;
        deliveryAddress = rawAddress;
        addressNeedsReview = true;
        stats.details.orders.addressWarnings++;
        const label = o.row ? `Row ${o.row} (${o.customerName})` : `Order ${o.customerName}`;
        stats.warnings.push(`${label}: address not verified — fix before routing (${rawAddress})`);
      } else {
        coords = parsed.coords;
        deliveryAddress = parsed.coords.display;
      }
    }

    let vendorId = null;
    if (o.referralCode && vendorByCode[o.referralCode.toUpperCase()]) {
      vendorId = vendorByCode[o.referralCode.toUpperCase()]._id;
    }

    const items = [];
    for (const item of o.items || []) {
      const productName = String(item.productName || "Imported").trim() || "Imported";
      const productId = await ensureOrderProduct(productName, item.unitPrice);
      items.push({
        productName,
        quantity:    item.quantity || 1,
        unitPrice:   item.unitPrice ?? 0,
        productId,
      });
    }

    if (!items.length) {
      stats.details.orders.skipped++;
      stats.skipped.push(`Order ${o.customerName}: no matching product`);
      continue;
    }

    await Order.create({
      fundraiserId,
      vendorId,
      referralCode: o.referralCode?.trim() ? o.referralCode.trim().toUpperCase() : undefined,
      customerName: o.customerName,
      customerEmail: o.customerEmail?.trim() || undefined,
      customerPhone: o.customerPhone?.trim() || undefined,
      deliveryAddress,
      comments: o.comments,
      coords,
      addressNeedsReview,
      items,
      totalBags: o.totalBags || items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: o.totalAmount || items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      status: normalizeOrderStatus(o.status),
    });
    stats.details.orders.created++;
    stats.orders++;
  }

  for (const d of payload.drivers || []) {
    let code = d.otp?.toUpperCase();
    let route = code ? await DriverRoute.findOne({ fundraiserId, otp: code }) : null;

    if (route) {
      stats.details.drivers.skipped++;
      stats.skipped.push(`Driver ${d.driverName || code}: code already exists, left unchanged`);
      continue;
    }

    let attempts = 0;
    do {
      code = code || genOTP();
      attempts++;
      if (attempts > 25) break;
    } while (await DriverRoute.findOne({ fundraiserId, otp: code }));

    route = await DriverRoute.create({
      fundraiserId,
      otp: code,
      driverName: d.driverName,
      driverPhone: d.driverPhone,
      capacity: d.capacity || 999,
      stops: (d.stops || []).map(s => ({ ...s, status: s.status || "pending" })),
    });
    route.completedStops = route.stops.filter(s => s.status === "delivered").length;
    await route.save();
    stats.details.drivers.created++;
    stats.drivers++;
  }

  return stats;
}
