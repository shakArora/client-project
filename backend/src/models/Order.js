/**
 * Defines the Mongoose schema for customer orders with line items, delivery address, geocoordinates, referral codes, and status workflow. Tracks bags sold and order totals linked to fundraisers and vendors.
 * @name Shivum Arora
 * @date 2026-06-15
 */
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    fundraiserId:    { type: mongoose.Schema.Types.ObjectId, ref: "Fundraiser", required: true },
    vendorId:        { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    referralCode:    { type: String, trim: true, uppercase: true },
    customerName:    { type: String, required: true, trim: true },
    customerEmail:   { type: String, trim: true, lowercase: true },
    deliveryAddress: { type: String, required: true, trim: true },
    customerPhone:   { type: String, trim: true },
    comments:        { type: String, trim: true },
    coords:          { lat: Number, lon: Number, display: String },
    addressNeedsReview: { type: Boolean, default: false },
    items:           { type: [orderItemSchema], required: true },
    totalBags:       { type: Number, default: 0, min: 0 },
    totalAmount:     { type: Number, default: 0, min: 0 },
    status: {
      type:    String,
      enum:    ["pending", "paid", "fulfilled", "delivered", "refunded", "cancelled"],
      default: "pending",
    },
    paymentIntentId: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
