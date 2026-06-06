import app from "./app.js";
import { env } from "./config/env.js";
import { connectWithRetry } from "./config/db.js";

const PORT = env.port;

// Bind the HTTP server FIRST so Railway's healthcheck at /api/health passes,
// then connect to MongoDB in the background with automatic retries.
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} (${env.nodeEnv})`);
});

server.on("error", (err) => {
  console.error("Server error:", err.message);
  process.exit(1);
});

// Connect to MongoDB — if all retries fail the process exits with code 1
connectWithRetry().catch(() => process.exit(1));
