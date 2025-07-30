// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PatientBooking from "../components/PatientBooking";
import LaboratoryExams from "../components/LaboratoryExams";
import { CalendarDays, FlaskConical, Users, TestTube } from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState("booking");

  // Mock data - replace with actual API calls
  const [statistics, setStatistics] = useState({
    totalLabTests: 1245,
    totalSpecialistBookings: 856,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) navigate("/");

    // Fetch statistics here if needed
    // fetchStatistics();
  }, []);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-100">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
          Laboratory Management System
        </h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Total Laboratory Tests
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {statistics.totalLabTests.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <TestTube className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Total Specialist Bookings
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {statistics.totalSpecialistBookings.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
