// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import {
  Calendar,
  Clock,
  FileText,
  Activity,
  Bell,
  User,
  Loader,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState("booking");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]);

  // Dynamic patient data based on appointments
  const [patientData, setPatientData] = useState({
    upcomingAppointments: 0,
    pendingResults: 0,
    completedTests: 0,
    totalVisits: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(userData);

    // Fetch all appointment data
    fetchAllAppointmentData(userData);
  }, [navigate]);

  const fetchAllAppointmentData = (userData) => {
    setLoading(true);

    const userEmail = userData.email;
    const userId = userData.userId || userData.uid;

    // Fetch all appointments sections
    const appointmentsRef = ref(database, "appointments");

    onValue(
      appointmentsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userAppointments = [];

          // Process walk-in appointments
          if (data.appointments) {
            Object.keys(data.appointments).forEach((key) => {
              const appointment = data.appointments[key];
              if (
                appointment.createdBy?.email === userEmail ||
                appointment.patientId === userId
              ) {
                userAppointments.push({
                  id: key,
                  type: "walk_in",
                  ...appointment,
                  testName: appointment.service?.name,
                  doctor: "Laboratory Staff",
                  scheduledDateTime: appointment.scheduledDate,
                });
              }
            });
          }

          // Process consultation appointments
          if (data.consultations) {
            Object.keys(data.consultations).forEach((key) => {
              const consultation = data.consultations[key];
              if (consultation.patient?.email === userEmail) {
                userAppointments.push({
                  id: key,
                  type: "consultation",
                  ...consultation,
                  testName: consultation.type,
                  doctor: consultation.doctor,
                  patientName: `${
                    consultation.patient.patientFirstName ||
                    consultation.patient.firstName
                  } ${
                    consultation.patient.patientLastName ||
                    consultation.patient.lastName
                  }`,
                  scheduledDateTime: `${
                    consultation.appointmentDate
                  }T${convertTo24Hour(consultation.appointmentTime)}`,
                  email: consultation.patient.email,
                });
              }
            });
          }

          // Process laboratory appointments
          if (data.laboratory) {
            Object.keys(data.laboratory).forEach((key) => {
              const labTest = data.laboratory[key];
              if (labTest.email === userEmail || labTest.userId === userId) {
                userAppointments.push({
                  id: key,
                  type: "laboratory",
                  ...labTest,
                  testName: labTest.labTestName,
                  doctor: labTest.referDoctor,
                  patientName: labTest.patientName,
                  scheduledDateTime: `${
                    labTest.createdAt.date
                  }T${convertTo24Hour(labTest.estimatedTime)}`,
                });
              }
            });
          }

          setAllAppointments(userAppointments);
          calculatePatientStats(userAppointments);
          generateRecentActivity(userAppointments);
        } else {
          setAllAppointments([]);
          setPatientData({
            upcomingAppointments: 0,
            pendingResults: 0,
            completedTests: 0,
            totalVisits: 0,
          });
          setRecentActivity([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      }
    );
  };

  // Helper function to convert time to 24-hour format
  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "00:00";

    // Handle already 24-hour format or ranges like "8:00AM - 9:00AM"
    if (timeStr.includes("-")) {
      timeStr = timeStr.split("-")[0].trim();
    }

    const time = timeStr.toLowerCase().replace(/\s/g, "");

    if (time.includes("am") || time.includes("pm")) {
      const [timePart] = time.split(/[ap]m/);
      let [hours, minutes = "00"] = timePart.split(":");

      hours = parseInt(hours);

      if (time.includes("pm") && hours !== 12) {
        hours += 12;
      } else if (time.includes("am") && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    }

    return timeStr.includes(":") ? timeStr : "00:00";
  };

  const calculatePatientStats = (appointmentsList) => {
    const now = new Date();

    const stats = {
      upcomingAppointments: 0,
      pendingResults: 0,
      completedTests: 0,
      totalVisits: 0,
    };

    // Count only consultations and laboratory visits for all statistics
    let consultationVisits = 0;
    let laboratoryVisits = 0;

    appointmentsList.forEach((appointment) => {
      const status = appointment.status?.toLowerCase();
      const appointmentType = appointment.type;

      // Only process consultations and laboratory appointments (exclude walk-in)
      if (
        appointmentType === "consultation" ||
        appointmentType === "laboratory"
      ) {
        // Count upcoming appointments (Pending, Confirmed, or Scheduled)
        if (
          status === "pending" ||
          status === "confirmed" ||
          status === "scheduled"
        ) {
          stats.upcomingAppointments++;
        }

        // Count pending results
        if (status === "pending") {
          stats.pendingResults++;
        }

        // Count completed tests
        if (status === "completed" || status === "done") {
          stats.completedTests++;
        }

        // Count total visits
        if (appointmentType === "consultation") {
          consultationVisits++;
        } else if (appointmentType === "laboratory") {
          laboratoryVisits++;
        }
      }
    });

    // Set total visits as sum of consultations and laboratory appointments only
    stats.totalVisits = consultationVisits + laboratoryVisits;

    setPatientData(stats);
  };

  const generateRecentActivity = (appointmentsList) => {
    // Sort appointments by creation date and get recent ones
    const sortedAppointments = appointmentsList
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt || a.scheduledDateTime || Date.now()
        );
        const dateB = new Date(
          b.createdAt || b.scheduledDateTime || Date.now()
        );
        return dateB - dateA;
      })
      .slice(0, 5);

    const activities = sortedAppointments.map((appointment) => {
      let activityType = "appointment";
      let message = "";

      const status = appointment.status?.toLowerCase();
      const testName =
        appointment.testName || appointment.service?.name || "Appointment";
      const doctor = appointment.doctor || "Staff";

      if (status === "pending") {
        activityType = "appointment";
        message = `Upcoming ${testName}${
          doctor !== "Staff" ? ` with Dr. ${doctor}` : ""
        }`;
      } else if (status === "completed" || status === "done") {
        activityType = "result";
        message = `${testName} results available`;
      } else if (status === "confirmed") {
        activityType = "booking";
        message = `${testName} appointment confirmed`;
      } else {
        activityType = "booking";
        message = `${testName} appointment scheduled`;
      }

      // Format date
      let displayDate = "Today";
      let displayTime = "TBD";

      if (appointment.scheduledDateTime) {
        const scheduleDate = new Date(appointment.scheduledDateTime);
        displayDate = scheduleDate.toLocaleDateString();
        displayTime = scheduleDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (appointment.estimatedTime) {
        displayTime = appointment.estimatedTime;
      } else if (appointment.appointmentTime) {
        displayTime = appointment.appointmentTime;
      }

      return {
        id: appointment.id,
        type: activityType,
        message: message,
        date: displayDate,
        time: displayTime,
        status: appointment.status,
        testName: testName,
        doctor: doctor,
      };
    });

    setRecentActivity(activities);
  };

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-orange-600";
      case "confirmed":
      case "scheduled":
        return "text-blue-600";
      case "completed":
      case "done":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "appointment":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "result":
        return <FileText className="w-4 h-4 text-green-600" />;
      case "booking":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityBgColor = (type) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100";
      case "result":
        return "bg-green-100";
      case "booking":
        return "bg-orange-100";
      default:
        return "bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.firstName || user?.name || "Patient"}!
          </h1>
          <p className="text-gray-600">Here's your health dashboard overview</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Upcoming Appointments
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {patientData.upcomingAppointments}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Pending Results
                </h3>
                <p className="text-2xl font-bold text-orange-600">
                  {patientData.pendingResults}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Completed Tests
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {patientData.completedTests}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Total Visits
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {patientData.totalVisits}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Bell className="w-6 h-6 text-gray-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">
              Recent Activity
            </h2>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`p-2 rounded-full mr-4 ${getActivityBgColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">
                      {activity.message}
                    </p>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <span>{activity.date}</span>
                      <span>{activity.time}</span>
                      <span
                        className={`font-medium ${getStatusColor(
                          activity.status
                        )}`}
                      >
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity found</p>
              <p className="text-sm text-gray-400">
                Your appointments and results will appear here
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
