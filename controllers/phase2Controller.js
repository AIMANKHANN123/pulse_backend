import { computePhase2Metrics } from "../phase2Worker.js";

/**
 * Dashboard Metrics (ADMIN / MANAGER / EMPLOYEE)
 * GET /analytics/phase2/dashboard/:role
 */
export const getPredictiveMetrics = async (req, res) => {
  try {
    const role = req.params.role;
    const company_id = Number(req.query.company_id);
    const user_id = Number(req.query.user_id);

    if (!role || !company_id) {
      return res.status(400).json({
        success: false,
        message: "role and company_id are required",
      });
    }

    const data = await computePhase2Metrics({
      role,
      company_id,
      user_id,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Dashboard metrics failed",
    });
  }
};
