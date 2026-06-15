import mongoose from "mongoose";

const stopSchema = new mongoose.Schema(
  {
    orderId:         { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    customerName:    { type: String, required: true, trim: true },
    deliveryAddress: { type: String, required: true, trim: true },
    bags:            { type: Number, required: true, min: 1 },
    comment:         { type: String, trim: true },
    status:          { type: String, enum: ["pending", "delivered"], default: "pending" },
    deliveredAt:     { type: Date },
  },
  { _id: false },
);

const driverRouteSchema = new mongoose.Schema(
  {
    fundraiserId:    { type: mongoose.Schema.Types.ObjectId, ref: "Fundraiser", required: true },
    otp:             { type: String, required: true, trim: true, uppercase: true },
    driverName:      { type: String, trim: true },
    driverPhone:     { type: String, trim: true },
    capacity:        { type: Number, default: 999, min: 1 },
    stops:           { type: [stopSchema], default: [] },
    completedStops:  { type: Number, default: 0, min: 0 },
    startedAt:       { type: Date },
    completedAt:     { type: Date },
  },
  { timestamps: true },
);

// OTP must be unique within a fundraiser
driverRouteSchema.index({ fundraiserId: 1, otp: 1 }, { unique: true });

driverRouteSchema.virtual("totalStops").get(function () {
  return this.stops.length;
});

driverRouteSchema.virtual("progress").get(function () {
  const total = this.stops.length;
  if (!total) return 0;
  return Math.round((this.completedStops / total) * 100);
});

driverRouteSchema.set("toJSON",   { virtuals: true });
driverRouteSchema.set("toObject", { virtuals: true });

export const DriverRoute = mongoose.model("DriverRoute", driverRouteSchema);
