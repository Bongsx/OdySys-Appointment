import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendLabConfirmation from "./api/send-lab-confirmation/index.js";
import sendPatientConfirmation from "./api/send-patient-confirmation/index.js";
import sendWelcomeEmail from "./api/send-welcome-email/index.js";
import sendPasswordReset from "./api/send-password-reset/index.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/send-lab-confirmation", sendLabConfirmation);
app.use("/api/send-patient-confirmation", sendPatientConfirmation);
app.use("/api/send-welcome-email", sendWelcomeEmail);
app.use("/api/send-password-reset", sendPasswordReset);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
