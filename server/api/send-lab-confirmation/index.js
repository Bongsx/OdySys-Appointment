import express from "express";
import Mailjet from "node-mailjet";

const router = express.Router();

// Initialize Mailjet client
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const generateAppointmentEmail = ({
  patientName,
  labTestName,
  slotNumber,
  estimatedTime,
  email,
  referDoctor,
  clinic,
  addressLine,
}) => ({
  From: {
    Email: process.env.MAILJET_SENDER_EMAIL,
    Name: "Lab Clinic",
  },
  To: [
    {
      Email: email,
      Name: patientName,
    },
  ],
  Subject: "🧪 Lab Appointment Confirmation",
  HTMLPart: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
      <h2 style="color: #d32f2f; text-align: center;">🧬 Lab Appointment Confirmed</h2>
      <p style="font-size: 16px;">Hello <strong>${patientName}</strong>,</p>

      <p style="font-size: 15px;">Thank you for booking your lab exam with us. Here are your appointment details:</p>

      <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>🧪 Exam Type:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${labTestName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>🏥 Clinic:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${clinic}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>📍 Address:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${addressLine}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>🔢 Ticket Slot Number:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${slotNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>⏰ Estimated Time:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${estimatedTime}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc;"><strong>👨‍⚕️ Referred By:</strong></td>
          <td style="padding: 10px; border: 1px solid #ccc;">${
            referDoctor || "None"
          }</td>
        </tr>
      </table>

      <p style="margin-top: 30px; font-size: 15px;">Please arrive 10 minutes before your slot. If you have questions, reply to this email or contact our support team.</p>

      <p style="font-size: 14px; color: #555;">— Lab Clinic Team</p>
    </div>
  `,
  TextPart: `
    🧬 Lab Appointment Confirmed

    Hello ${patientName},

    Thank you for booking your lab exam with us. Here are your appointment details:

    Exam Type: ${labTestName}
    Clinic: ${clinic}
    Address: ${addressLine}
    Ticket Slot Number: ${slotNumber}
    Estimated Time: ${estimatedTime}
    Referred By: ${referDoctor || "None"}

    Please arrive 10 minutes before your slot. If you have questions, reply to this email or contact our support team.

    — Lab Clinic Team
  `,
});

router.post("/", async (req, res) => {
  try {
    const emailContent = generateAppointmentEmail(req.body);

    const request = await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [emailContent],
    });

    console.log("Email sent successfully:", request.body);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    res
      .status(500)
      .json({
        error: "Failed to send confirmation email",
        details: err.message,
      });
  }
});

export default router;
