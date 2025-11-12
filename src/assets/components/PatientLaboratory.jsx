import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import {
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  X,
  CheckCircle2,
  Navigation,
  Microscope,
  UserCheck,
  FlaskConical,
} from "lucide-react";

function PatientLaboratory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [clinics, setClinics] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userDataForFetch, setUserDataForFetch] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(userData);
    setUserDataForFetch(userData);
    fetchClinics();
  }, [navigate]);

  useEffect(() => {
    if (userDataForFetch && Object.keys(clinics).length > 0) {
      fetchUserTransactions(userDataForFetch);
    }
  }, [userDataForFetch, clinics]);

  const isUserMatch = (transactionData, currentUser) => {
    const currentUserUIDs = [
      currentUser.uid,
      currentUser.userId,
      currentUser.id,
      currentUser.patientId,
    ].filter(Boolean);

    const transactionUIDs = [
      transactionData.patientId,
      transactionData.uid,
      transactionData.userId,
    ].filter(Boolean);

    const uidMatch = transactionUIDs.some((uid) =>
      currentUserUIDs.includes(uid)
    );
    return uidMatch;
  };

  const fetchClinics = () => {
    const clinicsRef = ref(database, "clinics");
    onValue(
      clinicsRef,
      (snapshot) => {
        const clinicsData = snapshot.val() || {};
        setClinics(clinicsData);
      },
      (error) => {
        console.error("Error fetching clinics:", error);
        setClinics({});
      }
    );
  };

  const fetchUserTransactions = (userData) => {
    setLoading(true);

    const dataRefs = {
      medicalServicesTransactions: ref(database, "medicalServicesTransactions"),
    };

    let loadedData = {};
    let dataLoadCount = 0;
    const totalLoads = Object.keys(dataRefs).length;

    const processAllData = () => {
      if (dataLoadCount === totalLoads) {
        const userTransactions = [];
        const transactionsData = loadedData.medicalServicesTransactions;

        if (transactionsData) {
          Object.keys(transactionsData).forEach((key) => {
            const transaction = transactionsData[key];

            // **CHANGE 1: Filter to only include "laboratoryTests"**
            if (transaction.serviceCategory !== "laboratoryTests") {
              return;
            }
            // **End of CHANGE 1**

            if (isUserMatch(transaction, userData)) {
              const standardizedTx = createTransactionItem(key, transaction);
              userTransactions.push(standardizedTx);
            }
          });
        }

        const sortedTransactions = userTransactions.sort(
          (a, b) =>
            new Date(b.scheduledDateTime || 0) -
            new Date(a.scheduledDateTime || 0)
        );
        setTransactions(sortedTransactions);
        setLoading(false);
      }
    };

    onValue(
      dataRefs.medicalServicesTransactions,
      (snapshot) => {
        loadedData.medicalServicesTransactions = snapshot.val() || {};
        dataLoadCount++;
        processAllData();
      },
      () => {
        loadedData.medicalServicesTransactions = {};
        dataLoadCount++;
        processAllData();
      }
    );
  };

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "00:00";
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

  const getScheduledDateTime = (data) => {
    if (data.labTestSched?.date && data.labTestSched?.time) {
      return `${data.labTestSched.date}T${convertTo24Hour(
        data.labTestSched.time
      )}`;
    }
    if (data.completedAt && data.resultStatus?.toLowerCase() === "completed") {
      return data.completedAt;
    }
    return data.createdAt || new Date().toISOString();
  };

  const createTransactionItem = (id, data) => {
    const clinicId = data.clinicId;
    const clinicInfo = clinics[clinicId] || {};

    const mainStatus = data.resultStatus || data.sampleStatus || "pending";

    // **CHANGE 2: Set testName to "Laboratory Test" for "laboratoryTests" category**
    let testName = data.department || "Lab Service";
    if (data.serviceCategory === "laboratoryTests") {
      testName = "Laboratory Test";
    } else if (data.serviceCategory) {
      testName = data.serviceCategory;
    }
    // **End of CHANGE 2**

    return {
      id,
      ...data,
      testName,
      status: mainStatus,
      date: data.labTestSched?.date || "TBD",
      time: data.labTestSched?.time || "TBD",
      requestedByName: data.requestedByName || "Generalist",
      processedBy: data.completedBy || "Lab Technician",
      processedByDepartment: data.department || "Lab Staff",
      clinicName: clinicInfo.name || "Unknown Clinic",
      clinicType: clinicInfo.type || "N/A",
      clinicAddress: clinicInfo.addressLine || "N/A",
      clinicContact: clinicInfo.contactNumber || "N/A",
      resultSummary: data.resultData || "",
      notes: data.patientNotes || data.resultNotes || "",
      scheduledDateTime: getScheduledDateTime(data),
    };
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "results_ready":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          badgeColor: "bg-green-100 text-green-800",
        };
      case "processing":
      case "in_progress":
      case "sample_collected":
        return {
          icon: Microscope,
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          borderColor: "border-purple-200",
          badgeColor: "bg-purple-100 text-purple-800",
        };
      case "cancelled":
      case "rejected":
        return {
          icon: X,
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          badgeColor: "bg-red-100 text-red-800",
        };
      case "pending":
      default:
        return {
          icon: Clock,
          bgColor: "bg-amber-50",
          textColor: "text-amber-700",
          borderColor: "border-amber-200",
          badgeColor: "bg-amber-100 text-amber-800",
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "TBD") return "N/A";
    if (dateString.includes("-") && !isNaN(new Date(dateString))) {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return dateString;
  };

  const formatTime = (timeString) => timeString || "N/A";

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    return new Date(dateTimeString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">
              {!user ? "Loading user data..." : "Loading your lab requests..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-center flex-1">
                Your Laboratory Tests
              </h1>
            </div>
            <p className="text-center text-purple-100 mt-2">
              Track the status and results of your lab requests
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {transactions.length > 0 ? (
              transactions.map((transaction) => {
                const statusConfig = getStatusConfig(transaction.status);
                const StatusIcon = statusConfig.icon;
                const isReady =
                  transaction.status?.toLowerCase() === "completed" ||
                  transaction.status?.toLowerCase() === "results_ready";

                return (
                  <div
                    key={transaction.id}
                    className={`bg-white rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${statusConfig.borderColor}`}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-full ${statusConfig.bgColor}`}
                          >
                            <StatusIcon
                              className={`h-5 w-5 ${statusConfig.textColor}`}
                            />
                          </div>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeColor}`}
                          >
                            {transaction.status || "Pending"}
                          </span>
                          {isReady && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                              Results Ready!
                            </span>
                          )}
                        </div>

                        {isReady && (
                          <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-green-700 transition">
                            <span>View Full Report</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-4">
                            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {transaction.testName?.charAt(0) || "L"}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {transaction.testName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {transaction.department || "Laboratory Service"}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Test Appointment Details
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium text-gray-900">
                                  {formatDate(transaction.date)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Time:</span>
                                <span className="font-medium text-gray-900">
                                  {formatTime(transaction.time)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                              Laboratory Location
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.clinicName}
                                </p>
                                <p className="text-xs text-gray-600 capitalize">
                                  {transaction.clinicType}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-start space-x-2">
                                  <Navigation className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-gray-700">
                                    <p>{transaction.clinicAddress || "N/A"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-700">
                                    {transaction.clinicContact || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-blue-50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <UserCheck className="h-4 w-4 mr-2" />
                              Requested By
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.requestedByName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Referring Clinician
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-purple-50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <Microscope className="h-4 w-4 mr-2" />
                              Processed By
                            </h4>
                            <p className="text-sm text-gray-700">
                              **{transaction.processedBy}**
                            </p>
                            <p className="text-xs text-gray-600">
                              {transaction.processedByDepartment || "Lab Staff"}
                            </p>
                          </div>

                          <div className={`rounded-xl p-4 bg-amber-50`}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <FlaskConical className="h-4 w-4 mr-2" />
                              Test Results Summary
                            </h4>
                            <p className="text-sm text-gray-700">
                              {transaction.resultSummary ||
                                transaction.notes ||
                                "Awaiting results or notes from the lab."}
                            </p>
                          </div>

                          {isReady && transaction.completedAt && (
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Completion Details
                              </h4>
                              <p className="text-sm text-green-700">
                                Completed on:{" "}
                                {formatDateTime(transaction.completedAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <Microscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Lab Requests Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't received any active or completed lab requests.
                </p>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes slide-in-right {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

export default PatientLaboratory;
