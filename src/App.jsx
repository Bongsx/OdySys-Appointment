import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./assets/components/Login";
import ProtectedRoute from "./assets/components/ProtectedRoute";
import Dashboard from "./assets/pages/Dashboard";
import PatientBooking from "./assets/components/Patient Consult/PatientBooking";
import LaboratoryExams from "./assets/components/Laboratory/LaboratoryExams";
import FeedBack from "./assets/components/FeedBack";
import Signup from "./assets/components/Signup";
import ResetPassword from "./assets/components/ResetPassword";
import ForgotPassword from "./assets/components/ForgotPassowrd";
import PatientReferral from "./assets/components/PatientReferral";
import PatientTeleconsultation from "./assets/components/PatientTeleconsultation";
import PatientLaboratory from "./assets/components/PatientLaboratory";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />{" "}
        <Route path="/forgot-password" element={<ForgotPassword />} />{" "}
        <Route path="/reset-password" element={<ResetPassword />} />{" "}
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
        <Route
          path="/PatientReferral"
          element={
            <ProtectedRoute>
              <PatientReferral />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PatientTeleconsultation"
          element={
            <ProtectedRoute>
              <PatientTeleconsultation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PatientLaboratory"
          element={
            <ProtectedRoute>
              <PatientLaboratory />
            </ProtectedRoute>
          }
        />
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
