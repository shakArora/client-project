/**
 * Mongoose schema for single-use, time-limited password reset tokens linked to a user.
 * Stores a hashed token value and auto-expires documents via a TTL index on expiresAt.
 * @author Shivum Arora
 * @date 6/5/2026
 */
import mongoose from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
