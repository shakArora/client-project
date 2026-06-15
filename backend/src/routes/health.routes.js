/**
 * Exposes a simple GET / health check endpoint reporting service status and MongoDB connection state. Used by deployment platforms like Railway for readiness probes.
 * @name Shivum Arora
 * @date 2026-06-06
 */
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", (_req, res) => {
  // mongoose readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
  const db = mongoose.connection.readyState;
  res.status(200).json({
    status: "ok",
    service: "routed-backend",
    db: db === 1 ? "connected" : db === 2 ? "connecting" : "disconnected",
    time: new Date().toISOString(),
  });
});

export default router;
