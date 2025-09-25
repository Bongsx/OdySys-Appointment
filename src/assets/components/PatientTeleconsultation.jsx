import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  User,
  Stethoscope,
  FileText,
  CheckCircle,
  AlertCircle,
  Phone,
  Loader2,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { database, auth } from "../firebase/firebase";
import Sidebar from "./Sidebar";

const PatientTeleconsultation = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // fetch full user profile from database
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snap) => {
          if (snap.exists()) {
            setCurrentUser({ uid: user.uid, ...snap.val() });
          }
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const refApp = ref(database, `teleconsultations`);

    const unsubscribe = onValue(
      refApp,
      (snap) => {
        const data = snap.val();
        if (data) {
          try {
            // Convert all appointments to array format and filter by current user
            const userAppointments = Object.entries(data)
              .map(([key, value]) => ({
                id: key,
                ...value,
              }))
              .filter(
                (appointment) => appointment.patientId === currentUser.uid
              )
              .sort((a, b) => {
                const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
                const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
                return dateA - dateB;
              });

            setAppointments(userAppointments);
            setError(null);
          } catch (err) {
            setError("Error processing appointment data");
          }
        } else {
          setAppointments([]);
        }
        setLoading(false);
      },
      (error) => {
        setError("Failed to fetch appointments");
        setLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [currentUser]);

  // Check if appointment is ready to join (within 15 minutes of scheduled time)
  const canJoinAppointment = (appointment) => {
    const now = new Date();
    const appointmentTime = new Date(
      `${appointment.scheduledDate}T${appointment.scheduledTime}`
    );
    const timeDiff = appointmentTime - now;

    // Can join 15 minutes before and up to 1 hour after scheduled time
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -60 * 60 * 1000;
  };

  // Get appointment status styling
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "in-progress":
        return "bg-green-100 text-green-700";
      case "completed":
        return "bg-gray-100 text-gray-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Format date and time
  const formatDateTime = (date, time) => {
    const appointmentDate = new Date(`${date}T${time}`);
    return {
      date: appointmentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: appointmentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Handle joining appointment
  const handleJoinAppointment = (meetingRoomId) => {
    if (!currentUser) return;

    const domain = "meet.jit.si";
    const roomName = meetingRoomId;

    // prevent undefined error by using fallback
    const displayName = `${currentUser.firstName || "Patient"} ${
      currentUser.lastName || ""
    }`.trim();

    const jitsiUrl = `https://${domain}/${roomName}#userInfo.displayName="${encodeURIComponent(
      displayName
    )}"&config.startWithAudioMuted=true&config.startWithVideoMuted=false`;

    window.open(jitsiUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">
              Loading your teleconsultations...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Please wait while we fetch your appointments
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
            <User className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">
              Please log in to view your teleconsultations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Error
            </h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  // Convert today's date to string in YYYY-MM-DD
  const todayDate = now.toISOString().split("T")[0];

  // Upcoming: scheduled/in-progress and scheduled today or in the future
  const upcomingAppointments = appointments.filter((apt) => {
    return (
      (apt.status === "scheduled" || apt.status === "in-progress") &&
      apt.scheduledDate >= todayDate
    );
  });

  // Past: completed/cancelled OR scheduled before today
  const pastAppointments = appointments.filter((apt) => {
    return (
      apt.status === "completed" ||
      apt.status === "cancelled" ||
      apt.scheduledDate < todayDate
    );
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-800 font-sans">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-center flex-1">
                My Teleconsultations
              </h1>
              <div className="w-40"></div>
            </div>
            <p className="text-center text-purple-100 mt-2">
              Manage and join your virtual medical appointments
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto p-8">
          {/* Upcoming Appointments Section */}
          {upcomingAppointments.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Upcoming Appointments
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingAppointments.map((appointment) => {
                    const { date, time } = formatDateTime(
                      appointment.scheduledDate,
                      appointment.scheduledTime
                    );
                    const canJoin = canJoinAppointment(appointment);

                    return (
                      <div
                        key={appointment.id}
                        className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.title || "Teleconsultation"}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              appointment.status
                            )}`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-gray-600">
                            <Stethoscope className="w-4 h-4 mr-3" />
                            <span className="text-sm">
                              Dr. {appointment.doctorName}
                            </span>
                          </div>

                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-3" />
                            <span className="text-sm">{date}</span>
                          </div>

                          <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-3" />
                            <span className="text-sm">{time}</span>
                          </div>

                          {appointment.description && (
                            <div className="flex items-start text-gray-600">
                              <MessageCircle className="w-4 h-4 mr-3 mt-0.5" />
                              <span className="text-sm">
                                {appointment.description}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {canJoin ? (
                            <button
                              onClick={() =>
                                handleJoinAppointment(appointment.meetingRoomId)
                              }
                              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Now
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex-1 bg-gray-200 text-gray-500 font-medium py-3 px-4 rounded-lg flex items-center justify-center cursor-not-allowed"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Not Yet Available
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* No Upcoming Appointments */}
          {upcomingAppointments.length === 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  No Upcoming Appointments
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  You don't have any scheduled teleconsultations at the moment.
                  Check back later or schedule a new appointment.
                </p>
              </div>
            </div>
          )}

          {/* Past Appointments Section */}
          {pastAppointments.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Past Appointments
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pastAppointments.slice(0, 6).map((appointment) => {
                    const { date, time } = formatDateTime(
                      appointment.scheduledDate,
                      appointment.scheduledTime
                    );

                    return (
                      <div
                        key={appointment.id}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.title || "Teleconsultation"}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              appointment.status
                            )}`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Stethoscope className="w-4 h-4 mr-3" />
                            <span>Dr. {appointment.doctorName}</span>
                          </div>

                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-3" />
                            <span>{date}</span>
                          </div>

                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-3" />
                            <span>{time}</span>
                          </div>

                          {appointment.description && (
                            <div className="flex items-start">
                              <MessageCircle className="w-4 h-4 mr-3 mt-0.5" />
                              <span>{appointment.description}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-900 mb-1">
                  Emergency Contact
                </h4>
                <p className="text-sm text-red-700">
                  For medical emergencies, call your local emergency number
                  immediately. Teleconsultations are not suitable for emergency
                  situations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTeleconsultation;
