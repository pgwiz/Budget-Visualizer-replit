import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import session from "express-session";
import type { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoMiddleware = (pinoHttp as any)({
  logger,
  serializers: {
    req(req: IncomingMessage & { id?: unknown }) {
      return {
        id: req.id,
        method: req.method,
        url: req.url?.split("?")[0],
      };
    },
    res(res: ServerResponse) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

app.use(pinoMiddleware);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

app.use("/api", router);

// Serve budget-monitor frontend from dist
// __dirname points to /app/artifacts/api-server/dist in production
// So ../../budget-monitor/dist/public is /app/artifacts/budget-monitor/dist/public
const distDir = path.resolve(__dirname, "../../budget-monitor/dist/public");
app.use(express.static(distDir, { maxAge: "1d" }));

// SPA fallback: serve index.html for client-side routing
app.get("*", (req, res) => {
  const indexPath = path.join(distDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error({ err }, "Failed to serve index.html");
      res.status(500).send("Internal Server Error");
    }
  });
});

export default app;
