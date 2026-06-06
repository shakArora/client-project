import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

async function startServer() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
