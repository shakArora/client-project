/**
 * Defines the Mongoose schema for fundraiser products including name, price, description, emoji, image URL, and active flag. Products are scoped to a specific fundraiser.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    fundraiserId: { type: mongoose.Schema.Types.ObjectId, ref: "Fundraiser", required: true },
    name:         { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    price:        { type: Number, required: true, min: 0 },
    emoji:        { type: String, trim: true },
    imageUrl:     { type: String, trim: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
