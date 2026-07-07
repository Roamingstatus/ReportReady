import type { Request, Response, NextFunction } from "express";
import { verifyBreakroomCsrf, requireBreakroomGuest } from "./breakroom-session.js";

export function requireBreakroomCsrf(req: Request, res: Response, next: NextFunction): void {
  if (verifyBreakroomCsrf(req)) {
    next();
    return;
  }
  res.status(403).json({ ok: false, error: "Invalid security token." });
}

export function requireBreakroomAuth(req: Request, res: Response, next: NextFunction): void {
  if (requireBreakroomGuest(req)) {
    next();
    return;
  }
  res.status(401).json({ ok: false, error: "You are not allowed to edit this." });
}
