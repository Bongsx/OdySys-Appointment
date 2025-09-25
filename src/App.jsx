import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./assets/components/Login";
import ProtectedRoute from "./assets/components/ProtectedRoute";
import Dashboard from "./assets/pages/Dashboard";
import PatientBooking from "./assets/components/PatientBooking";
import LaboratoryExams from "./assets/components/LaboratoryExams";
import Signup from "./assets/components/SignUp";
import FeedBack from "./assets/components/FeedBack";
import ResetPassword from "./assets/components/ResetPassword";
import ForgotPassword from "./assets/components/ForgotPassowrd";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />{" "}
        {/* Changed to lowercase for consistency */}
        <Route path="/forgot-password" element={<ForgotPassword />} />{" "}
        {/* Changed to kebab-case */}
        <Route path="/reset-password" element={<ResetPassword />} />{" "}
        {/* Removed ProtectedRoute wrapper */}
        {/* Protected routes - authentication required */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-booking"
          element={
            <ProtectedRoute>
              <PatientBooking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laboratory-exams"
          element={
            <ProtectedRoute>
              <LaboratoryExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <FeedBack />
            </ProtectedRoute>
          }
        />
        {/* Catch-all route for 404 - optional but recommended */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600">
                  The page you're looking for doesn't exist.
                </p>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
