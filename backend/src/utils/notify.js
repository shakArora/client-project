import nodemailer from "nodemailer";
import twilio from "twilio";
import { env } from "../config/env.js";

function emailEnabled() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

function smsEnabled() {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioPhoneNumber);
}

export async function sendPasswordResetNotification({
  channel,
  toEmail,
  toPhone,
  resetLink,
  expiresAt,
}) {
  const expires = new Date(expiresAt).toLocaleString();

  if (channel === "sms" && toPhone && smsEnabled()) {
    const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    await client.messages.create({
      from: env.twilioPhoneNumber,
      to: toPhone,
      body: `Routed password reset link (expires ${expires}): ${resetLink}`,
    });
    return;
  }

  if (emailEnabled()) {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });

    await transporter.sendMail({
      from: env.smtpFrom,
      to: toEmail,
      subject: "Routed password reset instructions",
      text: `Use this secure link to reset your password (expires ${expires}): ${resetLink}`,
    });
    return;
  }

  // Fallback for local development when no provider is configured.
  // eslint-disable-next-line no-console
  console.log(`[password-reset:${channel}]`, { toEmail, toPhone, resetLink, expires });
}
