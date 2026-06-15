/**
 * Defines the Mongoose schema for application users with email, password hash, Google sub, phone, and role enum. Exports ROLES constants for administrator, vendor, and driver.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import mongoose from "mongoose";

export const ROLES = {
  ADMIN:  "administrator",
  VENDOR: "vendor",
  DRIVER: "driver",
};

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleSub:    { type: String },
    phone:        { type: String, trim: true },
    role: {
      type:    String,
      enum:    Object.values(ROLES),
      default: ROLES.VENDOR,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
