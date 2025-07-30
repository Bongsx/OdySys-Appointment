import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sendLabConfirmation from "./api/send-lab-confirmation/index.js";
import sendPatientConfirmation from "./api/send-patient-confirmation/index.js";     

dotenv.config();
const app = express();
app.use(cors());                
app.use(express.json());

app.use("/api/send-lab-confirmation", sendLabConfirmation);
app.use("/api/send-patient-confirmation", sendPatientConfirmation);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
