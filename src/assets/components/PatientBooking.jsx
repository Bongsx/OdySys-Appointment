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
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowLeft,
  Plus,
  X,
  Stethoscope,
  Users,
  Heart,
} from "lucide-react";

function PatientBooking() {
  const navigate = useNavigate();
  const [user, loading, error] = useAuthState(auth);

  const [form, setForm] = useState({
    patientFirstName: "",
    patientLastName: "",
    email: "",
    contactNumber: "",
    dateOfBirth: "",
    bloodType: "",
    address: "",
    patientComplaint: [""],
    doctor: "",
    appointmentDate: "",
    appointmentTime: "",
    clinicName: "",
    clinicId: "",
    type: "General Consultation", // Default value
    serviceFee: { name: "", fee: "" }, // Changed to object
    emergencyContact: { name: "", phone: "09", relation: "" },
  });

  const [doctorList, setDoctorList] = useState([]);
  const [clinicList, setClinicList] = useState([]);
  const [medicalServices, setMedicalServices] = useState([]);
  const [bookedDatesForDoctor, setBookedDatesForDoctor] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMonthOffset, setViewMonthOffset] = useState(0);
  const [manualConflict, setManualConflict] = useState("");
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [doctorAvailability, setDoctorAvailability] = useState({});
  const [doctorSpecificDates, setDoctorSpecificDates] = useState({}); // NEW: For specific dates

  // Service fee options
  const serviceFeeOptions = [
    { name: "General Consultation", fee: "" },
    { name: "Follow-up Consultation", fee: "" },
  ];

  // Required fields (excluding pre-populated ones)
  const requiredFields = [
    "dateOfBirth",
    "address",
    "doctor",
    "appointmentDate",
    "appointmentTime",
    "clinicName",
    "clinicId",
    "type",
  ];

  const requiredEmergencyFields = ["name", "phone", "relation"];

  // Validation functions
  const isFieldEmpty = (value) => {
    if (Array.isArray(value)) {
      return value.filter((item) => item.trim()).length === 0;
    }
    if (typeof value === "object" && value !== null) {
      // For serviceFee object, check if both name and fee are present
      if (value.name !== undefined && value.fee !== undefined) {
        return !value.name || !value.fee;
      }
    }
    return !value || value.toString().trim() === "";
  };

  const validatePhone = (phone) => {
    return phone && phone.length === 11 && phone.startsWith("09");
  };

  // Check if a field is valid (has value and no errors)
  const isFieldValid = (field) => {
    const value = form[field];
    if (isFieldEmpty(value)) return false;

    // Special validation for phone numbers
    return true;
  };

  const isEmergencyFieldValid = (field) => {
    const value = form.emergencyContact[field];
    if (isFieldEmpty(value)) return false;

    // Special validation for emergency contact phone
    if (field === "phone" && !validatePhone(value)) return false;

    return true;
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
          patientFirstName:
            userData.firstName || userData.name?.split(" ")[0] || "",
          patientLastName:
            userData.lastName ||
            userData.name?.split(" ").slice(1).join(" ") ||
            "",
          email: userData.email || "",
          contactNumber: userData.contactNumber || "+63",
        }));

        // Mark pre-populated fields as touched
        setTouched((prev) => ({
          ...prev,
          patientFirstName: !!(
            userData.firstName || userData.name?.split(" ")[0]
          ),
          patientLastName: !!(
            userData.lastName || userData.name?.split(" ").slice(1).join(" ")
          ),
          email: !!userData.email,
          contactNumber: !!userData.contactNumber,
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

  useEffect(() => {
    if (user && !userDataLoaded) {
      fetchCurrentUserData(user.uid);
    }
  }, [user, userDataLoaded]);

  useEffect(() => {
    const docRef = ref(database, "doctors");
    const clinicsRef = ref(database, "clinics");
    const patRef = ref(database, `appointments`);
    const servicesRef = ref(database, "medicalServices/consultationTypes");

    onValue(docRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.values(data);
        setDoctorList(list);

        // Build doctor availability object from database
        const availabilityMap = {};
        const specificDatesMap = {}; // NEW: For specific dates

        Object.values(data).forEach((doctor) => {
          if (doctor.availability && doctor.availability.weeklySchedule) {
            availabilityMap[doctor.fullName] =
              doctor.availability.weeklySchedule;
          }

          // NEW: Extract specific dates availability
          if (doctor.availability && doctor.availability.specificDates) {
            specificDatesMap[doctor.fullName] =
              doctor.availability.specificDates;
          }
        });

        setDoctorAvailability(availabilityMap);
        setDoctorSpecificDates(specificDatesMap); // NEW: Set specific dates state
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

    onValue(servicesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const services = Object.values(data);
        const generalConsultation = services.filter(
          (service) => service.name === "General Consultation"
        );
        setMedicalServices(generalConsultation);
      }
    });

    onValue(patRef, (snap) => {
      const data = snap.val();
      if (data) {
        const generalConsultationAppointments = Object.values(data).filter(
          (appointment) => appointment.type === "General Consultation"
        );

        // Only get appointments for current selected doctor
        if (form.doctor) {
          const doctorAppointments = generalConsultationAppointments.filter(
            (appointment) => appointment.doctor === form.doctor
          );

          // Store appointment data with dates and times
          const appointmentData = doctorAppointments.map((appointment) => {
            const dateParts = appointment.appointmentDate?.split("-");
            return {
              year: parseInt(dateParts[0]),
              month: parseInt(dateParts[1]),
              day: parseInt(dateParts[2]),
              time: appointment.appointmentTime,
              date: appointment.appointmentDate,
            };
          });

          setBookedDatesForDoctor(appointmentData);
        } else {
          setBookedDatesForDoctor([]);
        }
      } else {
        setBookedDatesForDoctor([]);
      }
    });
  }, [form.doctor]);

  useEffect(() => {
    if (!form.appointmentDate || !form.doctor) return;

    const patRef = ref(database, `appointments`);
    onValue(patRef, (snap) => {
      const data = snap.val();
      const matched = Object.values(data || {}).filter(
        (entry) =>
          entry.appointmentDate === form.appointmentDate &&
          entry.doctor === form.doctor &&
          entry.type === "General Consultation"
      );
      const times = matched.map((e) => e.appointmentTime);
      setBookedTimes(times);
    });
  }, [form.appointmentDate, form.doctor]);

  useEffect(() => {
    const allowed = getDoctorSlots();
    if (form.appointmentTime && !allowed.includes(form.appointmentTime)) {
      setManualConflict(
        "⛔ Time is not available for this doctor or already booked"
      );
    } else if (bookedTimes.includes(form.appointmentTime)) {
      setManualConflict("⛔ Time already booked. Please select another.");
    } else {
      setManualConflict("");
    }
  }, [form.appointmentTime, bookedTimes, form.doctor]);

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
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-400 transition-colors focus:outline-none";
    }
  };

  const emergencyContactInputStyle = (field) => {
    const errorKey = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;
    const touchedKey = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;

    const hasError = errors[errorKey];
    const isTouched = touched[touchedKey];
    const isValid = isEmergencyFieldValid(field);

    if (hasError) {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 transition-colors focus:outline-none";
    } else if (isTouched && isValid) {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 transition-colors focus:outline-none";
    } else {
      return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-400 transition-colors focus:outline-none";
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

  const handleEmergencyContactChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));

    // Mark emergency contact field as touched
    const touchedKey = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;
    setTouched((prev) => ({ ...prev, [touchedKey]: true }));

    // Clear error when user starts typing
    const errorKey = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: false }));
    }
  };

  const handlePhone = (e) => {
    let val = e.target.value;

    // Remove non-digits
    val = val.replace(/\D/g, "");

    // Ensure it starts with "09"
    if (!val.startsWith("09")) {
      val = "09" + val;
    }

    // Limit to 11 digits
    if (val.length > 11) {
      val = val.slice(0, 11);
    }

    // Update form state
    setForm((p) => ({ ...p, contactNumber: val }));

    // Mark field as touched
    setTouched((prev) => ({ ...prev, contactNumber: true }));

    // Clear error if previously set
    if (errors.contactNumber) {
      setErrors((prev) => ({ ...prev, contactNumber: false }));
    }
  };

  const handleEmergencyPhone = (e) => {
    let val = e.target.value;

    // Remove all non-digit characters
    val = val.replace(/\D/g, "");

    // Ensure it starts with 09
    if (!val.startsWith("09")) {
      val = "09" + val;
    }

    // Limit to 11 digits (e.g., 09123456789)
    if (val.length > 11) {
      val = val.slice(0, 11);
    }

    handleEmergencyContactChange("phone", val);
  };

  const addComplaint = () => {
    setForm((p) => ({ ...p, patientComplaint: [...p.patientComplaint, ""] }));
  };

  const handleComplaintChange = (i, v) => {
    const updated = [...form.patientComplaint];
    updated[i] = v;
    setForm((p) => ({ ...p, patientComplaint: updated }));

    // Clear error when user starts typing
    if (errors.patientComplaint) {
      setErrors((prev) => ({ ...prev, patientComplaint: false }));
    }
  };

  // Handle service fee selection
  const handleServiceFeeChange = (e) => {
    const selectedName = e.target.value;
    let fee = "";

    // Set fee based on selected service and doctor's professional fees
    if (selectedDoctor?.professionalFees && selectedName) {
      if (selectedName === "General Consultation") {
        fee = selectedDoctor.professionalFees.consultationFee?.toString() || "";
      } else if (selectedName === "Follow-up Consultation") {
        fee = selectedDoctor.professionalFees.followUpFee?.toString() || "";
      }
    }

    setForm((prev) => ({
      ...prev,
      serviceFee: {
        name: selectedName,
        fee: fee,
      },
    }));

    // Mark field as touched
    setTouched((prev) => ({ ...prev, serviceFee: true }));

    // Clear error when user makes selection
    if (errors.serviceFee) {
      setErrors((prev) => ({ ...prev, serviceFee: false }));
    }
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

    // Check service fee
    if (isFieldEmpty(form.serviceFee)) {
      newErrors.serviceFee = true;
    }

    // Check emergency contact fields
    requiredEmergencyFields.forEach((field) => {
      const value = form.emergencyContact[field];
      if (isFieldEmpty(value)) {
        newErrors[
          `emergencyContact${field.charAt(0).toUpperCase() + field.slice(1)}`
        ] = true;
      }
    });

    // Check complaints
    if (isFieldEmpty(form.patientComplaint)) {
      newErrors.patientComplaint = true;
    }

    // Check phone numbers if provided
    if (form.contactNumber && !validatePhone(form.contactNumber)) {
      newErrors.contactNumber = true;
    }

    if (
      form.emergencyContact.phone &&
      !validatePhone(form.emergencyContact.phone)
    ) {
      newErrors.emergencyContactPhone = true;
    }

    // Check time conflict
    if (manualConflict) {
      newErrors.appointmentTime = true;
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
      const newRef = push(ref(database, `appointments`));

      const createdAt = `${
        new Date().toISOString().split("T")[0]
      }, ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const lastUpdated = `${
        new Date().toISOString().split("T")[0]
      }, ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const appointmentData = {
        patient: {
          firstName: form.patientFirstName,
          lastName: form.patientLastName,
          email: form.email,
          contactNumber: form.contactNumber,
          dateOfBirth: form.dateOfBirth,
          bloodType: form.bloodType,
          address: form.address,
          complaints: form.patientComplaint.filter((c) => c.trim() !== ""),
          emergencyContact: form.emergencyContact,
        },
        doctor: form.doctor,
        serviceFee: form.serviceFee, // Now saves as object with name and fee
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        clinicName: form.clinicName,
        clinicId: form.clinicId,
        type: form.type,
        status: "Pending",
        createdAt: createdAt,
        lastUpdated: lastUpdated,
      };

      await set(newRef, appointmentData);

      try {
        await fetch("http://localhost:5000/api/send-patient-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${form.patientFirstName} ${form.patientLastName}`,
            phone: form.contactNumber,
            doctor: form.doctor,
            clinic: form.clinicName,
            date: form.appointmentDate,
            time: form.appointmentTime,
            email: form.email,
          }),
        });
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
      }

      alert("✅ Appointment booked successfully!");

      // Reset form but keep user data
      setForm({
        patientFirstName: form.patientFirstName,
        patientLastName: form.patientLastName,
        email: form.email,
        contactNumber: form.contactNumber,
        dateOfBirth: form.dateOfBirth,
        bloodType: form.bloodType,
        address: form.address,
        patientComplaint: [""],
        doctor: "",
        serviceFee: { name: "", fee: "" },
        appointmentDate: "",
        appointmentTime: "",
        clinicName: "",
        clinicId: "",
        type: "General Consultation",
        emergencyContact: { name: "", phone: "09", relation: "" },
      });
      setSelectedDay(null);
      setSelectedDoctor(null);
      setTouched({});
      setErrors({});
      navigate("/");
    } catch (err) {
      console.error("Booking error:", err);
      alert("❌ Error booking appointment: " + err.message);
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

  // Helper function to convert 12-hour format to 24-hour format for sorting
  const convertTo24Hour = (time12) => {
    const [time, period] = time12.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // NEW: Helper function to generate time slots from time slot data
  const generateTimeSlotsFromData = (timeSlotData) => {
    const timeSlots = [];

    timeSlotData.forEach((slot) => {
      const startTime = slot.startTime; // e.g., "09:00"
      const endTime = slot.endTime; // e.g., "17:00"

      // Parse start and end times
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      // Convert to minutes for easier calculation
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;

      // Generate hourly slots between start and end time (INCLUSIVE of end time)
      for (
        let totalMinutes = startTotalMinutes;
        totalMinutes <= endTotalMinutes;
        totalMinutes += 60
      ) {
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        // Convert to 12-hour format
        let time12;
        if (hour === 0) {
          time12 = `12:${minute.toString().padStart(2, "0")} AM`;
        } else if (hour < 12) {
          time12 = `${hour}:${minute.toString().padStart(2, "0")} AM`;
        } else if (hour === 12) {
          time12 = `12:${minute.toString().padStart(2, "0")} PM`;
        } else {
          time12 = `${hour - 12}:${minute.toString().padStart(2, "0")} PM`;
        }

        timeSlots.push(time12);
      }
    });

    // Remove duplicates and sort
    const uniqueSlots = [...new Set(timeSlots)];
    return uniqueSlots.sort((a, b) => {
      const timeA = convertTo24Hour(a);
      const timeB = convertTo24Hour(b);
      return timeA.localeCompare(timeB);
    });
  };

  // NEW: Function to get time slots for a specific date (either from weekly schedule or specific date)
  const getDoctorSlotsForDate = (dateString) => {
    if (!form.doctor) return [];

    const selectedDate = new Date(dateString);
    const dayOfWeek = selectedDate.getDay();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[dayOfWeek];

    // Check if there's specific date availability first
    const specificDates = doctorSpecificDates[form.doctor];
    if (specificDates && specificDates[dateString]) {
      const specificDateData = specificDates[dateString];
      if (specificDateData.timeSlots && specificDateData.timeSlots.length > 0) {
        return generateTimeSlotsFromData(specificDateData.timeSlots);
      }
    }

    // Fall back to weekly schedule
    const doctorSchedule = doctorAvailability[form.doctor];
    if (
      doctorSchedule &&
      doctorSchedule[dayName] &&
      doctorSchedule[dayName].enabled
    ) {
      const daySchedule = doctorSchedule[dayName];
      if (daySchedule.timeSlots && daySchedule.timeSlots.length > 0) {
        return generateTimeSlotsFromData(daySchedule.timeSlots);
      }
    }

    return [];
  };

  // UPDATED: Modified function to use the new getDoctorSlotsForDate
  const getDoctorSlots = () => {
    if (!form.doctor || !form.appointmentDate) {
      return [];
    }
    return getDoctorSlotsForDate(form.appointmentDate);
  };

  // UPDATED: Check if a specific date is available (considering both weekly schedule and specific dates)
  const isDoctorAvailableOnDate = (year, month, day) => {
    if (!form.doctor) return false;

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Check specific dates first
    const specificDates = doctorSpecificDates[form.doctor];
    if (specificDates && specificDates[dateString]) {
      // If there's specific date data, check if it has time slots
      const specificDateData = specificDates[dateString];
      return (
        specificDateData.timeSlots && specificDateData.timeSlots.length > 0
      );
    }

    // Fall back to weekly schedule
    if (!doctorAvailability[form.doctor]) return false;

    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[dayOfWeek];

    const doctorSchedule = doctorAvailability[form.doctor];
    const daySchedule = doctorSchedule[dayName];

    return daySchedule && daySchedule.enabled;
  };

  // UPDATED: Check if ALL time slots are booked for a specific date (considering both schedules)
  const isDateFullyBookedForDoctor = (year, month, day) => {
    if (!form.doctor) return false;

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Get all available time slots for this date (considering both specific dates and weekly schedule)
    const allAvailableSlots = getDoctorSlotsForDate(dateString);

    if (allAvailableSlots.length === 0) {
      return true; // If no slots available, consider it "fully booked"
    }

    // Get booked time slots for this specific date
    const bookedSlotsForDate = bookedDatesForDoctor
      .filter(
        (appointment) =>
          appointment.year === year &&
          appointment.month === month + 1 &&
          appointment.day === day
      )
      .map((appointment) => appointment.time);

    // Check if ALL available slots are booked
    return allAvailableSlots.every((slot) => bookedSlotsForDate.includes(slot));
  };

  const renderDoctorAvatar = () => {
    const name = form.doctor.trim();
    if (!name)
      return (
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto shadow-md" />
      );
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-indigo-500",
    ];
    const colorIndex = name.length % colors.length;
    return (
      <div
        className={`w-20 h-20 rounded-full ${colors[colorIndex]} text-white flex items-center justify-center mx-auto text-xl font-bold shadow-lg`}
      >
        {initials}
      </div>
    );
  };

  const getAvailableClinics = () => {
    if (!selectedDoctor || !selectedDoctor.clinicAffiliations) return [];

    // Map clinic IDs to clinic objects
    return clinicList.filter((clinic) =>
      selectedDoctor.clinicAffiliations.includes(clinic.id)
    );
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">
            Loading your information...
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Please wait while we prepare your booking form
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + viewMonthOffset);
  const daysInMonth = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    0
  ).getDate();
  const firstDay = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    1
  ).getDay();
  const currentMonth = baseDate.toLocaleDateString("en-US", { month: "long" });
  const currentYear = baseDate.getFullYear();
  const monthStr = String(baseDate.getMonth() + 1).padStart(2, "0");

  const isToday = (year, month, day) => {
    const d = new Date(year, month, day);
    return d.toDateString() === new Date().toDateString();
  };

  const selectDate = (day) => {
    const selectedFullDate = new Date(currentYear, baseDate.getMonth(), day);
    if (
      selectedFullDate < new Date().setHours(0, 0, 0, 0) &&
      !isToday(currentYear, baseDate.getMonth(), day)
    )
      return;
    const date = `${currentYear}-${monthStr}-${String(day).padStart(2, "0")}`;
    setForm((p) => ({ ...p, appointmentDate: date }));
    setSelectedDay(day);

    // Clear error when date is selected
    if (errors.appointmentDate) {
      setErrors((prev) => ({ ...prev, appointmentDate: false }));
    }
  };

  const slots = getDoctorSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 font-sans relative">
      {submitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">
              Processing Your Booking...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Please wait while we confirm your appointment
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 text-gray-800 font-sans">
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <h1 className="text-3xl font-bold text-center flex-1">
                Book Your Appointment
              </h1>
              <div className="w-40"></div>
            </div>
            <p className="text-center text-teal-100 mt-2">
              Schedule your visit with our healthcare professionals
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Patient Information
              </h2>
              {userDataLoaded && (
                <div className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full"></div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {renderInput(
                  "patientFirstName",
                  "text",
                  "First Name",
                  User,
                  "First Name"
                )}
                {renderInput(
                  "patientLastName",
                  "text",
                  "Last Name",
                  User,
                  "Last Name"
                )}
              </div>
              {renderInput("email", "email", "Email", Mail, "Email Address")}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    name="contactNumber"
                    type="text"
                    value={form.contactNumber}
                    onChange={handlePhone}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, contactNumber: true }))
                    }
                    placeholder="Phone (+63)"
                    className={inputStyle("contactNumber")}
                    disabled={submitting}
                  />
                  {(() => {
                    const hasError = errors.contactNumber;
                    const isTouched = touched.contactNumber;
                    const isValid = isFieldValid("contactNumber");
                    const showGreenCheck = isTouched && isValid && !hasError;

                    return showGreenCheck ? (
                      <CheckCircle className={`${iconStyle} text-green-600`} />
                    ) : (
                      <AlertCircle className={`${iconStyle} text-red-500`} />
                    );
                  })()}
                </div>
              </div>

              {renderInput(
                "dateOfBirth",
                "date",
                "Date of Birth",
                Calendar,
                "Date of Birth *"
              )}
              {renderInput("address", "text", "Address", MapPin, "Address *")}

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h3 className="font-medium text-gray-700">
                    Emergency Contact
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Emergency Contact Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.emergencyContact.name}
                        onChange={(e) =>
                          handleEmergencyContactChange("name", e.target.value)
                        }
                        onBlur={() =>
                          setTouched((prev) => ({
                            ...prev,
                            emergencyContactName: true,
                          }))
                        }
                        placeholder="Emergency Contact Name"
                        className={emergencyContactInputStyle("name")}
                        disabled={submitting}
                      />
                      {(() => {
                        const hasError = errors.emergencyContactName;
                        const isTouched = touched.emergencyContactName;
                        const isValid = isEmergencyFieldValid("name");
                        const showGreenCheck =
                          isTouched && isValid && !hasError;

                        return showGreenCheck ? (
                          <CheckCircle
                            className={`${iconStyle} text-green-600`}
                          />
                        ) : (
                          <AlertCircle
                            className={`${iconStyle} text-red-500`}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Emergency Contact Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.emergencyContact.phone}
                        onChange={handleEmergencyPhone}
                        onBlur={() =>
                          setTouched((prev) => ({
                            ...prev,
                            emergencyContactPhone: true,
                          }))
                        }
                        placeholder="Emergency Contact Phone (09)"
                        className={emergencyContactInputStyle("phone")}
                        disabled={submitting}
                      />
                      {(() => {
                        const hasError = errors.emergencyContactPhone;
                        const isTouched = touched.emergencyContactPhone;
                        const isValid = isEmergencyFieldValid("phone");
                        const showGreenCheck =
                          isTouched && isValid && !hasError;

                        return showGreenCheck ? (
                          <CheckCircle
                            className={`${iconStyle} text-green-600`}
                          />
                        ) : (
                          <AlertCircle
                            className={`${iconStyle} text-red-500`}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Relationship *
                    </label>
                    <div className="relative">
                      <Heart className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.emergencyContact.relation}
                        onChange={(e) =>
                          handleEmergencyContactChange(
                            "relation",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          setTouched((prev) => ({
                            ...prev,
                            emergencyContactRelation: true,
                          }))
                        }
                        placeholder="Relationship (e.g., Spouse, Parent, Sibling)"
                        className={emergencyContactInputStyle("relation")}
                        disabled={submitting}
                      />
                      {(() => {
                        const hasError = errors.emergencyContactRelation;
                        const isTouched = touched.emergencyContactRelation;
                        const isValid = isEmergencyFieldValid("relation");
                        const showGreenCheck =
                          isTouched && isValid && !hasError;

                        return showGreenCheck ? (
                          <CheckCircle
                            className={`${iconStyle} text-green-600`}
                          />
                        ) : (
                          <AlertCircle
                            className={`${iconStyle} text-red-500`}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-700">
                      Medical Complaints *
                    </h3>
                  </div>
                  <button
                    onClick={addComplaint}
                    className="flex items-center space-x-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
                {form.patientComplaint.map((c, i) => (
                  <div key={i} className="mb-2">
                    <input
                      value={c}
                      onChange={(e) => handleComplaintChange(i, e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                        errors.patientComplaint
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300 focus:border-teal-500"
                      }`}
                      placeholder={`Complaint ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Select Date & Time
              </h2>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setViewMonthOffset((v) => v - 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl font-bold">‹</span>
              </button>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentMonth.toUpperCase()} {currentYear}
              </h2>
              <button
                onClick={() => setViewMonthOffset((v) => v + 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl font-bold">›</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  className="font-bold text-sm text-center text-gray-500 py-2"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const dayDate = new Date(
                    currentYear,
                    baseDate.getMonth(),
                    day
                  );
                  const isPastDay =
                    dayDate < new Date().setHours(0, 0, 0, 0) &&
                    !isToday(currentYear, baseDate.getMonth(), day);
                  const isSelected = selectedDay === day;

                  // Check if doctor is available on this day
                  const isDoctorAvailable = form.doctor
                    ? isDoctorAvailableOnDate(
                        currentYear,
                        baseDate.getMonth(),
                        day
                      )
                    : true;

                  // Check if ALL time slots are booked for this date
                  const isFullyBooked = form.doctor
                    ? isDateFullyBookedForDoctor(
                        currentYear,
                        baseDate.getMonth(),
                        day
                      )
                    : false;

                  // Check if this date has some bookings (for partial booking indication)
                  const hasPartialBookings =
                    form.doctor &&
                    bookedDatesForDoctor.some(
                      (appointment) =>
                        appointment.year === currentYear &&
                        appointment.month === baseDate.getMonth() + 1 &&
                        appointment.day === day
                    );

                  let cellClass =
                    "rounded-lg w-10 h-10 flex items-center justify-center cursor-pointer text-sm font-medium transition-all";

                  if (isPastDay) {
                    cellClass +=
                      " bg-gray-100 text-gray-400 cursor-not-allowed";
                  } else if (isSelected) {
                    cellClass += " bg-teal-600 text-white shadow-lg";
                  } else if (!form.doctor) {
                    // No doctor selected - show neutral state
                    cellClass += " bg-gray-50 text-gray-700 hover:bg-gray-100";
                  } else if (!isDoctorAvailable) {
                    // Doctor not available on this day - show as unavailable
                    cellClass +=
                      " bg-gray-200 text-gray-500 cursor-not-allowed";
                  } else if (isFullyBooked) {
                    // ALL slots are booked - show as fully booked
                    cellClass += " bg-red-200 text-red-700 cursor-not-allowed";
                  } else if (hasPartialBookings) {
                    // Some slots are booked but not all - show as partially booked
                    cellClass +=
                      " bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
                  } else {
                    // Available date - show as selectable
                    cellClass +=
                      " bg-gray-50 text-gray-700 hover:bg-teal-100 hover:text-teal-600";
                  }

                  const canSelect =
                    !isPastDay &&
                    form.doctor &&
                    isDoctorAvailable &&
                    !isFullyBooked;

                  return (
                    <div
                      key={day}
                      className={cellClass}
                      onClick={() => canSelect && selectDate(day)}
                      title={
                        !form.doctor
                          ? "Please select a doctor first"
                          : !isDoctorAvailable
                          ? "Doctor not available on this day"
                          : isFullyBooked
                          ? "All time slots are booked for this doctor"
                          : hasPartialBookings
                          ? "Some time slots are available"
                          : isPastDay
                          ? "Past date"
                          : "Available"
                      }
                    >
                      {day}
                    </div>
                  );
                }
              )}
            </div>

            {/* Legend for calendar colors */}
            {form.doctor && (
              <div className="mb-4 text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-50 rounded border"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-100 rounded border"></div>
                  <span className="text-gray-600">Partially booked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-200 rounded border"></div>
                  <span className="text-gray-600">Fully booked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-200 rounded border"></div>
                  <span className="text-gray-600">Not available</span>
                </div>
              </div>
            )}

            {form.appointmentDate && form.doctor && (
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    Select Time: *
                  </label>
                </div>

                {slots.length === 0 ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-red-600 font-medium">
                      Doctor is not available on the selected date
                    </p>
                    <p className="text-red-500 text-sm mt-1">
                      Please select a different date or doctor
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      name="appointmentTime"
                      value={form.appointmentTime}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-lg border-2 transition-colors focus:outline-none mb-4 ${
                        errors.appointmentTime
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300 focus:border-teal-500"
                      }`}
                    >
                      <option value="">-- Select Time --</option>
                      {slots.map((slot) => (
                        <option
                          key={slot}
                          value={slot}
                          disabled={bookedTimes.includes(slot)}
                        >
                          {slot} {bookedTimes.includes(slot) ? "(Booked)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {slots.map((slot) => (
                        <div
                          key={slot}
                          className={`px-2 py-2 rounded-lg text-center font-medium ${
                            bookedTimes.includes(slot)
                              ? "bg-red-100 text-red-600"
                              : form.appointmentTime === slot
                              ? "bg-teal-600 text-white"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {manualConflict && (
                  <p className="text-red-600 text-sm mt-3 p-3 bg-red-50 rounded-lg">
                    {manualConflict}
                  </p>
                )}
              </div>
            )}

            {form.appointmentDate && !form.doctor && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-700 font-medium">
                  Please select a doctor first to see available time slots
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-6 self-start">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Choose Doctor</h2>
            </div>

            <select
              value={form.doctor}
              onChange={(e) => {
                const doctor = e.target.value;
                setForm((p) => ({
                  ...p,
                  doctor,
                  clinicName: "",
                  clinicId: "",
                  serviceFee: { name: "", fee: "" }, // Reset service fee when doctor changes
                  appointmentDate: "", // Reset date when doctor changes
                  appointmentTime: "", // Reset time when doctor changes
                }));

                // Clear errors
                setErrors((prev) => ({
                  ...prev,
                  doctor: false,
                  clinicName: false,
                  clinicId: false,
                  serviceFee: false,
                  appointmentDate: false,
                  appointmentTime: false,
                }));

                // Reset selected day
                setSelectedDay(null);

                const doc = doctorList.find((d) => d.fullName === doctor);
                setSelectedDoctor(doc || null);

                // Auto-select clinic if doctor has only one affiliation
                if (doc?.clinicAffiliations?.length === 1) {
                  const clinicId = doc.clinicAffiliations[0];
                  const clinic = clinicList.find((c) => c.id === clinicId);

                  if (clinic) {
                    setForm((p) => ({
                      ...p,
                      clinicName: clinic.name,
                      clinicId: clinic.id,
                    }));
                  }
                }
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none text-center mb-6 transition-colors ${
                errors.doctor
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300 focus:border-purple-500"
              }`}
            >
              <option value="">-- Select Doctor --</option>
              {doctorList.map((d, i) => (
                <option key={i} value={d.fullName}>
                  {d.fullName}
                </option>
              ))}
            </select>

            {form.doctor && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center w-full">
                {renderDoctorAvatar()}
                <h3 className="font-semibold text-lg mt-4 text-gray-800">
                  {form.doctor && `${form.doctor}`}
                </h3>
                {selectedDoctor?.specialty && (
                  <p className="text-sm text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full mt-2">
                    {selectedDoctor.specialty}
                  </p>
                )}
              </div>
            )}

            {selectedDoctor?.clinicAffiliations && (
              <div className="mt-6 w-full">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Clinic: *
                </label>
                <select
                  value={form.clinicName}
                  onChange={(e) => {
                    const clinicName = e.target.value;
                    const selectedClinic = clinicList.find(
                      (clinic) => clinic.name === clinicName
                    );

                    setForm((p) => ({
                      ...p,
                      clinicName,
                      clinicId: selectedClinic?.id || "",
                    }));

                    // Clear errors
                    setErrors((prev) => ({
                      ...prev,
                      clinicName: false,
                      clinicId: false,
                    }));
                  }}
                  className={`w-full p-3 rounded-lg border-2 focus:outline-none mb-4 transition-colors ${
                    errors.clinicName
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-purple-500"
                  }`}
                >
                  <option value="">-- Select Clinic --</option>
                  {getAvailableClinics().map((clinic, idx) => (
                    <option key={idx} value={clinic.name}>
                      {clinic.name}
                      {clinic.address && ` - ${clinic.address}`}
                    </option>
                  ))}
                </select>

                {/* Consultation Type - Now a text input with default value */}
                <div className="flex items-center space-x-2 mb-3">
                  <Stethoscope className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Consultation Type: *
                  </label>
                </div>
                <input
                  type="text"
                  value={form.type}
                  onChange={handleChange}
                  name="type"
                  className={`w-full p-3 rounded-lg border-2 focus:outline-none mb-4 transition-colors ${
                    errors.type
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-purple-500"
                  }`}
                  placeholder="General Consultation"
                />

                {/* Service Fee Dropdown */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">₱</span>
                  </div>
                  <label className="text-sm font-medium text-gray-700">
                    Service Fee: *
                  </label>
                </div>
                <select
                  value={form.serviceFee.name}
                  onChange={handleServiceFeeChange}
                  className={`w-full p-3 rounded-lg border-2 focus:outline-none mb-4 transition-colors ${
                    errors.serviceFee
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-purple-500"
                  }`}
                >
                  <option value="">-- Select Service Fee Type --</option>
                  {serviceFeeOptions.map((service, idx) => (
                    <option key={idx} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>

                {/* Professional Fees Display */}
                {selectedDoctor?.professionalFees && form.serviceFee.name && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-bold">
                          ₱
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800">
                        Professional Fees
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {form.serviceFee.name === "General Consultation" && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Consultation Fee:
                          </span>
                          <span className="font-bold text-lg text-green-600">
                            ₱
                            {selectedDoctor.professionalFees.followUpFee?.toLocaleString() ||
                              "N/A"}
                          </span>
                        </div>
                      )}

                      {/* Show both fees for reference */}
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Consultation:</span>
                            <span>
                              ₱
                              {selectedDoctor.professionalFees.consultationFee?.toLocaleString() ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Follow-up:</span>
                            <span>
                              ₱
                              {selectedDoctor.professionalFees.followUpFee?.toLocaleString() ||
                                "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Display selected service fee details */}
                    {form.serviceFee.fee && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Selected Fee:
                          </span>
                          <span className="font-bold text-lg text-purple-600">
                            {form.serviceFee.name} - ₱
                            {Number(form.serviceFee.fee).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center max-w-7xl mx-auto px-6 pb-10">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all transform ${
              submitting
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700 hover:scale-105 active:scale-95"
            }`}
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Booking...</span>
              </div>
            ) : (
              "Confirm Booking"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientBooking;
