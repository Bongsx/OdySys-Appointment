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

const generateWelcomeEmail = ({
  firstName,
  lastName,
  email,
  phone,
  password,
  createdAt,
}) => {
  return {
    from: `Clinic System <${EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome! Your Account Has Been Created",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981, #3b82f6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">🎉</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Welcome to Our Clinic!</h1>
        </div>

        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Hello <strong>${firstName} ${lastName}</strong>,
        </p>

        <p style="font-size: 15px; color: #6b7280; margin-bottom: 30px;">
          Your account has been successfully created! Below are your login credentials and account details:
        </p>

        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 18px;">📋 Account Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #374151; width: 30%;">👤 Name:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #374151;">📧 Email:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #374151;">📞 Phone:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #374151;">🔑 Password:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #dc2626; font-family: 'Courier New', monospace; background: #fef2f2; padding: 8px; border-radius: 4px;">${password}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: 600; color: #374151;">📅 Created:</td>
              <td style="padding: 12px 0; color: #6b7280;">${new Date(
                createdAt
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</td>
            </tr>
          </table>
        </div>

        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;">🔒 Important Security Notice</h3>
          <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
            For your security, we recommend changing your password after your first login. You can do this in your account settings.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="http://localhost:3000/login" style="display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Sign In to Your Account
          </a>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h4 style="color: #374151; margin-top: 0; margin-bottom: 8px; font-size: 14px;">Next Steps:</h4>
          <ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px;">
            <li>Sign in using your email and password</li>
            <li>Complete your profile information</li>
            <li>Schedule your appointments</li>
            <li>Access lab results and medical records</li>
          </ul>
        </div>

        <hr style="border: 0; height: 1px; background: #e5e7eb; margin: 30px 0;">

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
          If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:${EMAIL_USER}" style="color: #3b82f6;">${EMAIL_USER}</a>
        </p>

        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0;">
          Best regards,<br>
          <strong>The Clinic Team</strong>
        </p>
      </div>
    `,
  };
};

router.post("/", async (req, res) => {
  try {
    const emailContent = generateWelcomeEmail(req.body);
    await transporter.sendMail(emailContent);
    res.status(200).json({ message: "Welcome email sent successfully" });
  } catch (err) {
    console.error("Welcome email send error:", err);
    res.status(500).json({ error: "Failed to send welcome email" });
  }
});

export default router;
