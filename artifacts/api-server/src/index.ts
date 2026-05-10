import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Warm the connection pool immediately after startup so the first real
  // request doesn't pay the SSL handshake cost. Fire-and-forget — a failure
  // here is non-fatal (the pool will reconnect on the first request).
  pool.query("SELECT 1").then(() => {
    logger.info("DB pool warmed");
  }).catch((err: unknown) => {
    logger.warn({ err }, "DB pool warm-up failed — will retry on first request");
  });
});
