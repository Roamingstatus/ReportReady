import { Router } from "express";
import analyticsAdminRouter from "./analytics-admin.js";
import analyticsRouter from "./analytics.js";
import feedbackRouter from "./feedback.js";
import healthRouter from "./health.js";
import testEmailRouter from "./test-email.js";

const router = Router();

router.use(healthRouter);
router.use(feedbackRouter);
router.use(testEmailRouter);
router.use(analyticsRouter);
router.use(analyticsAdminRouter);

export default router;
