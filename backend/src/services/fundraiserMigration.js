import bcrypt from "bcryptjs";
import { Fundraiser } from "../models/Fundraiser.js";
import { Product } from "../models/Product.js";
import { Vendor } from "../models/Vendor.js";
import { Order } from "../models/Order.js";
import { DriverRoute } from "../models/DriverRoute.js";
import { User, ROLES } from "../models/User.js";
import { geocodeAddress } from "../utils/geocode.js";

const EXPORT_VERSION = 1;

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

export async function importFundraiser(fundraiserId, adminId, payload) {
  const fr = await Fundraiser.findOne({ _id: fundraiserId, adminId });
  if (!fr) throw new Error("Fundraiser not found");

  const stats = { products: 0, vendors: 0, orders: 0, drivers: 0, skipped: [] };

  if (payload.fundraiser) {
    const allowed = [
      "title", "description", "location", "pickupAddress", "pickupCoords",
      "deliveryHubAddress", "deliveryHubCoords", "contactName", "contactEmail",
      "contactPhone", "deliveryNotes", "coverImageUrl", "startDate", "endDate", "deliveryDate",
    ];
    for (const key of allowed) {
      if (payload.fundraiser[key] !== undefined) fr[key] = payload.fundraiser[key];
    }
    await fr.save();
  }

  const productMap = {};
  for (const p of payload.products || []) {
    const existing = await Product.findOne({ fundraiserId, name: p.name });
    if (existing) {
      Object.assign(existing, { description: p.description, price: p.price, emoji: p.emoji, imageUrl: p.imageUrl, isActive: p.isActive ?? true });
      await existing.save();
      productMap[p.name] = existing._id;
    } else {
      const created = await Product.create({ ...p, fundraiserId });
      productMap[p.name] = created._id;
    }
    stats.products++;
  }

  const vendorByCode = {};
  for (const v of payload.vendors || []) {
    const code = await genReferralCode(fundraiserId, v.referralCode);
    let user = await User.findOne({ email: v.email?.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: v.name,
        email: v.email.toLowerCase(),
        passwordHash: await bcrypt.hash("vendor", 10),
        role: ROLES.VENDOR,
      });
    }
    let vendor = await Vendor.findOne({ fundraiserId, email: v.email?.toLowerCase() });
    if (!vendor) {
      vendor = await Vendor.create({
        userId: user._id,
        fundraiserId,
        name: v.name,
        email: v.email.toLowerCase(),
        referralCode: code,
        bagsSold: v.bagsSold || 0,
        totalRevenue: v.totalRevenue || 0,
        orderCount: v.orderCount || 0,
        revenueGoal: v.revenueGoal || 0,
        isActive: v.isActive ?? true,
      });
      await Fundraiser.findByIdAndUpdate(fundraiserId, { $inc: { vendorCount: 1 } });
    }
    vendorByCode[code] = vendor;
    if (v.referralCode) vendorByCode[v.referralCode.toUpperCase()] = vendor;
    stats.vendors++;
  }

  let defaultProduct = await Product.findOne({ fundraiserId });
  if (!defaultProduct && (payload.orders || []).length) {
    defaultProduct = await Product.create({ fundraiserId, name: "Imported Item", price: 0, isActive: true });
    productMap["Imported"] = defaultProduct._id;
    productMap["Imported Item"] = defaultProduct._id;
  }

  for (const o of payload.orders || []) {
    let coords = o.coords;
    if (!coords?.lat && o.deliveryAddress) {
      coords = await geocodeAddress(o.deliveryAddress);
      if (!coords) {
        stats.skipped.push(`Order ${o.customerName}: invalid address`);
        continue;
      }
    }
    let vendorId = null;
    if (o.referralCode && vendorByCode[o.referralCode.toUpperCase()]) {
      vendorId = vendorByCode[o.referralCode.toUpperCase()]._id;
    }
    const items = (o.items || []).map(item => ({
      productName: item.productName || "Imported",
      quantity:    item.quantity || 1,
      unitPrice:   item.unitPrice ?? 0,
      productId:   productMap[item.productName] || defaultProduct?._id,
    })).filter(item => item.productId);
    if (!items.length) {
      stats.skipped.push(`Order ${o.customerName}: no matching product`);
      continue;
    }
    await Order.create({
      fundraiserId,
      vendorId,
      referralCode: o.referralCode,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      deliveryAddress: coords?.display || o.deliveryAddress,
      comments: o.comments,
      coords,
      items,
      totalBags: o.totalBags || items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: o.totalAmount || items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      status: o.status || "pending",
    });
    stats.orders++;
  }

  for (const d of payload.drivers || []) {
    let code = d.otp?.toUpperCase();
    let route = code ? await DriverRoute.findOne({ fundraiserId, otp: code }) : null;
    if (!route) {
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
        stops: [],
      });
    }
    if (d.stops?.length) {
      route.stops = d.stops.map(s => ({ ...s, status: s.status || "pending" }));
      route.completedStops = route.stops.filter(s => s.status === "delivered").length;
      await route.save();
    }
    stats.drivers++;
  }

  return stats;
}
