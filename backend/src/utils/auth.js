/**
 * JWT helpers for signing and verifying auth tokens used across protected API routes.
 * Also generates hashed password-reset tokens pairing a raw client token with a stored SHA-256 hash.
 * @author Shivum Arora
 * @date 6/5/2026
 */
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export function signAuthToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}
