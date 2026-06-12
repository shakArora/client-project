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
