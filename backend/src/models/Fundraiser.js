/**
 * Mongoose schema for a fundraiser campaign with slug, dates, location, contact, payment, and delivery settings.
 * Captures pickup/delivery hub coordinates, cover image, active flag, and the administering user reference.
 * @author Shivum Arora
 * @date 6/11/2026
 */
import mongoose from "mongoose";

const fundraiserSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true }, // globally unique for public URLs
    description: { type: String, trim: true },
    adminId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: {
      city:  { type: String, trim: true },
      state: { type: String, trim: true },
    },
    pickupAddress: { type: String, trim: true },
    pickupCoords:  { lat: Number, lon: Number, display: String },
    deliveryHubAddress: { type: String, trim: true },
    deliveryHubCoords:  { lat: Number, lon: Number, display: String },
    // Contact info shown on customer page
    contactName:  { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    // Delivery instructions shown at checkout
    deliveryNotes: { type: String, trim: true },
    // Where customer payments go (shown at checkout)
    paymentMethod:      { type: String, trim: true }, // Venmo, Zelle, PayPal, Check, Cash, Other
    paymentDestination: { type: String, trim: true }, // @handle, email, link, or payee name
    paymentNotes:       { type: String, trim: true },
    coverImageUrl: { type: String, trim: true },
    startDate:    { type: Date },
    endDate:      { type: Date },
    deliveryDate: { type: Date },
    isActive:     { type: Boolean, default: false },
    // Denormalised counters
    soldBags:     { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    vendorCount:  { type: Number, default: 0, min: 0 },
    orderCount:   { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const Fundraiser = mongoose.model("Fundraiser", fundraiserSchema);
