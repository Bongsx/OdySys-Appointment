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
  AlertCircle,
  Info,
  ArrowRight,
  Building,
  X,
  CheckCircle2,
  Bell,
  ArrowLeft,
  Navigation,
} from "lucide-react";

function PatientReferral() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState([]);
  const [clinics, setClinics] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(userData);
    fetchUserReferrals(userData);
    fetchClinics();
  }, []);

  const isUserMatch = (referralData, currentUser, usersData) => {
    const currentUserEmail = currentUser.email?.toLowerCase();
    const currentUserUIDs = [
      currentUser.uid,
      currentUser.userId,
      currentUser.id,
      currentUser.patientId,
    ].filter(Boolean);

    const referralUIDs = [
      referralData.uid,
      referralData.userId,
      referralData.patientUID,
      referralData.patientId,
      referralData.patient?.uid,
      referralData.patient?.userId,
      referralData.createdBy?.uid,
      referralData.createdBy?.userId,
      referralData.userRef,
      referralData.patientRef,
    ].filter(Boolean);

    const uidMatch = referralUIDs.some((uid) => currentUserUIDs.includes(uid));

    const referralEmails = [
      referralData.email?.toLowerCase(),
      referralData.patientEmail?.toLowerCase(),
      referralData.patient?.email?.toLowerCase(),
      referralData.createdBy?.email?.toLowerCase(),
    ].filter(Boolean);
    const emailMatch =
      currentUserEmail && referralEmails.includes(currentUserEmail);

    const nameMatch =
      currentUser.firstName &&
      currentUser.lastName &&
      referralData.patientFirstName?.toLowerCase() ===
        currentUser.firstName.toLowerCase() &&
      referralData.patientLastName?.toLowerCase() ===
        currentUser.lastName.toLowerCase();

    let userNodeMatch = false;
    if (!uidMatch && !emailMatch && referralEmails.length > 0 && usersData) {
      Object.keys(usersData).forEach((userUID) => {
        const userData = usersData[userUID];
        if (
          userData.email?.toLowerCase() === currentUserEmail &&
          referralEmails.includes(userData.email?.toLowerCase())
        ) {
          userNodeMatch = true;
        }
      });
    }

    return uidMatch || emailMatch || nameMatch || userNodeMatch;
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

  const fetchUserReferrals = (userData) => {
    setLoading(true);

    const usersRef = ref(database, "users");
    const referralsRef = ref(database, "referrals");

    let usersData = null;
    let referralsData = null;
    let dataLoadCount = 0;

    const processAllData = () => {
      if (dataLoadCount === 2) {
        const userReferrals = [];

        let currentUserFromDB = null;
        if (usersData && (userData.uid || userData.patientId)) {
          currentUserFromDB =
            usersData[userData.uid] ||
            usersData[userData.patientId] ||
            Object.values(usersData).find(
              (user) =>
                user.email?.toLowerCase() === userData.email?.toLowerCase()
            );
        }

        const userForMatching = currentUserFromDB || userData;

        if (referralsData) {
          Object.keys(referralsData).forEach((key) => {
            const referral = referralsData[key];

            if (isUserMatch(referral, userForMatching, usersData)) {
              userReferrals.push({
                id: key,
                ...referral,
                createdAt:
                  referral.createdAt ||
                  referral.timestamp ||
                  new Date().toISOString(),
              });
            }
          });
        }

        const sortedReferrals = userReferrals.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setReferrals(sortedReferrals);

        const confirmedReferrals = sortedReferrals.filter(
          (referral) =>
            referral.status?.toLowerCase() === "confirmed" &&
            referral.confirmedAt &&
            new Date(referral.confirmedAt) >
              new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        if (confirmedReferrals.length > 0 && !showNotification) {
          setNotifications(confirmedReferrals);
          setShowNotification(true);
        }

        setLoading(false);
      }
    };

    onValue(
      usersRef,
      (snapshot) => {
        usersData = snapshot.val() || {};
        dataLoadCount++;
        processAllData();
      },
      () => {
        usersData = {};
        dataLoadCount++;
        processAllData();
      }
    );

    onValue(
      referralsRef,
      (snapshot) => {
        referralsData = snapshot.val() || {};
        dataLoadCount++;
        processAllData();
      },
      () => {
        referralsData = {};
        dataLoadCount++;
        processAllData();
      }
    );
  };

  // Function to get clinic details from clinics data
  const getClinicDetails = (clinicId) => {
    if (!clinicId || !clinics) return null;
    return clinics[clinicId] || null;
  };

  // Function to combine full names (same as AdminSpecialist)
  const getFullName = (firstName, middleName, lastName) => {
    const middle = middleName ? ` ${middleName} ` : " ";
    return `${firstName}${middle}${lastName}`.replace(/\s+/g, " ").trim();
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          badgeColor: "bg-green-100 text-green-800",
        };
      case "completed":
        return {
          icon: CheckCircle2,
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
          badgeColor: "bg-blue-100 text-blue-800",
        };
      case "cancelled":
        return {
          icon: X,
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          badgeColor: "bg-red-100 text-red-800",
        };
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
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => timeString || "N/A";

  const dismissNotification = () => setShowNotification(false);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">
              {!user ? "Loading user data..." : "Loading your referrals..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Notification Banner */}
        {showNotification && notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            {notifications.map((referral, index) => (
              <div
                key={referral.id}
                className="bg-white rounded-xl shadow-xl border border-green-200 p-4 mb-3 animate-slide-in-right"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Referral Confirmed! 🎉
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Your referral to Dr.{" "}
                      {getFullName(
                        referral.assignedSpecialistFirstName,
                        referral.assignedSpecialistMiddleName,
                        referral.assignedSpecialistLastName
                      )}{" "}
                      is confirmed for {formatDate(referral.appointmentDate)}
                    </p>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      You may now visit the specialist!
                    </p>
                  </div>
                  <button
                    onClick={dismissNotification}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-center flex-1">
                My Referrals
              </h1>
            </div>
            <p className="text-center text-purple-100 mt-2">
              Track your specialist referrals and appointment status
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Referrals List */}
          <div className="space-y-4">
            {referrals.length > 0 ? (
              referrals.map((referral) => {
                const statusConfig = getStatusConfig(referral.status);
                const StatusIcon = statusConfig.icon;
                const isConfirmed =
                  referral.status?.toLowerCase() === "confirmed";
                const clinic = getClinicDetails(
                  referral.practiceLocation?.clinicId
                );

                return (
                  <div
                    key={referral.id}
                    className={`bg-white rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${
                      isConfirmed
                        ? "border-green-200 bg-gradient-to-r from-green-50 to-white"
                        : statusConfig.borderColor
                    }`}
                  >
                    <div className="p-6">
                      {/* Status Badge and Actions */}
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
                            {referral.status || "Pending"}
                          </span>
                          {isConfirmed && (
                            <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                              <Bell className="h-4 w-4" />
                              <span>Ready to Visit!</span>
                            </div>
                          )}
                        </div>

                        {isConfirmed && (
                          <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 animate-bounce">
                            <span>Proceed to Specialist</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Referral Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Specialist & Schedule Info */}
                        <div className="space-y-4">
                          <div className="flex items-start space-x-4">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {getFullName(
                                referral.assignedSpecialistFirstName,
                                referral.assignedSpecialistMiddleName,
                                referral.assignedSpecialistLastName
                              ).charAt(0) || "S"}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Dr.{" "}
                                {getFullName(
                                  referral.assignedSpecialistFirstName,
                                  referral.assignedSpecialistMiddleName,
                                  referral.assignedSpecialistLastName
                                )}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Specialist
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Appointment Details
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium text-gray-900">
                                  {formatDate(referral.appointmentDate)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Time:</span>
                                <span className="font-medium text-gray-900">
                                  {formatTime(referral.appointmentTime)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Practice Location Section */}
                          {(clinic ||
                            referral.practiceLocation?.roomOrUnit) && (
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                                Practice Location
                              </h4>
                              <div className="space-y-3">
                                {clinic && (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {clinic.name}
                                      </p>
                                      <p className="text-xs text-gray-600 capitalize">
                                        {clinic.type}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-start space-x-2">
                                        <Navigation className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-xs text-gray-700">
                                          <p>{clinic.address}</p>
                                          <p>
                                            {clinic.city}, {clinic.province}
                                          </p>
                                        </div>
                                      </div>
                                      {clinic.phone && (
                                        <div className="flex items-center space-x-2">
                                          <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                          <span className="text-xs text-gray-700">
                                            {clinic.phone}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                {referral.practiceLocation?.roomOrUnit && (
                                  <div className="bg-indigo-100 px-3 py-2 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <Building className="h-3 w-3 text-indigo-600" />
                                      <span className="text-sm font-medium text-indigo-800">
                                        {referral.practiceLocation.roomOrUnit}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Referring Doctor & Reason */}
                        <div className="space-y-4">
                          <div className="bg-blue-50 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              Referring Doctor
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Dr.{" "}
                                  {getFullName(
                                    referral.referringGeneralistFirstName,
                                    "",
                                    referral.referringGeneralistLastName
                                  )}
                                </p>
                                {referral.referringClinicName && (
                                  <p className="text-xs text-gray-600">
                                    {referral.referringClinicName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {referral.initialReasonForReferral && (
                            <div className="bg-purple-50 rounded-xl p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <Info className="h-4 w-4 mr-2" />
                                Reason for Referral
                              </h4>
                              <p className="text-sm text-gray-700">
                                {referral.initialReasonForReferral}
                              </p>
                            </div>
                          )}

                          {referral.generalistNotes && (
                            <div className="bg-amber-50 rounded-xl p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Doctor's Notes
                              </h4>
                              <p className="text-sm text-gray-700">
                                {referral.generalistNotes}
                              </p>
                            </div>
                          )}

                          {isConfirmed && referral.confirmedAt && (
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirmation Details
                              </h4>
                              <p className="text-sm text-green-700">
                                Confirmed on:{" "}
                                {new Date(
                                  referral.confirmedAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <div className="mt-3 p-3 bg-green-100 rounded-lg border-l-4 border-green-400">
                                <p className="text-sm text-green-800 font-medium">
                                  ✅ Your referral is confirmed! Please arrive
                                  10 minutes early.
                                </p>
                              </div>
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
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Referrals Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't received any specialist referrals yet. Visit your
                  general practitioner for a referral if needed.
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

export default PatientReferral;
