import mongoose from "mongoose";

const fundraiserSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    adminId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: {
      city:  { type: String, trim: true },
      state: { type: String, trim: true },
    },
    startDate:    { type: Date },
    endDate:      { type: Date },
    deliveryDate: { type: Date },
    isActive:     { type: Boolean, default: false },
    // Denormalised counters – incremented on order creation
    soldBags:    { type: Number, default: 0, min: 0 },
    totalRevenue:{ type: Number, default: 0, min: 0 },
    vendorCount: { type: Number, default: 0, min: 0 },
    orderCount:  { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Mongoose 9: use async pre("validate") — runs before required-field check, no next() needed
fundraiserSchema.pre("validate", async function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

export const Fundraiser = mongoose.model("Fundraiser", fundraiserSchema);
