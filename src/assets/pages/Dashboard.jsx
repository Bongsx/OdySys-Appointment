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
  UserCheck,
  Stethoscope,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState("booking");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allReferrals, setAllReferrals] = useState([]);

  // Dynamic patient data based on appointments and referrals
  const [patientData, setPatientData] = useState({
    upcomingAppointments: 0,
    pendingResults: 0,
    completedTests: 0,
    totalVisits: 0,
    activeReferrals: 0,
    completedReferrals: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(userData);

    // Fetch all appointment and referral data
    fetchAllAppointmentData(userData);
  }, [navigate]);

  // Enhanced user matching function for referrals
  const isReferralMatch = (referralData, currentUser, usersData) => {
    const currentUserEmail = currentUser.email?.toLowerCase();
    const currentUserUID =
      currentUser.uid || currentUser.userId || currentUser.id;

    console.log("=== REFERRAL MATCHING DEBUG ===");
    console.log("Current User Info:", {
      email: currentUserEmail,
      uid: currentUserUID,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      fullUser: currentUser,
    });
    console.log("Referral Data:", {
      id: referralData.id || "unknown",
      patientId: referralData.patientId,
      patientFirstName: referralData.patientFirstName,
      patientLastName: referralData.patientLastName,
      patientMiddleName: referralData.patientMiddleName,
      status: referralData.status,
      fullReferral: referralData,
    });

    // Primary matching - Patient ID (most reliable)
    const patientUIDs = [
      referralData.patientId,
      referralData.patientUID,
      referralData.userId,
      referralData.assignedSpecialistId, // Sometimes this might be the patient ID in error
    ].filter(Boolean);

    console.log("Found Patient UIDs in referral:", patientUIDs);
    const uidMatch = patientUIDs.some((uid) => uid === currentUserUID);
    console.log(
      "UID Match:",
      uidMatch,
      `(${currentUserUID} in [${patientUIDs.join(", ")}])`
    );

    // Secondary matching - Name matching (case-insensitive)
    let nameMatch = false;
    const currentUserFirstName = (currentUser.firstName || "")
      .toLowerCase()
      .trim();
    const currentUserLastName = (currentUser.lastName || "")
      .toLowerCase()
      .trim();
    const referralFirstName = (referralData.patientFirstName || "")
      .toLowerCase()
      .trim();
    const referralLastName = (referralData.patientLastName || "")
      .toLowerCase()
      .trim();

    console.log("Name comparison:", {
      currentUser: `${currentUserFirstName} ${currentUserLastName}`,
      referralPatient: `${referralFirstName} ${referralLastName}`,
    });

    if (
      currentUserFirstName &&
      currentUserLastName &&
      referralFirstName &&
      referralLastName
    ) {
      nameMatch =
        currentUserFirstName === referralFirstName &&
        currentUserLastName === referralLastName;
      console.log("Direct name match:", nameMatch);
    }

    // Tertiary matching - Cross-reference with users node
    let userNodeMatch = false;
    if (!uidMatch && !nameMatch && usersData) {
      console.log("Checking users node for additional verification...");

      // Get current user from DB
      const currentUserFromDB = usersData[currentUserUID];
      console.log("Current user from DB:", currentUserFromDB);

      if (currentUserFromDB) {
        const dbFirstName = (currentUserFromDB.firstName || "")
          .toLowerCase()
          .trim();
        const dbLastName = (currentUserFromDB.lastName || "")
          .toLowerCase()
          .trim();

        if (
          dbFirstName &&
          dbLastName &&
          referralFirstName &&
          referralLastName
        ) {
          userNodeMatch =
            dbFirstName === referralFirstName &&
            dbLastName === referralLastName;
          console.log(
            "DB name match:",
            userNodeMatch,
            `DB: ${dbFirstName} ${dbLastName}, Referral: ${referralFirstName} ${referralLastName}`
          );
        }
      }

      // Also check if patientId exists in users node and matches current user
      if (referralData.patientId && usersData[referralData.patientId]) {
        const patientFromDB = usersData[referralData.patientId];
        if (patientFromDB.email?.toLowerCase() === currentUserEmail) {
          userNodeMatch = true;
          console.log("Patient ID email match found in users node");
        }
      }
    }

    // Quaternary matching - Email cross-reference (if available in referral)
    let emailMatch = false;
    if (currentUserEmail && usersData) {
      // Check if the patientId in referral corresponds to a user with matching email
      if (referralData.patientId && usersData[referralData.patientId]) {
        const patientUser = usersData[referralData.patientId];
        if (patientUser.email?.toLowerCase() === currentUserEmail) {
          emailMatch = true;
          console.log("Email match via patientId lookup:", emailMatch);
        }
      }
    }

    const isMatch = uidMatch || nameMatch || userNodeMatch || emailMatch;
    console.log("MATCH RESULTS:", {
      uidMatch,
      nameMatch,
      userNodeMatch,
      emailMatch,
      finalResult: isMatch,
    });
    console.log("FINAL REFERRAL MATCH RESULT:", isMatch);
    console.log("===============================");

    return isMatch;
  };

  // User matching function with enhanced logging (keeping existing)
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
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      clinicId: appointmentData.clinicId,
      type: appointmentData.type,
      status: appointmentData.status,
      appointmentPurpose: appointmentData.appointmentPurpose,
      fullAppointment: appointmentData,
    });

    // Primary matching - Firebase Auth UID (most reliable)
    const appointmentUIDs = [
      appointmentData.uid,
      appointmentData.userId,
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

    // Fetch all data sources
    const usersRef = ref(database, "users");
    const appointmentsRef = ref(database, "appointments");
    const clinicLabRequestsRef = ref(database, "clinicLabRequests");
    const referralsRef = ref(database, "referrals");

    let usersData = null;
    let appointmentsData = null;
    let clinicLabData = null;
    let referralsData = null;
    let dataLoadCount = 0;

    const processAllData = () => {
      if (dataLoadCount === 4) {
        // Updated to 4 for referrals
        const userAppointments = [];
        const userReferrals = [];

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
        const userForMatching = currentUserFromDB || userData;

        // Process direct appointments (consultations) - keeping existing logic
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

        // Process clinic lab requests - keeping existing logic
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

        // Process referrals - NEW
        if (referralsData) {
          Object.keys(referralsData).forEach((key) => {
            const referral = referralsData[key];

            if (isReferralMatch(referral, userForMatching, usersData)) {
              console.log("Found matching referral:", key, referral);

              const scheduledDateTime = referral.appointmentTime
                ? `${new Date().toISOString().split("T")[0]}T${convertTo24Hour(
                    referral.appointmentTime
                  )}`
                : referral.referralTimestamp || new Date().toISOString();

              userReferrals.push({
                id: key,
                type: "referral",
                ...referral,
                testName:
                  referral.initialReasonForReferral || "Specialist Referral",
                doctor:
                  `Dr. ${referral.assignedSpecialistFirstName || ""} ${
                    referral.assignedSpecialistLastName || ""
                  }`.trim() || "Specialist",
                referringDoctor: `Dr. ${
                  referral.referringGeneralistFirstName || ""
                } ${referral.referringGeneralistLastName || ""}`.trim(),
                patientName: `${referral.patientFirstName || ""} ${
                  referral.patientMiddleName || ""
                } ${referral.patientLastName || ""}`.trim(),
                scheduledDateTime: scheduledDateTime,
                source: "referrals",
                clinicName:
                  referral.referringClinicName ||
                  referral.practiceLocation ||
                  "Clinic",
                appointmentTime: referral.appointmentTime,
                lastUpdated: referral.lastUpdated,
                generalistNotes: referral.generalistNotes,
                patientArrivalConfirmed: referral.patientArrivalConfirmed,
                sourceSystem: referral.sourceSystem,
              });
            }
          });
        }

        console.log("Final filtered appointments for user:", userAppointments);
        console.log("Final filtered referrals for user:", userReferrals);

        setAllAppointments(userAppointments);
        setAllReferrals(userReferrals);
        calculatePatientStats(userAppointments, userReferrals);
        generateRecentActivity(userAppointments, userReferrals);
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

    // Listen to referrals - NEW
    onValue(
      referralsRef,
      (snapshot) => {
        referralsData = snapshot.val() || {};
        console.log(
          "Raw referrals data:",
          Object.keys(referralsData).length,
          "referrals"
        );
        dataLoadCount++;
        processAllData();
      },
      (error) => {
        console.error("Error fetching referrals:", error);
        referralsData = {};
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

  // Enhanced stats calculation including referrals
  const calculatePatientStats = (appointmentsList, referralsList) => {
    const stats = {
      upcomingAppointments: 0,
      pendingResults: 0,
      completedTests: 0,
      totalVisits: appointmentsList.length + referralsList.length,
      activeReferrals: 0,
      completedReferrals: 0,
    };

    console.log("Calculating stats for appointments:", appointmentsList);
    console.log("Calculating stats for referrals:", referralsList);

    // Process appointments (existing logic)
    appointmentsList.forEach((appointment) => {
      const status = appointment.status?.toLowerCase();
      const appointmentType = appointment.type;

      if (
        status === "pending" ||
        status === "confirmed" ||
        status === "scheduled" ||
        status === "requested" ||
        status === "approved"
      ) {
        stats.upcomingAppointments++;
      }

      if (status === "pending") {
        if (
          appointmentType === "clinic_lab_request" ||
          appointment.source === "Clinic Lab Requests" ||
          appointmentType === "consultation" ||
          appointment.source === "appointments"
        ) {
          stats.pendingResults++;
        }
      }

      if (
        status === "completed" ||
        status === "done" ||
        status === "finished" ||
        status === "results_ready"
      ) {
        stats.completedTests++;
      }
    });

    // Process referrals (NEW)
    referralsList.forEach((referral) => {
      const status = referral.status?.toLowerCase();

      console.log(`Processing referral ${referral.id}:`, {
        status,
        testName: referral.testName,
        doctor: referral.doctor,
        referringDoctor: referral.referringDoctor,
      });

      // Count active referrals
      if (
        status === "pending" ||
        status === "confirmed" ||
        status === "scheduled" ||
        status === "approved" ||
        status === "active"
      ) {
        stats.activeReferrals++;
        stats.upcomingAppointments++; // Also count as upcoming
        console.log(
          `Added to active referrals: ${referral.testName} (${status})`
        );
      }

      // Count completed referrals
      if (
        status === "completed" ||
        status === "done" ||
        status === "finished"
      ) {
        stats.completedReferrals++;
        stats.completedTests++; // Also count as completed
        console.log(
          `Added to completed referrals: ${referral.testName} (${status})`
        );
      }
    });

    console.log("Final calculated stats:", stats);
    setPatientData(stats);
  };

  // Enhanced activity generation including referrals
  const generateRecentActivity = (appointmentsList, referralsList) => {
    // Combine appointments and referrals
    const allActivities = [
      ...appointmentsList.map((apt) => ({
        ...apt,
        activityType: "appointment",
      })),
      ...referralsList.map((ref) => ({ ...ref, activityType: "referral" })),
    ];

    const sortedActivities = allActivities
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt?.date ||
            a.createdAt ||
            a.scheduledDateTime ||
            a.lastUpdated ||
            Date.now()
        );
        const dateB = new Date(
          b.createdAt?.date ||
            b.createdAt ||
            b.scheduledDateTime ||
            b.lastUpdated ||
            Date.now()
        );
        return dateB - dateA;
      })
      .slice(0, 10); // Show more activities

    const activities = sortedActivities.map((item) => {
      let activityType = "appointment";
      let message = "";

      const status = item.status?.toLowerCase();
      const testName = item.testName || "Service";
      const doctor = item.doctor || "Staff";
      const clinicName = item.clinicName || item.clinic || "";

      // Generate activity message based on type and status
      if (item.activityType === "referral") {
        if (status === "pending" || status === "requested") {
          activityType = "referral";
          message = `Referral to ${doctor} for ${testName}${
            clinicName ? ` at ${clinicName}` : ""
          }`;
        } else if (status === "completed") {
          activityType = "result";
          message = `Specialist consultation completed with ${doctor}`;
        } else if (status === "confirmed" || status === "approved") {
          activityType = "booking";
          message = `Referral confirmed with ${doctor} for ${testName}`;
        } else {
          activityType = "referral";
          message = `Referral ${status} - ${testName} with ${doctor}`;
        }
      } else if (item.type === "clinic_lab_request") {
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

      if (item.scheduledDateTime) {
        const scheduleDate = new Date(item.scheduledDateTime);
        if (!isNaN(scheduleDate.getTime())) {
          displayDate = scheduleDate.toLocaleDateString();
          displayTime = scheduleDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } else if (item.appointmentDate && item.appointmentTime) {
        displayDate = new Date(item.appointmentDate).toLocaleDateString();
        displayTime = item.appointmentTime;
      } else if (item.estimatedTime || item.appointmentTime) {
        displayTime = item.estimatedTime || item.appointmentTime;
      }

      return {
        id: item.id,
        type: activityType,
        message: message,
        date: displayDate,
        time: displayTime,
        status: item.status,
        testName: testName,
        doctor: doctor,
        source: item.source,
        appointmentType: item.type,
        activityType: item.activityType,
        clinicName: clinicName,
        serviceFee: item.serviceFee,
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
      case "referral":
        return <UserCheck className="w-4 h-4 text-purple-600" />;
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
      case "referral":
        return "bg-purple-100";
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

        {/* Quick Stats Cards - Enhanced with Referrals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
                  Pending
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
                  Completed
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
                  Active Referrals
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {patientData.activeReferrals}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <UserCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-indigo-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Completed Referrals
                </h3>
                <p className="text-2xl font-bold text-indigo-600">
                  {patientData.completedReferrals}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <Stethoscope className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-gray-500 transition duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  Total Visits
                </h3>
                <p className="text-2xl font-bold text-gray-600">
                  {patientData.totalVisits}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <Activity className="w-6 h-6 text-gray-600" />
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
                      {activity.activityType && (
                        <span
                          className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                            activity.activityType === "referral"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {activity.activityType === "referral"
                            ? "Referral"
                            : "Appointment"}
                        </span>
                      )}
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
                Your appointments, lab requests, and referrals will appear here
              </p>
            </div>
          )}
        </div>

        {/* Referrals Summary Section - NEW */}
        {allReferrals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center mb-6">
              <UserCheck className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">
                Your Referrals
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allReferrals.slice(0, 6).map((referral) => (
                <div
                  key={referral.id}
                  className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-indigo-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {referral.testName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Specialist: {referral.doctor}
                      </p>
                      <p className="text-sm text-gray-500">
                        Referred by: {referral.referringDoctor}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        referral.status
                      )} bg-white`}
                    >
                      {referral.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Clinic:</span>
                      <span className="font-medium">{referral.clinicName}</span>
                    </div>
                    {referral.appointmentTime && (
                      <div className="flex items-center justify-between">
                        <span>Time:</span>
                        <span className="font-medium">
                          {referral.appointmentTime}
                        </span>
                      </div>
                    )}
                    {referral.patientArrivalConfirmed && (
                      <div className="flex items-center text-green-600">
                        <UserCheck className="w-3 h-3 mr-1" />
                        <span className="text-xs">Arrival Confirmed</span>
                      </div>
                    )}
                  </div>

                  {referral.generalistNotes && (
                    <div className="mt-3 p-2 bg-white rounded text-xs text-gray-600">
                      <strong>Notes:</strong> {referral.generalistNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {allReferrals.length > 6 && (
              <div className="text-center mt-4">
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  View All Referrals ({allReferrals.length})
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
