/**
 * Mongoose schema for a sellable product belonging to a fundraiser.
 * Includes name, description, price, optional emoji/image, and an isActive flag for catalog visibility.
 * @author Shivum Arora
 * @date 6/5/2026
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
