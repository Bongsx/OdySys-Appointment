import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Import routers
import sendLabConfirmation from "./api/send-lab-confirmation/index.js";
import sendPatientConfirmation from "./api/send-patient-confirmation/index.js";
import sendWelcomeEmail from "./api/send-welcome-email/index.js";
import sendPasswordReset from "./api/send-password-reset/index.js";

dotenv.config();

const app = express();

// Allowed origins
const allowedOrigins = [
  "https://odysys.netlify.app",
  "https://odysys-appointment.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running properly",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Helper to safely mount routers
const mountRouter = (path, router) => {
  if (!router) {
    console.error(`❌ Router not found for path: ${path}`);
  } else if (!router.stack) {
    console.error(`❌ Invalid router exported at path: ${path}`);
  } else {
    app.use(path, router);
    console.log(`✅ Mounted router at ${path}`);
  }
};

// Mount routes safely
mountRouter("/api/send-lab-confirmation", sendLabConfirmation);
mountRouter("/api/send-patient-confirmation", sendPatientConfirmation);
mountRouter("/api/send-welcome-email", sendWelcomeEmail);
mountRouter("/api/send-password-reset", sendPasswordReset);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: [
      "/api/send-lab-confirmation",
      "/api/send-patient-confirmation",
      "/api/send-welcome-email",
      "/api/send-password-reset",
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════");
  console.log("📧 Email Service API Server");
  console.log("═══════════════════════════════════════");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ Allowed origins:`, allowedOrigins);
  console.log("═══════════════════════════════════════");
});
