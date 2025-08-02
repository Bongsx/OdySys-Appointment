import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./assets/components/Login";
import ProtectedRoute from "./assets/components/ProtectedRoute";

import Dashboard from "./assets/pages/Dashboard";
import PatientBooking from "./assets/components/PatientBooking";
import LaboratoryExams from "./assets/components/LaboratoryExams";
import AdminLabAppointments from "./assets/components/AdminLab";
import Booking from "./assets/components/AdminConsult";
import Signup from "./assets/components/SignUp";
import ForgotPassword from "./assets/components/ForgotPassowrd";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PatientBooking"
          element={
            <ProtectedRoute>
              <PatientBooking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/LaboratoryExams"
          element={
            <ProtectedRoute>
              <LaboratoryExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/AdminLabAppointments"
          element={
            <ProtectedRoute>
              <AdminLabAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
