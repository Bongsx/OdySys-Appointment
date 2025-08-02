// File: api/send-password-reset/index.js
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const { EMAIL_USER, EMAIL_PASS } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  throw new Error("Missing email configuration in environment variables");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const generatePasswordResetEmail = ({ email, resetLink, userName }) => {
  return {
    from: `Clinic System <${EMAIL_USER}>`,
    to: email,
    subject: "🔐 Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">🔐</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Password Reset Request</h1>
        </div>

        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Hello ${userName ? `<strong>${userName}</strong>` : "there"},
        </p>

        <p style="font-size: 15px; color: #6b7280; margin-bottom: 30px;">
          We received a request to reset your password for your clinic account. If you didn't make this request, you can safely ignore this email.
        </p>

        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;">⚠️ Security Notice</h3>
          <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
            This password reset link will expire in 1 hour for your security. If you didn't request this reset, please contact our support team immediately.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${
            resetLink || "#"
          }" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset My Password
          </a>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h4 style="color: #374151; margin-top: 0; margin-bottom: 8px; font-size: 14px;">If the button doesn't work:</h4>
          <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all;">
            Copy and paste this link in your browser: <br>
            <a href="${resetLink || "#"}" style="color: #3b82f6;">${
      resetLink || "Reset link will be provided"
    }</a>
          </p>
        </div>

        <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h4 style="color: #991b1b; margin-top: 0; margin-bottom: 8px; font-size: 14px;">🛡️ Security Tips:</h4>
          <ul style="color: #991b1b; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication if available</li>
            <li>Log out from shared computers</li>
          </ul>
        </div>

        <hr style="border: 0; height: 1px; background: #e5e7eb; margin: 30px 0;">

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
          If you have any questions or need assistance, please contact our support team at <a href="mailto:${EMAIL_USER}" style="color: #3b82f6;">${EMAIL_USER}</a>
        </p>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 20px 0 0 0;">
          This email was sent to ${email}. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>

        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 20px 0 0 0;">
          Best regards,<br>
          <strong>The Clinic Security Team</strong>
        </p>
      </div>
    `,
  };
};

router.post("/", async (req, res) => {
  try {
    const emailContent = generatePasswordResetEmail(req.body);
    await transporter.sendMail(emailContent);
    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (err) {
    console.error("Password reset email send error:", err);
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

export default router;
