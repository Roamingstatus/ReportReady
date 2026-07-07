import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import { securityHeaders } from "./lib/security-headers.js";
import routes from "./routes/index.js";

const app = express();

const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);

app.use(securityHeaders);

app.use(
  cors(
    corsOrigins && corsOrigins.length > 0
      ? { origin: corsOrigins, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: true }
      : { origin: false },
  ),
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", routes);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ ok: false, error: "Invalid request body." });
    return;
  }
  next(err);
});

export default app;
