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

  // User matching function with enhanced logging
  const isUserMatch = (appointmentData, currentUser, usersData) => {
    const currentUserEmail = currentUser.email?.toLowerCase();
    const currentUserUID =
      currentUser.uid || currentUser.userId || currentUser.id;

    console.log("=== USER MATCHING DEBUG ===");
    console.log("Current User Info:", {
      email: currentUserEmail,
      uid: currentUserUID,
      fullUser: currentUser,
    });
    console.log("Appointment/Lab Data:", {
      id: appointmentData.id || "unknown",
      userId: appointmentData.userId,
      email: appointmentData.email,
      patientName: appointmentData.patientName,
      type: appointmentData.type,
      status: appointmentData.status,
    });

    // Primary matching - Firebase Auth UID (most reliable)
    const appointmentUIDs = [
      appointmentData.uid,
      appointmentData.userId, // This should match your lab request
      appointmentData.patientUID,
      appointmentData.patientId,
      appointmentData.patient?.uid,
      appointmentData.patient?.userId,
      appointmentData.createdBy?.uid,
      appointmentData.createdBy?.userId,
      appointmentData.userRef,
      appointmentData.patientRef,
      appointmentData.createdByRef,
    ].filter(Boolean);

    console.log("Found UIDs in appointment:", appointmentUIDs);
    const uidMatch = appointmentUIDs.some((uid) => uid === currentUserUID);
    console.log(
      "UID Match:",
      uidMatch,
      `(${currentUserUID} in [${appointmentUIDs.join(", ")}])`
    );

    // Secondary matching - Email matching
    const appointmentEmails = [
      appointmentData.email?.toLowerCase(),
      appointmentData.patientEmail?.toLowerCase(),
      appointmentData.patient?.email?.toLowerCase(),
      appointmentData.createdBy?.email?.toLowerCase(),
    ].filter(Boolean);

    console.log("Found emails in appointment:", appointmentEmails);
    const emailMatch =
      currentUserEmail && appointmentEmails.includes(currentUserEmail);
    console.log(
      "Email Match:",
      emailMatch,
      `(${currentUserEmail} in [${appointmentEmails.join(", ")}])`
    );

    // Tertiary matching - Cross-reference with users node
    let userNodeMatch = false;
    if (!uidMatch && appointmentEmails.length > 0 && usersData) {
      Object.keys(usersData).forEach((userUID) => {
        const userData = usersData[userUID];
        if (
          userData.email?.toLowerCase() === currentUserEmail &&
          appointmentEmails.includes(userData.email?.toLowerCase())
        ) {
          userNodeMatch = true;
        }
      });
    }
    console.log("User Node Match:", userNodeMatch);

    const isMatch = uidMatch || emailMatch || userNodeMatch;
    console.log("FINAL MATCH RESULT:", isMatch);
    console.log("=========================");

    return isMatch;
  };

  const fetchAllAppointmentData = (userData) => {
    setLoading(true);

    console.log("Fetching data for user:", {
      email: userData.email,
      uid: userData.uid || userData.userId || userData.id,
      fullUserData: userData,
    });

    // Also fetch users node to get complete user data if needed
    const usersRef = ref(database, "users");
    const appointmentsRef = ref(database, "appointments");
    const clinicLabRequestsRef = ref(database, "clinicLabRequests");

    let usersData = null;
    let appointmentsData = null;
    let clinicLabData = null;
    let dataLoadCount = 0;

    const processAllData = () => {
      if (dataLoadCount === 3) {
        const userAppointments = [];

        // Get current user's complete data from users node
        let currentUserFromDB = null;
        if (usersData && userData.uid) {
          currentUserFromDB =
            usersData[userData.uid] ||
            Object.values(usersData).find(
              (user) =>
                user.email?.toLowerCase() === userData.email?.toLowerCase()
            );
        }

        console.log("Current user from DB:", currentUserFromDB);

        // Use DB user data if available, otherwise use localStorage data
        const userForMatching = currentUserFromDB || userData;

        // Process direct appointments (consultations)
        if (appointmentsData) {
          Object.keys(appointmentsData).forEach((key) => {
            const appointment = appointmentsData[key];

            if (isUserMatch(appointment, userForMatching, usersData)) {
              console.log("Found matching appointment:", key, appointment);

              userAppointments.push({
                id: key,
                type: "consultation",
                ...appointment,
                testName:
                  appointment.type ||
                  appointment.serviceType ||
                  "General Consultation",
                doctor:
                  appointment.doctor || appointment.doctorName || "Doctor",
                patientName:
                  `${
                    appointment.patient?.firstName ||
                    appointment.firstName ||
                    ""
                  } ${
                    appointment.patient?.lastName || appointment.lastName || ""
                  }`.trim() || appointment.patientName,
                scheduledDateTime:
                  appointment.appointmentDate && appointment.appointmentTime
                    ? `${appointment.appointmentDate}T${convertTo24Hour(
                        appointment.appointmentTime
                      )}`
                    : appointment.scheduledDateTime || new Date().toISOString(),
                email: appointment.patient?.email || appointment.email,
                source: "appointments",
                clinicName: appointment.clinicName || appointment.clinic,
                serviceFee: normalizeServiceFee(appointment.serviceFee),
              });
            }
          });
        }

        // Process clinic lab requests
        if (clinicLabData) {
          Object.keys(clinicLabData).forEach((key) => {
            const labRequest = clinicLabData[key];

            if (isUserMatch(labRequest, userForMatching, usersData)) {
              console.log("Found matching lab request:", key, labRequest);

              userAppointments.push({
                id: key,
                type: "clinic_lab_request",
                ...labRequest,
                testName:
                  labRequest.labTestName || labRequest.testName || "Lab Test",
                doctor:
                  labRequest.referDoctor ||
                  labRequest.doctor ||
                  "Laboratory Staff",
                patientName:
                  labRequest.patientName ||
                  `${labRequest.firstName || ""} ${
                    labRequest.lastName || ""
                  }`.trim(),
                scheduledDateTime:
                  labRequest.createdAt?.date && labRequest.estimatedTime
                    ? `${labRequest.createdAt.date}T${convertTo24Hour(
                        labRequest.estimatedTime
                      )}`
                    : labRequest.scheduledDateTime || new Date().toISOString(),
                source: "Clinic Lab Requests",
                clinicName: labRequest.clinic || labRequest.clinicName,
                serviceFee: normalizeServiceFee(labRequest.serviceFee),
                bloodType: labRequest.bloodType,
                description: labRequest.description,
                slotNumber: labRequest.slotNumber,
                contactNumber: labRequest.contactNumber,
                dateOfBirth: labRequest.dateOfBirth,
              });
            }
          });
        }

        console.log("Final filtered appointments for user:", userAppointments);
        setAllAppointments(userAppointments);
        calculatePatientStats(userAppointments);
        generateRecentActivity(userAppointments);
        setLoading(false);
      }
    };

    // Listen to users data
    onValue(
      usersRef,
      (snapshot) => {
        usersData = snapshot.val() || {};
        console.log(
          "Users data loaded:",
          Object.keys(usersData).length,
          "users"
        );
        dataLoadCount++;
        processAllData();
      },
      (error) => {
        console.error("Error fetching users:", error);
        usersData = {};
        dataLoadCount++;
        processAllData();
      }
    );

    // Listen to appointments
    onValue(
      appointmentsRef,
      (snapshot) => {
        appointmentsData = snapshot.val() || {};
        console.log(
          "Raw appointments data:",
          Object.keys(appointmentsData).length,
          "appointments"
        );
        dataLoadCount++;
        processAllData();
      },
      (error) => {
        console.error("Error fetching appointments:", error);
        appointmentsData = {};
        dataLoadCount++;
        processAllData();
      }
    );

    // Listen to clinic lab requests
    onValue(
      clinicLabRequestsRef,
      (snapshot) => {
        clinicLabData = snapshot.val() || {};
        console.log(
          "Raw clinic lab data:",
          Object.keys(clinicLabData).length,
          "lab requests"
        );
        dataLoadCount++;
        processAllData();
      },
      (error) => {
        console.error("Error fetching clinic lab requests:", error);
        clinicLabData = {};
        dataLoadCount++;
        processAllData();
      }
    );
  };

  // Helper function to normalize service fee
  const normalizeServiceFee = (serviceFee) => {
    if (typeof serviceFee === "object" && serviceFee !== null) {
      return serviceFee.fee || serviceFee.name || serviceFee.amount || "N/A";
    }
    return serviceFee || "N/A";
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

  // Fixed stats calculation - only counting pending status
  const calculatePatientStats = (appointmentsList) => {
    const stats = {
      upcomingAppointments: 0,
      pendingResults: 0,
      completedTests: 0,
      totalVisits: appointmentsList.length,
    };

    console.log("Calculating stats for appointments:", appointmentsList);

    appointmentsList.forEach((appointment) => {
      const status = appointment.status?.toLowerCase();
      const appointmentType = appointment.type;

      console.log(`Processing appointment ${appointment.id}:`, {
        status,
        appointmentType,
        testName: appointment.testName,
        source: appointment.source,
        originalType: appointment.type,
      });

      // Count upcoming appointments (Pending, Confirmed, Scheduled, or Requested)
      if (
        status === "pending" ||
        status === "confirmed" ||
        status === "scheduled" ||
        status === "requested" ||
        status === "approved"
      ) {
        stats.upcomingAppointments++;
        console.log(
          `Added to upcoming appointments: ${appointment.testName} (${status})`
        );
      }

      // Count pending results - ONLY pending status from both nodes
      if (status === "pending") {
        // Check if it's from clinicLabRequests OR appointments node
        if (
          appointmentType === "clinic_lab_request" || // This is the correct type set in your data processing
          appointment.source === "Clinic Lab Requests" || // This is the source you set
          appointmentType === "consultation" || // Regular appointments
          appointment.source === "appointments" // Regular appointments source
        ) {
          stats.pendingResults++;
          console.log(
            `Added to pending results: ${appointment.testName} (${status}) - Type: ${appointmentType} - Source: ${appointment.source}`
          );
        }
      }

      // Count completed tests
      if (
        status === "completed" ||
        status === "done" ||
        status === "finished" ||
        status === "results_ready"
      ) {
        stats.completedTests++;
        console.log(
          `Added to completed tests: ${appointment.testName} (${status})`
        );
      }
    });

    console.log("Final calculated stats:", stats);
    console.log(
      "Stats breakdown by status:",
      appointmentsList.reduce((acc, apt) => {
        const status = apt.status?.toLowerCase() || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    );

    setPatientData(stats);
  };

  // Enhanced activity generation with better messaging
  const generateRecentActivity = (appointmentsList) => {
    const sortedAppointments = appointmentsList
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt?.date || a.createdAt || a.scheduledDateTime || Date.now()
        );
        const dateB = new Date(
          b.createdAt?.date || b.createdAt || b.scheduledDateTime || Date.now()
        );
        return dateB - dateA;
      })
      .slice(0, 8); // Increased to show more recent activity

    const activities = sortedAppointments.map((appointment) => {
      let activityType = "appointment";
      let message = "";

      const status = appointment.status?.toLowerCase();
      const testName = appointment.testName || "Service";
      const doctor = appointment.doctor || "Staff";
      const clinicName = appointment.clinicName || appointment.clinic || "";

      // Generate activity message based on status and type
      if (appointment.type === "clinic_lab_request") {
        if (status === "pending" || status === "requested") {
          activityType = "appointment";
          message = `${testName} lab test requested${
            clinicName ? ` at ${clinicName}` : ""
          }`;
        } else if (status === "completed" || status === "results_ready") {
          activityType = "result";
          message = `${testName} lab results available${
            clinicName ? ` from ${clinicName}` : ""
          }`;
        } else if (status === "processing" || status === "in_progress") {
          activityType = "appointment";
          message = `${testName} lab test being processed${
            clinicName ? ` at ${clinicName}` : ""
          }`;
        } else {
          activityType = "booking";
          message = `${testName} lab request ${status}${
            clinicName ? ` at ${clinicName}` : ""
          }`;
        }
      } else {
        // Regular consultation appointments
        if (status === "pending" || status === "requested") {
          activityType = "appointment";
          message = `${testName} appointment pending with ${doctor}`;
        } else if (status === "confirmed" || status === "approved") {
          activityType = "booking";
          message = `${testName} appointment confirmed with ${doctor}`;
        } else if (status === "completed") {
          activityType = "result";
          message = `${testName} consultation completed with ${doctor}`;
        } else {
          activityType = "appointment";
          message = `${testName} appointment ${status} with ${doctor}`;
        }
      }

      // Format date and time
      let displayDate = "Today";
      let displayTime = "TBD";

      if (appointment.scheduledDateTime) {
        const scheduleDate = new Date(appointment.scheduledDateTime);
        if (!isNaN(scheduleDate.getTime())) {
          displayDate = scheduleDate.toLocaleDateString();
          displayTime = scheduleDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } else if (appointment.appointmentDate && appointment.appointmentTime) {
        displayDate = new Date(
          appointment.appointmentDate
        ).toLocaleDateString();
        displayTime = appointment.appointmentTime;
      } else if (appointment.estimatedTime) {
        displayTime = appointment.estimatedTime;
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
        source: appointment.source,
        appointmentType: appointment.type,
        clinicName: clinicName,
        serviceFee: appointment.serviceFee,
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
      case "requested":
        return "text-orange-600";
      case "confirmed":
      case "scheduled":
      case "approved":
        return "text-blue-600";
      case "completed":
      case "done":
      case "results_ready":
      case "finished":
        return "text-green-600";
      case "cancelled":
      case "rejected":
        return "text-red-600";
      case "processing":
      case "in_progress":
        return "text-purple-600";
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
      <main className="flex-1 p-6 bg-gray-50 overflow-auto">
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
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.source}-${activity.id}-${index}`}
                  className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`p-2 rounded-full mr-4 flex-shrink-0 ${getActivityBgColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 mb-1 break-words">
                      {activity.message}
                    </p>
                    <div className="flex flex-wrap items-center text-sm text-gray-600 gap-2">
                      <span className="flex-shrink-0">{activity.date}</span>
                      <span className="flex-shrink-0">{activity.time}</span>
                      <span
                        className={`font-medium flex-shrink-0 ${getStatusColor(
                          activity.status
                        )}`}
                      >
                        {activity.status}
                      </span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded flex-shrink-0">
                        {activity.source}
                      </span>
                      {activity.serviceFee && activity.serviceFee !== "N/A" && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex-shrink-0">
                          ₱{activity.serviceFee}
                        </span>
                      )}
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
                Your appointments and lab requests will appear here
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
