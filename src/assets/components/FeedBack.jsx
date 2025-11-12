import { useEffect, useState } from "react";
import React from "react";
import {
  ref,
  push,
  set,
  onValue,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import Sidebar from "./Sidebar";
import {
  CheckCircle,
  AlertCircle,
  Star,
  User,
  Mail,
  MessageCircle,
  ArrowLeft,
  Plus,
  X,
  Stethoscope,
  Calendar,
  MapPin,
  Tag,
  Eye,
  EyeOff,
  Send,
  UserCheck,
} from "lucide-react";

function Feedback() {
  const navigate = useNavigate();
  const [user, loading, error] = useAuthState(auth);

  const [form, setForm] = useState({
    patientName: "",
    patientEmail: "",
    appointmentDate: "",
    doctorId: "",
    doctorName: "",
    clinicId: "",
    clinicName: "",
    treatmentType: "Consultation",
    rating: 0,
    comment: "",
    tags: [],
    isAnonymous: false,
    serviceType: "", // New field to track service type
    referralId: "", // New field for referral ID
  });

  const [doctorList, setDoctorList] = useState([]);
  const [clinicList, setClinicList] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [referrals, setReferrals] = useState([]); // New state for referrals
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Predefined tag options
  const tagOptions = [
    "professional",
    "thorough",
    "excellent",
    "punctual",
    "caring",
    "knowledgeable",
    "friendly",
    "efficient",
    "clean",
    "comfortable",
    "responsive",
    "helpful",
    "specialist",
    "referral",
  ];

  // Required fields
  const requiredFields = [
    "patientName",
    "patientEmail",
    "appointmentDate",
    "doctorId",
    "clinicId",
    "rating",
    "comment",
  ];

  // Validation functions
  const isFieldEmpty = (value) => {
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return !value || value.toString().trim() === "";
  };

  const validateEmail = (email) => {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Check if a field is valid
  const isFieldValid = (field) => {
    const value = form[field];
    if (isFieldEmpty(value)) return false;

    // Special validation for email
    if (field === "patientEmail" && !validateEmail(value)) return false;

    // Special validation for rating
    if (field === "rating" && (value < 1 || value > 5)) return false;

    return true;
  };

  // Enhanced user matching function for referrals
  const isReferralMatch = (referralData, currentUser, usersData) => {
    const currentUserEmail = currentUser.email?.toLowerCase();
    const currentUserUID =
      currentUser.uid || currentUser.userId || currentUser.id;

    console.log("=== REFERRAL MATCHING DEBUG (Feedback) ===");
    console.log("Current User Info:", {
      email: currentUserEmail,
      uid: currentUserUID,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
    });
    console.log("Referral Data:", {
      patientId: referralData.patientId,
      patientFirstName: referralData.patientFirstName,
      patientLastName: referralData.patientLastName,
      status: referralData.status,
    });

    // Primary matching - Patient ID
    const patientUIDs = [
      referralData.patientId,
      referralData.patientUID,
      referralData.userId,
    ].filter(Boolean);

    const uidMatch = patientUIDs.some((uid) => uid === currentUserUID);
    console.log("UID Match:", uidMatch);

    // Secondary matching - Name matching
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

    if (
      currentUserFirstName &&
      currentUserLastName &&
      referralFirstName &&
      referralLastName
    ) {
      nameMatch =
        currentUserFirstName === referralFirstName &&
        currentUserLastName === referralLastName;
    }

    // Tertiary matching - Cross-reference with users node
    let userNodeMatch = false;
    if (!uidMatch && !nameMatch && usersData) {
      const currentUserFromDB = usersData[currentUserUID];
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
        }
      }

      // Email cross-reference
      if (referralData.patientId && usersData[referralData.patientId]) {
        const patientUser = usersData[referralData.patientId];
        if (patientUser.email?.toLowerCase() === currentUserEmail) {
          userNodeMatch = true;
        }
      }
    }

    const isMatch = uidMatch || nameMatch || userNodeMatch;
    console.log("FINAL REFERRAL MATCH RESULT (Feedback):", isMatch);
    console.log("=============================================");

    return isMatch;
  };

  // Function to fetch current user data
  const fetchCurrentUserData = async (userId) => {
    try {
      setLoadingData(true);
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();

        setForm((prevForm) => ({
          ...prevForm,
          patientName:
            userData.firstName && userData.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData.name || "",
          patientEmail: userData.email || "",
        }));

        // Mark pre-populated fields as touched
        setTouched((prev) => ({
          ...prev,
          patientName: !!(userData.firstName || userData.name),
          patientEmail: !!userData.email,
        }));

        setUserDataLoaded(true);
      } else {
        console.log("No user data found for current user");
        setUserDataLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserDataLoaded(true);
    } finally {
      setLoadingData(false);
    }
  };

  // Enhanced function to fetch user appointments, lab requests, and referrals
  const fetchUserServices = async (userId) => {
    try {
      const userEmail = user?.email || "";

      // Fetch users data for referral matching
      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.val() || {};

      // Get current user data
      const currentUser = usersData[userId] || {
        uid: userId,
        email: userEmail,
        firstName: user?.displayName?.split(" ")[0] || "",
        lastName: user?.displayName?.split(" ").slice(1).join(" ") || "",
      };

      // Fetch regular appointments
      const appointmentsRef = ref(database, "appointments");
      const userAppointmentsQuery = query(
        appointmentsRef,
        orderByChild("patient/email"),
        equalTo(userEmail)
      );

      // Fetch clinic lab requests
      const labRequestsRef = ref(database, "clinicLabRequests");

      // Fetch referrals
      const referralsRef = ref(database, "referrals");

      onValue(userAppointmentsQuery, (snapshot) => {
        const appointmentsData = snapshot.val();
        let completedAppointments = [];

        if (appointmentsData) {
          const appointmentsList = Object.entries(appointmentsData).map(
            ([id, appointment]) => ({
              id,
              ...appointment,
              type: appointment.type || "General Consultation",
              source: "appointments",
            })
          );

          // Filter completed appointments
          completedAppointments = appointmentsList.filter(
            (appointment) => appointment.status === "Completed"
          );
        }

        // Fetch lab requests
        onValue(labRequestsRef, (labSnapshot) => {
          const labData = labSnapshot.val();
          let completedLabRequests = [];

          if (labData) {
            const labRequestsList = Object.entries(labData)
              .map(([id, labRequest]) => ({
                id,
                ...labRequest,
                source: "clinicLabRequests",
              }))
              .filter(
                (labRequest) =>
                  labRequest.patient?.email === userEmail &&
                  labRequest.status === "Completed"
              );

            // Transform lab requests to match appointment structure
            completedLabRequests = labRequestsList.map((labRequest) => ({
              id: labRequest.id,
              appointmentDate:
                labRequest.appointmentDate || labRequest.requestDate,
              appointmentTime: labRequest.appointmentTime || "Lab Service",
              doctor: labRequest.doctorName || "Laboratory Service",
              clinicName: labRequest.clinicName,
              clinicId: labRequest.clinicId,
              type: `Lab Test - ${
                labRequest.testType || labRequest.labTestType || "Various Tests"
              }`,
              status: labRequest.status,
              patient: labRequest.patient,
              source: "clinicLabRequests",
              testType: labRequest.testType || labRequest.labTestType,
              labResults: labRequest.labResults,
            }));
          }

          // Fetch referrals
          onValue(referralsRef, (referralsSnapshot) => {
            const referralsData = referralsSnapshot.val();
            let completedReferrals = [];

            if (referralsData) {
              console.log("=== FETCHING REFERRALS FOR FEEDBACK ===");
              console.log(
                "Total referrals in database:",
                Object.keys(referralsData).length
              );
              console.log("Current user for matching:", currentUser);

              const referralsList = Object.entries(referralsData)
                .map(([id, referral]) => ({
                  id,
                  ...referral,
                  source: "referrals",
                }))
                .filter((referral) => {
                  const isCompleted = referral.status === "completed";
                  const isMatch = isReferralMatch(
                    referral,
                    currentUser,
                    usersData
                  );
                  console.log(
                    `Referral ${referral.id}: completed=${isCompleted}, match=${isMatch}`
                  );
                  return isCompleted && isMatch;
                });

              // Transform referrals to match appointment structure
              completedReferrals = referralsList.map((referral) => ({
                id: referral.id,
                appointmentDate:
                  referral.appointmentDate ||
                  new Date(referral.referralTimestamp)
                    .toISOString()
                    .split("T")[0],
                appointmentTime:
                  referral.appointmentTime || "Specialist Consultation",
                doctor:
                  `${referral.assignedSpecialistFirstName || ""} ${
                    referral.assignedSpecialistLastName || ""
                  }`.trim() || "Specialist",
                clinicName:
                  referral.referringClinicName ||
                  referral.practiceLocation ||
                  "Specialist Clinic",
                clinicId: referral.referringClinicId || "",
                type: `Specialist Referral - ${
                  referral.initialReasonForReferral || "Consultation"
                }`,
                status: referral.status,
                source: "referrals",
                // Additional referral-specific fields
                referralId: referral.id,
                initialReasonForReferral: referral.initialReasonForReferral,
                assignedSpecialistId: referral.assignedSpecialistId,
                referringDoctor: `${
                  referral.referringGeneralistFirstName || ""
                } ${referral.referringGeneralistLastName || ""}`.trim(),
                generalistNotes: referral.generalistNotes,
                patientArrivalConfirmed: referral.patientArrivalConfirmed,
                referralTimestamp: referral.referralTimestamp,
                lastUpdated: referral.lastUpdated,
              }));

              console.log(
                "Completed referrals found:",
                completedReferrals.length
              );
            }

            // Combine all services
            const allCompletedServices = [
              ...completedAppointments,
              ...completedLabRequests,
              ...completedReferrals,
            ];

            // Sort by date (most recent first)
            allCompletedServices.sort((a, b) => {
              const dateA = new Date(a.appointmentDate);
              const dateB = new Date(b.appointmentDate);
              return dateB - dateA;
            });

            console.log("=== ALL COMPLETED SERVICES ===");
            console.log("Total services:", allCompletedServices.length);
            console.log("Appointments:", completedAppointments.length);
            console.log("Lab Requests:", completedLabRequests.length);
            console.log("Referrals:", completedReferrals.length);

            setAppointments(allCompletedServices);
          });
        });
      });
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  useEffect(() => {
    if (user && !userDataLoaded) {
      fetchCurrentUserData(user.uid);
      fetchUserServices(user.uid);
    }
  }, [user, userDataLoaded]);

  useEffect(() => {
    const docRef = ref(database, "doctors");
    const clinicsRef = ref(database, "clinics");

    onValue(docRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, doctor]) => ({
          id,
          ...doctor,
        }));
        setDoctorList(list);
      }
    });

    onValue(clinicsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const clinics = Object.entries(data).map(([id, clinic]) => ({
          id,
          ...clinic,
        }));
        setClinicList(clinics);
      }
    });
  }, []);

  // Input styling based on validation state
  const inputStyle = (field) => {
    const hasError = errors[field];
    const isTouched = touched[field];
    const isValid = isFieldValid(field);

    if (hasError) {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 transition-colors focus:outline-none";
    } else if (isTouched && isValid) {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 transition-colors focus:outline-none";
    } else {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 transition-colors focus:outline-none";
    }
  };

  const iconStyle = "absolute right-3 top-3 w-5 h-5";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Mark field as touched
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleAppointmentSelect = (e) => {
    const appointmentId = e.target.value;
    const appointment = appointments.find((apt) => apt.id === appointmentId);

    if (appointment) {
      setSelectedAppointment(appointment);

      // Handle different data structures based on source
      let doctorName, doctorId, treatmentType, serviceType;

      if (appointment.source === "clinicLabRequests") {
        // Lab request structure
        doctorName = appointment.doctorName || "Laboratory Service";
        doctorId = appointment.doctorId || "";
        treatmentType =
          appointment.type ||
          `Lab Test - ${appointment.testType || "Various Tests"}`;
        serviceType = "lab";
      } else if (appointment.source === "referrals") {
        // Referral structure
        doctorName = appointment.doctor;
        doctorId = appointment.assignedSpecialistId || "";
        treatmentType =
          appointment.type ||
          appointment.initialReasonForReferral ||
          "Specialist Consultation";
        serviceType = "referral";
      } else {
        // Regular appointment structure
        doctorName = appointment.doctor;
        // Find doctor ID from doctor list
        const doctor = doctorList.find(
          (doc) => doc.fullName === appointment.doctor
        );
        doctorId = doctor?.id || "";
        treatmentType = appointment.type || "General Consultation";
        serviceType = "appointment";
      }

      setForm((prev) => ({
        ...prev,
        appointmentDate: appointment.appointmentDate,
        doctorId: doctorId,
        doctorName: doctorName,
        clinicId: appointment.clinicId,
        clinicName: appointment.clinicName,
        treatmentType: treatmentType,
        serviceType: serviceType,
        referralId: appointment.source === "referrals" ? appointment.id : "",
      }));

      // Mark fields as touched
      setTouched((prev) => ({
        ...prev,
        appointmentDate: true,
        doctorId: true,
        clinicId: true,
      }));
    }
  };

  const handleRatingClick = (rating) => {
    setForm((prev) => ({ ...prev, rating }));
    setTouched((prev) => ({ ...prev, rating: true }));

    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: false }));
    }
  };

  const handleTagToggle = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Validation
  const validate = () => {
    const newErrors = {};

    // Check required fields
    requiredFields.forEach((field) => {
      if (isFieldEmpty(form[field])) {
        newErrors[field] = true;
      }
    });

    // Check email format
    if (form.patientEmail && !validateEmail(form.patientEmail)) {
      newErrors.patientEmail = true;
    }

    // Check rating range
    if (form.rating < 1 || form.rating > 5) {
      newErrors.rating = true;
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    setSubmitting(true);
    setLoadingData(true);

    try {
      const newRef = push(ref(database, `feedback`));
      const createdAt = Date.now();

      const feedbackData = {
        id: newRef.key,
        patientName: form.isAnonymous ? "Anonymous" : form.patientName,
        patientEmail: form.patientEmail,
        appointmentDate: form.appointmentDate,
        doctorId: form.doctorId,
        doctorName: form.doctorName,
        clinicId: form.clinicId,
        clinicName: form.clinicName,
        treatmentType: form.treatmentType,
        rating: parseInt(form.rating),
        comment: form.comment,
        tags: form.tags,
        isAnonymous: form.isAnonymous,
        serviceType: form.serviceType, // Track service type
        referralId: form.referralId, // Include referral ID if applicable
        createdAt: createdAt,
        status: "pending",
      };

      await set(newRef, feedbackData);

      alert("✅ Feedback submitted successfully! Thank you for your review.");

      // Reset form
      setForm({
        patientName: form.isAnonymous ? "" : form.patientName,
        patientEmail: form.patientEmail,
        appointmentDate: "",
        doctorId: "",
        doctorName: "",
        clinicId: "",
        clinicName: "",
        treatmentType: "Consultation",
        rating: 0,
        comment: "",
        tags: [],
        isAnonymous: false,
        serviceType: "",
        referralId: "",
      });

      setSelectedAppointment(null);
      setTouched({});
      setErrors({});
      setHoveredRating(0);

      navigate("/");
    } catch (err) {
      console.error("Feedback submission error:", err);
      alert("❌ Error submitting feedback: " + err.message);
    }

    setSubmitting(false);
    setLoadingData(false);
  };

  const renderInput = (
    field,
    type = "text",
    placeholder = "",
    icon = null,
    label = ""
  ) => {
    const hasError = errors[field];
    const isTouched = touched[field];
    const isValid = isFieldValid(field);

    const showGreenCheck = isTouched && isValid && !hasError;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon &&
            React.createElement(icon, {
              className: "absolute left-3 top-3 w-5 h-5 text-gray-400",
            })}
          <input
            name={field}
            type={type}
            value={form[field]}
            onChange={handleChange}
            onBlur={() => setTouched((prev) => ({ ...prev, [field]: true }))}
            placeholder={placeholder}
            className={inputStyle(field)}
            disabled={submitting}
          />
          {showGreenCheck ? (
            <CheckCircle className={`${iconStyle} text-green-600`} />
          ) : (
            <AlertCircle className={`${iconStyle} text-red-500`} />
          )}
        </div>
      </div>
    );
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              star <= (hoveredRating || form.rating)
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            }`}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => handleRatingClick(star)}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {form.rating > 0 && `(${form.rating} out of 5)`}
        </span>
      </div>
    );
  };

  // Helper function to get service icon
  const getServiceIcon = (source) => {
    switch (source) {
      case "referrals":
        return <UserCheck className="w-4 h-4" />;
      case "clinicLabRequests":
        return <Stethoscope className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  // Helper function to get service color
  const getServiceColor = (source) => {
    switch (source) {
      case "referrals":
        return "bg-purple-100 text-purple-700";
      case "clinicLabRequests":
        return "bg-green-100 text-green-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">
              Loading feedback form...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Please wait while we prepare your form
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-800 font-sans">
        {/* Loading Overlay */}
        {submitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg font-semibold text-gray-700">
                Submitting Your Feedback...
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Please wait while we process your review
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-center flex-1">
                Share Your Feedback
              </h1>
            </div>
            <p className="text-center text-purple-100 mt-2">
              Help us improve our services with your valuable feedback
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
          {/* Left Column - Patient Info & Service Selection */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Patient Information
              </h2>
            </div>

            <div className="space-y-4">
              {renderInput(
                "patientName",
                "text",
                "Your Full Name",
                User,
                "Full Name *"
              )}
              {renderInput(
                "patientEmail",
                "email",
                "Your Email Address",
                Mail,
                "Email Address *"
              )}

              {/* Anonymous Option */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={form.isAnonymous}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isAnonymous: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="flex items-center space-x-2">
                  {form.isAnonymous ? (
                    <EyeOff className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-600" />
                  )}
                  <label
                    htmlFor="anonymous"
                    className="text-sm font-medium text-gray-700"
                  >
                    Submit feedback anonymously
                  </label>
                </div>
              </div>

              {/* Service Selection */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h3 className="font-medium text-gray-700">Select Service</h3>
                </div>

                {appointments.length > 0 ? (
                  <select
                    value={selectedAppointment?.id || ""}
                    onChange={handleAppointmentSelect}
                    className={`w-full p-3 rounded-lg border-2 transition-colors focus:outline-none ${
                      errors.appointmentDate
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-purple-500"
                    }`}
                  >
                    <option value="">-- Select a completed service --</option>
                    {appointments.map((appointment) => {
                      let serviceType, displayDate, displayDoctor, displayType;

                      if (appointment.source === "referrals") {
                        serviceType = "Referral";
                        displayDate = appointment.appointmentDate;
                        displayDoctor = `Dr. ${appointment.doctor}`;
                        displayType =
                          appointment.initialReasonForReferral ||
                          "Specialist Consultation";
                      } else if (appointment.source === "clinicLabRequests") {
                        serviceType = "Lab";
                        displayDate = appointment.appointmentDate;
                        displayDoctor =
                          appointment.doctorName || "Laboratory Service";
                        displayType = appointment.type;
                      } else {
                        serviceType = "Appointment";
                        displayDate = appointment.appointmentDate;
                        displayDoctor = `Dr. ${appointment.doctor}`;
                        displayType = appointment.type;
                      }

                      return (
                        <option
                          key={`${appointment.source}-${appointment.id}`}
                          value={appointment.id}
                        >
                          [{serviceType}] {displayDate} - {displayDoctor} -{" "}
                          {displayType} ({appointment.clinicName})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <p className="text-yellow-700 font-medium">
                      No completed services found
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      You can provide feedback for completed appointments, lab
                      requests, and specialist referrals
                    </p>
                  </div>
                )}

                {selectedAppointment && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getServiceColor(
                          selectedAppointment.source
                        )}`}
                      >
                        {getServiceIcon(selectedAppointment.source)}
                        <span>
                          {selectedAppointment.source === "referrals"
                            ? "Specialist Referral"
                            : selectedAppointment.source === "clinicLabRequests"
                            ? "Lab Service"
                            : "Appointment"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Date:</span>
                        <span className="text-gray-600">
                          {selectedAppointment.appointmentDate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">
                          {selectedAppointment.source === "referrals"
                            ? "Specialist:"
                            : selectedAppointment.source === "clinicLabRequests"
                            ? "Service Provider:"
                            : "Doctor:"}
                        </span>
                        <span className="text-gray-600">
                          {selectedAppointment.source === "referrals"
                            ? `Dr. ${selectedAppointment.doctor}`
                            : selectedAppointment.source === "clinicLabRequests"
                            ? selectedAppointment.doctorName ||
                              "Laboratory Service"
                            : `Dr. ${selectedAppointment.doctor}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">
                          Clinic:
                        </span>
                        <span className="text-gray-600">
                          {selectedAppointment.clinicName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="text-gray-600">
                          {selectedAppointment.source === "referrals"
                            ? selectedAppointment.initialReasonForReferral ||
                              "Specialist Consultation"
                            : selectedAppointment.type}
                        </span>
                      </div>

                      {/* Additional fields for referrals */}
                      {selectedAppointment.source === "referrals" && (
                        <>
                          {selectedAppointment.referringDoctor && (
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-700">
                                Referred by:
                              </span>
                              <span className="text-gray-600">
                                Dr. {selectedAppointment.referringDoctor}
                              </span>
                            </div>
                          )}
                          {selectedAppointment.generalistNotes && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-700">
                                Referral Notes:
                              </span>
                              <p className="text-gray-600 text-xs mt-1 p-2 bg-white rounded">
                                {selectedAppointment.generalistNotes}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.patientArrivalConfirmed && (
                            <div className="flex items-center text-green-600 mt-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <span className="text-xs">
                                Arrival was confirmed
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Additional fields for lab requests */}
                      {selectedAppointment.source === "clinicLabRequests" && (
                        <>
                          {selectedAppointment.testType && (
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-700">
                                Test Type:
                              </span>
                              <span className="text-gray-600">
                                {selectedAppointment.testType}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {selectedAppointment.appointmentTime &&
                        selectedAppointment.appointmentTime !== "Lab Service" &&
                        selectedAppointment.appointmentTime !==
                          "Specialist Consultation" && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">
                              Time:
                            </span>
                            <span className="text-gray-600">
                              {selectedAppointment.appointmentTime}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Rating & Feedback */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Your Rating & Review
              </h2>
            </div>

            <div className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Overall Rating *
                </label>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  {renderStarRating()}
                  {hoveredRating > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {hoveredRating === 1 && "Poor"}
                      {hoveredRating === 2 && "Fair"}
                      {hoveredRating === 3 && "Good"}
                      {hoveredRating === 4 && "Very Good"}
                      {hoveredRating === 5 && "Excellent"}
                    </p>
                  )}
                </div>
                {errors.rating && (
                  <p className="text-red-500 text-sm mt-1">
                    Please select a rating
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    name="comment"
                    value={form.comment}
                    onChange={handleChange}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, comment: true }))
                    }
                    placeholder={
                      selectedAppointment?.source === "referrals"
                        ? "Share your experience with the specialist and referral process..."
                        : selectedAppointment?.source === "clinicLabRequests"
                        ? "Share your experience with the lab service..."
                        : "Share your experience with the doctor and clinic..."
                    }
                    rows={4}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-colors focus:outline-none resize-none ${
                      errors.comment
                        ? "border-red-300 focus:border-red-500"
                        : touched.comment && form.comment.trim()
                        ? "border-green-300 focus:border-green-500"
                        : "border-gray-300 focus:border-purple-500"
                    }`}
                    disabled={submitting}
                  />
                </div>
                {errors.comment && (
                  <p className="text-red-500 text-sm mt-1">
                    Please provide your feedback
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-5 h-5 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    Tags (Optional)
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                        form.tags.includes(tag)
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {form.tags.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {form.tags.join(", ")}
                  </p>
                )}
              </div>

              {/* Treatment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <div className="relative">
                  {selectedAppointment?.source === "referrals" ? (
                    <UserCheck className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  ) : (
                    <Stethoscope className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  )}
                  <input
                    name="treatmentType"
                    type="text"
                    value={form.treatmentType}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 transition-colors focus:outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Service-specific additional info */}
              {selectedAppointment?.source === "referrals" && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Specialist Referral Feedback
                    </span>
                  </div>
                  <p className="text-xs text-purple-700">
                    Your feedback will help us improve our referral process and
                    specialist network. Please consider rating both the
                    specialist's service and the overall referral experience.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center max-w-5xl mx-auto px-6 pb-10">
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedAppointment}
            className={`px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all transform flex items-center space-x-2 ${
              submitting || !selectedAppointment
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95"
            }`}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Feedback;
