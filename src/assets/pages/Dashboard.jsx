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
  Activity as ActivityIcon,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allReferrals, setAllReferrals] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [clinicsData, setClinicsData] = useState({});
  const [patientData, setPatientData] = useState({
    upcomingAppointments: 0,
    pendingResults: 0,
    completedTests: 0,
    totalVisits: 0,
    activeReferrals: 0,
    completedReferrals: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredActivity, setFilteredActivity] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(userData);
    fetchAllData(userData);
  }, [navigate]);

  const filterActivity = (activities) => {
    let filtered;
    switch (activeFilter) {
      case "upcoming":
        filtered = activities.filter((activity) =>
          [
            "pending",
            "confirmed",
            "scheduled",
            "requested",
            "approved",
            "processing",
            "in_progress",
          ].includes(activity.status?.toLowerCase())
        );
        break;
      case "pending":
        filtered = activities.filter(
          (activity) => activity.status?.toLowerCase() === "pending"
        );
        break;
      case "completed":
        filtered = activities.filter((activity) =>
          ["completed", "done", "finished", "results_ready"].includes(
            activity.status?.toLowerCase()
          )
        );
        break;
      case "referrals":
        const allReferrals = activities.filter(
          (activity) => activity.activityType === "referral"
        );
        console.log(
          "All referral activities:",
          allReferrals.map((r) => ({
            id: r.id,
            status: r.status,
            activityType: r.activityType,
          }))
        );

        filtered = activities.filter(
          (activity) =>
            activity.activityType === "referral" &&
            [
              "pending",
              "confirmed",
              "scheduled",
              "requested",
              "approved",
              "active",
            ].includes(activity.status?.toLowerCase())
        );
        console.log(
          "Filtered active referrals:",
          filtered.map((r) => ({ id: r.id, status: r.status }))
        );
        break;
      case "referrals-completed":
        filtered = activities.filter(
          (activity) =>
            activity.activityType === "referral" &&
            ["completed", "done", "finished"].includes(
              activity.status?.toLowerCase()
            )
        );
        break;
      case "all":
      default:
        filtered = activities;
    }

    console.log(
      `Filter '${activeFilter}' applied. Total activities: ${activities.length}, Filtered: ${filtered.length}`
    );
    return filtered;
  };

  useEffect(() => {
    setFilteredActivity(filterActivity(recentActivity));
  }, [activeFilter, recentActivity]);

  const isUserMatch = (item, currentUser) => {
    const currentUserIds = [
      currentUser.uid,
      currentUser.userId,
      currentUser.id,
      currentUser.patientId,
    ].filter(Boolean);

    const currentUserEmail = currentUser.email?.toLowerCase();

    const itemIds = [
      item.uid,
      item.userId,
      item.patientUID,
      item.patientId,
      item.assignedSpecialistId,
      item.referringGeneralistId,
      item.patient?.uid,
      item.createdBy?.uid,
    ].filter(Boolean);

    const itemEmails = [
      item.email,
      item.patientEmail,
      item.patient?.email,
      item.createdBy?.email,
    ]
      .filter(Boolean)
      .map((email) => email.toLowerCase());

    const idMatch = currentUserIds.some((id) => itemIds.includes(id));
    const emailMatch =
      currentUserEmail && itemEmails.includes(currentUserEmail);

    return idMatch || emailMatch;
  };

  const fetchAllData = (userData) => {
    setLoading(true);

    const dataRefs = {
      users: ref(database, "users"),
      appointments: ref(database, "appointments"),
      clinicLabRequests: ref(database, "clinicLabRequests"),
      referrals: ref(database, "referrals"),
      medicalServicesTransactions: ref(database, "medicalServicesTransactions"),
      clinics: ref(database, "clinics"),
    };

    let loadedData = {};
    let loadCount = 0;
    const totalLoads = Object.keys(dataRefs).length;

    const processData = () => {
      if (loadCount === totalLoads) {
        setClinicsData(loadedData.clinics || {});

        const userAppointments = [];
        const userReferrals = [];
        const userTransactions = [];

        console.log("=== DATA PROCESSING DEBUG ===");
        console.log(
          "Raw referrals data:",
          Object.keys(loadedData.referrals || {}).length
        );
        console.log(
          "Raw transactions data:",
          Object.keys(loadedData.medicalServicesTransactions || {}).length
        );
        console.log("Current user for matching:", {
          uid: userData.uid,
          email: userData.email,
          firstName: userData.firstName,
          patientId: userData.patientId,
        });

        Object.entries(loadedData.appointments || {}).forEach(
          ([key, appointment]) => {
            if (isUserMatch(appointment, userData)) {
              userAppointments.push(
                createAppointmentItem(key, appointment, "consultation")
              );
            }
          }
        );

        Object.entries(loadedData.clinicLabRequests || {}).forEach(
          ([key, labRequest]) => {
            if (isUserMatch(labRequest, userData)) {
              userAppointments.push(
                createAppointmentItem(key, labRequest, "clinic_lab_request")
              );
            }
          }
        );

        Object.entries(loadedData.referrals || {}).forEach(
          ([key, referral]) => {
            console.log(`Checking referral ${key}:`, {
              patientId: referral.patientId,
              assignedSpecialistId: referral.assignedSpecialistId,
              referringGeneralistId: referral.referringGeneralistId,
              patientFirstName: referral.patientFirstName,
              patientLastName: referral.patientLastName,
              status: referral.status,
            });

            const matches = isUserMatch(referral, userData);
            console.log(`Referral ${key} matches user:`, matches);

            if (matches) {
              userReferrals.push(createReferralItem(key, referral));
              console.log(`Added referral ${key} to user referrals`);
            }
          }
        );

        Object.entries(loadedData.medicalServicesTransactions || {}).forEach(
          ([key, transaction]) => {
            const matches = isUserMatch(transaction, userData);
            if (matches) {
              userTransactions.push(
                createTransactionItem(
                  key,
                  transaction,
                  loadedData.clinics || {}
                )
              );
              console.log(`Added transaction ${key} to user transactions`);
            }
          }
        );

        console.log("Final counts:", {
          appointments: userAppointments.length,
          referrals: userReferrals.length,
          transactions: userTransactions.length,
        });
        console.log(
          "User referrals:",
          userReferrals.map((r) => ({
            id: r.id,
            status: r.status,
            testName: r.testName,
          }))
        );
        console.log("================================");

        setAllAppointments(userAppointments);
        setAllReferrals(userReferrals);
        setAllTransactions(userTransactions);
        calculateStats(userAppointments, userReferrals, userTransactions);
        generateActivity(userAppointments, userReferrals, userTransactions);
        setLoading(false);
      }
    };

    Object.entries(dataRefs).forEach(([key, dbRef]) => {
      onValue(
        dbRef,
        (snapshot) => {
          loadedData[key] = snapshot.val() || {};
          loadCount++;
          processData();
        },
        (error) => {
          console.error(`Error fetching ${key}:`, error);
          loadedData[key] = {};
          loadCount++;
          processData();
        }
      );
    });
  };

  const createAppointmentItem = (id, data, type) => {
    const testName =
      data.labTestName ||
      data.testName ||
      data.type ||
      data.serviceType ||
      data.appointmentPurpose ||
      "General Consultation";

    const doctor =
      data.referDoctor ||
      data.doctor ||
      data.doctorName ||
      (type === "clinic_lab_request" ? "Laboratory Staff" : "Doctor");

    const patientName =
      data.patientName ||
      `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
      `${data.patient?.firstName || ""} ${data.patient?.lastName || ""}`.trim();

    return {
      id,
      type,
      ...data,
      testName,
      doctor,
      patientName,
      scheduledDateTime: getScheduledDateTime(data),
      source:
        type === "clinic_lab_request" ? "Clinic Lab Requests" : "appointments",
      clinicName: data.clinicName || data.clinic,
      serviceFee: normalizeServiceFee(data.serviceFee),
      status: data.status || "requested",
    };
  };

  const createReferralItem = (id, data) => {
    const doctor =
      `Dr. ${data.assignedSpecialistFirstName || ""} ${
        data.assignedSpecialistLastName || ""
      }`.trim() || "Specialist";
    const referringDoctor = `Dr. ${data.referringGeneralistFirstName || ""} ${
      data.referringGeneralistLastName || ""
    }`.trim();
    const patientName = `${data.patientFirstName || ""} ${
      data.patientMiddleName || ""
    } ${data.patientLastName || ""}`.trim();

    return {
      id,
      type: "referral",
      ...data,
      testName: data.initialReasonForReferral || "Specialist Referral",
      doctor,
      referringDoctor,
      patientName,
      scheduledDateTime: getScheduledDateTime(data),
      source: "referrals",
      clinicName: data.referringClinicName || data.practiceLocation || "Clinic",
      status: data.status || "pending",
    };
  };

  const createTransactionItem = (id, data, clinicsData) => {
    const scheduledDate = data.labTestSched?.date;
    const scheduledTime = data.labTestSched?.time;
    const mainStatus = data.resultStatus || data.sampleStatus || "processing";
    const testName = data.serviceCategory || data.department || "Lab Service";

    const clinicId = data.clinicId;
    const clinicName =
      clinicsData[clinicId]?.name || clinicId || "Unknown Clinic";

    return {
      id,
      type: "medical_transaction",
      ...data,
      testName,
      patientName: data.patientName,
      doctor: data.completedBy || "Lab Staff",
      status: mainStatus,
      scheduledDateTime: getScheduledDateTime({
        appointmentDate: scheduledDate,
        appointmentTime: scheduledTime,
        createdAt: data.createdAt,
        status: mainStatus,
      }),
      source: "Medical Transactions",
      clinicName: clinicName,
      serviceFee: normalizeServiceFee(data.serviceFee),
      labTestSched: data.labTestSched,
    };
  };

  const getScheduledDateTime = (data) => {
    if (data.appointmentDate && data.appointmentTime) {
      return `${data.appointmentDate}T${convertTo24Hour(data.appointmentTime)}`;
    }
    if (
      data.completedAt &&
      ["completed", "results_ready"].includes(data.status?.toLowerCase())
    ) {
      return data.completedAt;
    }

    return (
      data.scheduledDateTime ||
      data.createdAt ||
      data.referralTimestamp ||
      new Date().toISOString()
    );
  };

  const normalizeServiceFee = (serviceFee) => {
    if (typeof serviceFee === "object" && serviceFee !== null) {
      return serviceFee.fee || serviceFee.name || serviceFee.amount || "N/A";
    }
    return serviceFee || "N/A";
  };

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "00:00";

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

  const calculateStats = (appointments, referrals, transactions) => {
    const stats = {
      upcomingAppointments: 0,
      pendingResults: 0,
      completedTests: 0,
      totalVisits: appointments.length + referrals.length + transactions.length,
      activeReferrals: 0,
      completedReferrals: 0,
    };

    const upcomingStatuses = [
      "pending",
      "confirmed",
      "scheduled",
      "requested",
      "approved",
      "processing",
      "in_progress",
    ];
    const completedStatuses = [
      "completed",
      "done",
      "finished",
      "results_ready",
    ];

    appointments.forEach((apt) => {
      const status = apt.status?.toLowerCase();
      if (upcomingStatuses.includes(status)) {
        stats.upcomingAppointments++;
        if (status === "pending") stats.pendingResults++;
      }
      if (completedStatuses.includes(status)) {
        stats.completedTests++;
      }
    });

    referrals.forEach((ref) => {
      const status = ref.status?.toLowerCase();
      if ([...upcomingStatuses, "active"].includes(status)) {
        stats.activeReferrals++;
        stats.upcomingAppointments++;
      }
      if (completedStatuses.includes(status)) {
        stats.completedReferrals++;
        stats.completedTests++;
      }
    });

    transactions.forEach((tx) => {
      const status = tx.status?.toLowerCase();

      if (
        status === "pending" ||
        status === "processing" ||
        status === "in_progress"
      ) {
        stats.pendingResults++;
        stats.upcomingAppointments++;
      }

      if (completedStatuses.includes(status)) {
        stats.completedTests++;
      }
    });

    setPatientData(stats);
  };

  const generateActivity = (appointments, referrals, transactions) => {
    console.log("Generating activity from:", {
      appointments: appointments.length,
      referrals: referrals.length,
      transactions: transactions.length,
    });

    const appointmentActivities = appointments.map((apt) => ({
      ...apt,
      activityType: "appointment",
    }));
    const referralActivities = referrals.map((ref) => ({
      ...ref,
      activityType: "referral",
    }));
    const transactionActivities = transactions.map((tx) => ({
      ...tx,
      activityType: "transaction",
    }));

    console.log(
      "Referrals being added to activity:",
      referrals.map((r) => ({
        id: r.id,
        status: r.status,
        testName: r.testName,
      }))
    );
    console.log(
      "Transactions being added to activity:",
      transactions.map((tx) => ({
        id: tx.id,
        status: tx.status,
        testName: tx.testName,
      }))
    );

    const sortedAppointments = appointmentActivities
      .sort(
        (a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime)
      )
      .slice(0, 8);

    const sortedReferrals = referralActivities
      .sort(
        (a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime)
      )
      .slice(0, 2);

    const sortedTransactions = transactionActivities
      .sort(
        (a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime)
      )
      .slice(0, 2);

    const allItems = [
      ...sortedAppointments,
      ...sortedReferrals,
      ...sortedTransactions,
    ]
      .sort(
        (a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime)
      )
      .slice(0, 10);

    console.log("Combined items for activity:", allItems.length);

    const sortedActivities = allItems.map((item) => {
      console.log(`Creating activity for item ${item.id}:`, {
        type: item.type,
        activityType: item.activityType,
        status: item.status,
      });
      return createActivityItem(item);
    });

    console.log(
      "Final activity items with details:",
      sortedActivities.map((a) => ({
        id: a.id,
        activityType: a.activityType,
        status: a.status,
        type: a.type,
        message: a.message.substring(0, 50) + "...",
      }))
    );
    setRecentActivity(sortedActivities);
  };

  const createActivityItem = (item) => {
    const status = item.status?.toLowerCase();
    const testName = item.testName || "Service";
    const doctor = item.doctor || "Staff";
    const clinicName = item.clinicName || "";

    const activityType = item.activityType;

    let uiActivityType = "appointment";
    let message = "";

    if (activityType === "referral") {
      uiActivityType =
        status === "completed"
          ? "result"
          : ["confirmed", "approved"].includes(status)
          ? "booking"
          : "referral";
      message =
        status === "completed"
          ? `Specialist consultation completed with ${doctor}`
          : `Referral ${
              status === "pending" ? "to" : status
            } ${doctor} for ${testName}${
              clinicName ? ` at ${clinicName}` : ""
            }`;
    } else if (item.type === "clinic_lab_request") {
      uiActivityType = ["completed", "results_ready"].includes(status)
        ? "result"
        : "appointment";
      message = `${testName} lab ${
        status === "completed" || status === "results_ready"
          ? "results available"
          : `request ${status}`
      }${
        clinicName
          ? ` ${
              status === "completed" || status === "results_ready"
                ? "from"
                : "at"
            } ${clinicName}`
          : ""
      }`;
    } else if (activityType === "transaction") {
      uiActivityType = ["completed", "results_ready"].includes(status)
        ? "result"
        : "appointment";

      const schedTime =
        item.labTestSched?.time || item.appointmentTime || "TBD";
      const schedDate = item.labTestSched?.date || "TBD";

      message = `${testName} ${
        status === "completed" || status === "results_ready"
          ? "results available"
          : `scheduled for ${schedDate} at ${schedTime}`
      }${clinicName ? ` at ${clinicName}` : ""}`;
    } else {
      uiActivityType =
        status === "completed"
          ? "result"
          : ["confirmed", "approved"].includes(status)
          ? "booking"
          : "appointment";
      message = `${testName} ${
        status === "completed"
          ? "consultation completed"
          : `appointment ${status}`
      } with ${doctor}`;
    }

    const scheduleDate = new Date(item.scheduledDateTime);
    const displayDate = !isNaN(scheduleDate.getTime())
      ? scheduleDate.toLocaleDateString()
      : item.labTestSched?.date || "Today";

    const displayTime =
      item.labTestSched?.time ||
      item.appointmentTime ||
      item.estimatedTime ||
      (!isNaN(scheduleDate.getTime())
        ? scheduleDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "TBD");

    return {
      id: item.id,
      type: uiActivityType,
      message,
      date: displayDate,
      time: displayTime,
      status: item.status,
      testName,
      doctor,
      source: item.source,
      appointmentType: item.type,
      activityType: activityType,
      clinicName,
      serviceFee: item.serviceFee,
    };
  };

  const handleFilterClick = (filterType) => {
    setActiveFilter(activeFilter === filterType ? "all" : filterType);
  };
  const getStatusColor = (status) => {
    const statusColors = {
      pending: "text-orange-600",
      requested: "text-orange-600",
      confirmed: "text-blue-600",
      scheduled: "text-blue-600",
      approved: "text-blue-600",
      completed: "text-green-600",
      done: "text-green-600",
      results_ready: "text-green-600",
      finished: "text-green-600",
      cancelled: "text-red-600",
      rejected: "text-red-600",
      processing: "text-purple-600",
      in_progress: "text-purple-600",
      sample_collected: "text-blue-600",
    };
    return statusColors[status?.toLowerCase()] || "text-gray-600";
  };

  const getActivityIcon = (type) => {
    const icons = {
      appointment: <Calendar className="w-4 h-4 text-blue-600" />,
      result: <FileText className="w-4 h-4 text-green-600" />,
      booking: <Clock className="w-4 h-4 text-orange-600" />,
      referral: <UserCheck className="w-4 h-4 text-purple-600" />,
      medical_transaction: <Stethoscope className="w-4 h-4 text-indigo-600" />,
    };
    return icons[type] || <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getActivityBgColor = (type) => {
    const bgColors = {
      appointment: "bg-blue-100",
      result: "bg-green-100",
      booking: "bg-orange-100",
      referral: "bg-purple-100",
      medical_transaction: "bg-indigo-100",
    };
    return bgColors[type] || "bg-gray-100";
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.firstName || user?.name || "Patient"}!
          </h1>
          <p className="text-gray-600">Here's your health dashboard overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[
            {
              label: "Upcoming Appointments",
              value: patientData.upcomingAppointments,
              color: "blue",
              icon: Calendar,
              filter: "upcoming",
            },
            {
              label: "Pending",
              value: patientData.pendingResults,
              color: "orange",
              icon: Clock,
              filter: "pending",
            },
            {
              label: "Completed",
              value: patientData.completedTests,
              color: "green",
              icon: FileText,
              filter: "completed",
            },
            {
              label: "Active Referrals",
              value: patientData.activeReferrals,
              color: "purple",
              icon: UserCheck,
              filter: "referrals",
            },
            {
              label: "Completed Referrals",
              value: patientData.completedReferrals,
              color: "indigo",
              icon: Stethoscope,
              filter: "referrals-completed",
            },
            {
              label: "Total Visits",
              value: patientData.totalVisits,
              color: "gray",
              icon: Activity,
              filter: "all",
            },
          ].map((stat, index) => {
            const Icon = stat.icon;
            const isActive = activeFilter === stat.filter;
            return (
              <div
                key={index}
                onClick={() => handleFilterClick(stat.filter)}
                className={`bg-white p-6 rounded-2xl shadow-lg border-l-4 transition duration-300 hover:shadow-xl cursor-pointer transform hover:scale-105 ${
                  isActive
                    ? `border-${stat.color}-600 bg-${stat.color}-50 ring-2 ring-${stat.color}-200`
                    : `border-${stat.color}-500 hover:border-${stat.color}-600`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-sm font-medium mb-1 ${
                        isActive ? `text-${stat.color}-700` : "text-gray-600"
                      }`}
                    >
                      {stat.label}
                    </h3>
                    <p className={`text-2xl font-bold text-${stat.color}-600`}>
                      {stat.value}
                    </p>
                    {isActive && (
                      <p className="text-xs text-gray-500 mt-1">
                        Click to clear filter
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      isActive ? `bg-${stat.color}-200` : `bg-${stat.color}-100`
                    }`}
                  >
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Showing:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {activeFilter === "upcoming" && "Upcoming Appointments"}
              {activeFilter === "pending" && "Pending Items"}
              {activeFilter === "completed" && "Completed Items"}
              {activeFilter === "referrals" && "Active Referrals"}
              {activeFilter === "referrals-completed" && "Completed Referrals"}
            </span>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear filter
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Bell className="w-6 h-6 text-gray-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">
              Recent Activity
            </h2>
          </div>

          {filteredActivity.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {filteredActivity.map((activity, index) => (
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
                              : activity.activityType === "transaction"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {activity.activityType === "referral"
                            ? "Referral"
                            : activity.activityType === "transaction"
                            ? "Transaction"
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
                <button
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  onClick={() => navigate("/PatientReferral")}
                >
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
