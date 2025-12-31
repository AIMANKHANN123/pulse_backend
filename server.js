import dotenv from "dotenv";
dotenv.config(); // 👈 THIS LINE IS MUST

import cors from "cors";
import express from "express";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import phase2Routes from "./routes/phase2Routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/analytics", analyticsRoutes);
app.use("/analytics/phase2", phase2Routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
