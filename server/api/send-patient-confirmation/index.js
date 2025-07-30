import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/", async (req, res) => {
  const { name, phone, doctor, date, time, email, clinic } = req.body; // <- include email

  const mailOptions = {
    from: `Clinic Booking <${process.env.EMAIL_USER}>`,
    to: email, // <- send to patient
    subject: "📅 Appointment Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #388e3c; text-align: center;">✅ Appointment Confirmed</h2>
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>

        <p style="font-size: 15px;">Thank you for scheduling a consultation. Here are your appointment details:</p>

        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ccc;"><strong>👨‍⚕️ Doctor:</strong></td>
            <td style="padding: 10px; border: 1px solid #ccc;">${doctor}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ccc;"><strong>🏣 Clinic:</strong></td>
            <td style="padding: 10px; border: 1px solid #ccc;">${clinic}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ccc;"><strong>📆 Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ccc;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ccc;"><strong>⏰ Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ccc;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ccc;"><strong>📞 Phone:</strong></td>
            <td style="padding: 10px; border: 1px solid #ccc;">${phone}</td>
          </tr>
        </table>

        <p style="margin-top: 30px; font-size: 15px;">Please arrive 10 minutes early. If you need to cancel or reschedule, reply to this email.</p>

        <p style="font-size: 14px; color: #555;">— Clinic Admin Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
