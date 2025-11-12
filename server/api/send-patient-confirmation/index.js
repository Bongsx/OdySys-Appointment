import express from "express";
import Mailjet from "node-mailjet";

const router = express.Router();

// Initialize Mailjet client
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

router.post("/", async (req, res) => {
  const { name, contactNumber, doctor, date, time, email, clinic } = req.body;

  if (!email || !name || !doctor || !date || !time || !clinic) {
    return res.status(400).json({
      error: "Missing required fields",
      received: {
        name: !!name,
        email: !!email,
        doctor: !!doctor,
        date: !!date,
        time: !!time,
        clinic: !!clinic,
      },
    });
  }

  try {
    const request = await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL,
            Name: "Clinic Booking",
          },
          To: [
            {
              Email: email,
              Name: name,
            },
          ],
          Subject: "📅 Appointment Confirmation",
          HTMLPart: `
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
                    <td style="padding: 10px; border: 1px solid #ccc;">${contactNumber}</td>
                  </tr>
                </table>

                <p style="margin-top: 30px; font-size: 15px;">Please arrive 10 minutes early. If you need to cancel or reschedule, reply to this email.</p>

                <p style="font-size: 14px; color: #555;">— Clinic Admin Team</p>
              </div>
            `,
          TextPart: `
              ✅ Appointment Confirmed

              Dear ${name},

              Thank you for scheduling a consultation. Here are your appointment details:

              Doctor: ${doctor}
              Clinic: ${clinic}
              Date: ${date}
              Time: ${time}
              Phone: ${contactNumber}

              Please arrive 10 minutes early. If you need to cancel or reschedule, reply to this email.

              — Clinic Admin Team
            `,
        },
      ],
    });

    console.log("Email sent successfully:", request.body);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    res
      .status(500)
      .json({ error: "Failed to send email", details: err.message });
  }
});

export default router;
