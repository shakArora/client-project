import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { env } from "../config/env.js";
import { ROLES, User } from "../models/User.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { signAuthToken, generateResetToken } from "../utils/auth.js";
import { sendPasswordResetNotification } from "../utils/notify.js";

const router = express.Router();
const googleClient = new OAuth2Client(env.googleClientId);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([ROLES.ADMIN, ROLES.VENDOR, ROLES.DRIVER]).default(ROLES.VENDOR),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  // eslint-disable-next-line no-console
  console.log("[register] body received:", JSON.stringify(req.body));
  try {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role,
    });

    const token = signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid registration payload", issues: error.issues });
    }
    return res.status(500).json({ message: "Unable to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid login payload", issues: error.issues });
    }
    return res.status(500).json({ message: "Unable to login" });
  }
});

router.post("/google/admin", async (req, res) => {
  const schema = z.object({ idToken: z.string().min(20) });
  try {
    const body = schema.parse(req.body);
    if (!env.googleClientId) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured" });
    }
    if (!env.adminGoogleWhitelist.length) {
      return res.status(500).json({ message: "ADMIN_GOOGLE_WHITELIST is empty" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: body.idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const googleSub = payload?.sub;
    const name = payload?.name || "Administrator";

    if (!email || !googleSub) {
      return res.status(401).json({ message: "Invalid Google token payload" });
    }
    if (!env.adminGoogleWhitelist.includes(email)) {
      return res.status(403).json({ message: "Google account is not admin-whitelisted" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, googleSub, role: ROLES.ADMIN });
    } else {
      user.googleSub = googleSub;
      user.role = ROLES.ADMIN;
      await user.save();
    }

    const token = signAuthToken({ sub: user._id.toString(), role: user.role, email: user.email });
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid Google login payload", issues: error.issues });
    }
    return res.status(401).json({ message: "Google login failed", error: error.message });
  }
});

router.post("/password-reset/request", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    channel: z.enum(["email", "sms"]).default("email"),
    phone: z.string().optional(),
  });
  try {
    const body = schema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) {
      return res.json({ message: "If account exists, reset instructions are generated" });
    }

    const { rawToken, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + env.resetTokenTtlMinutes * 60 * 1000);

    await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });
    const resetLink = `${env.frontendUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetNotification({
      channel: body.channel,
      toEmail: user.email,
      toPhone: body.phone,
      resetLink,
      expiresAt,
    });

    return res.json({
      message: "If account exists, reset instructions were sent",
      channel: body.channel,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid reset request payload", issues: error.issues });
    }
    return res.status(500).json({ message: "Could not create password reset request" });
  }
});

router.post("/password-reset/confirm", async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(6),
  });

  try {
    const body = schema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");
    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findById(resetRecord.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found for reset token" });
    }

    user.passwordHash = await bcrypt.hash(body.newPassword, 10);
    await user.save();

    resetRecord.consumedAt = new Date();
    await resetRecord.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid reset confirm payload", issues: error.issues });
    }
    return res.status(500).json({ message: "Could not reset password" });
  }
});

export default router;
