import express from "express";
import { getAnalyticsMetrics } from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/metrics", getAnalyticsMetrics);

export default router;
