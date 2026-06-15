/**
 * Loads dotenv and exports a typed configuration object for port, database, JWT, Google OAuth, SMTP, Twilio, and frontend URL settings. Centralizes all backend environment variable defaults and parsing.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminGoogleWhitelist: (process.env.ADMIN_GOOGLE_WHITELIST || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES || 15),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "Routed <no-reply@routed.com>",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
};
