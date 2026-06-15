/**
 * Lightweight health-check endpoint reporting API status, service name, and MongoDB connection state.
 * Used by deploy monitors and load balancers to verify the backend process and database are reachable.
 * @author Shivum Arora
 * @date 6/6/2026
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
