import express from "express";
import { getPredictiveMetrics } from "../controllers/phase2Controller.js";

const router = express.Router();

// DASHBOARD API
router.get("/dashboard/:role", getPredictiveMetrics);

export default router;
