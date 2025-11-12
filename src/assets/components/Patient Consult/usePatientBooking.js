import { useEffect, useState } from "react";
import { ref, push, set, onValue, get } from "firebase/database";
import { database } from "../../firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import {
  validateForm,
  getDoctorSlotsForDate,
  isDoctorAvailableOnDate,
  isDateFullyBookedForDoctor,
  requiredFields,
  isToday,
} from "./bookingUtils";

const initialFormState = {
  patientFirstName: "",
  patientLastName: "",
  email: "",
  contactNumber: "",
  dateOfBirth: "",
  patientComplaint: [""],
  additionalNotes: "",
  doctor: "",
  appointmentDate: "",
  appointmentTime: "",
  clinicName: "",
  clinicId: "",
  type: "General Consultation",
  serviceFee: { name: "", fee: "" },
};

export const usePatientBooking = () => {
  const [user, loading] = useAuthState(auth);

  // Form state
  const [form, setForm] = useState(initialFormState);

  // Data states
  const [doctorList, setDoctorList] = useState([]);
  const [clinicList, setClinicList] = useState([]);
  const [bookedDatesForDoctor, setBookedDatesForDoctor] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState({});
  const [doctorSpecificDates, setDoctorSpecificDates] = useState({});

  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMonthOffset, setViewMonthOffset] = useState(0);
  const [manualConflict, setManualConflict] = useState("");
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Fetch current user data
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
      }
      setUserDataLoaded(true);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserDataLoaded(true);
    } finally {
      setLoadingData(false);
    }
  };

  // Load user data on component mount
  useEffect(() => {
    if (user && !userDataLoaded) {
      fetchCurrentUserData(user.uid);
    }
  }, [user, userDataLoaded]);

  // Load doctors, clinics, and appointments data
  useEffect(() => {
    const docRef = ref(database, "doctors");
    const clinicsRef = ref(database, "clinics");
    const patRef = ref(database, `appointments`);

    const unsubscribeDoc = onValue(docRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([firebaseKey, doctor]) => ({
          ...doctor,
          doctorId: firebaseKey,
          id: firebaseKey,
        }));
        setDoctorList(list);

        const availabilityMap = {};
        const specificDatesMap = {};

        Object.entries(data).forEach(([firebaseKey, doctor]) => {
          if (doctor.availability && doctor.availability.weeklySchedule) {
            availabilityMap[doctor.fullName] =
              doctor.availability.weeklySchedule;
          }

          if (doctor.availability && doctor.availability.specificDates) {
            specificDatesMap[doctor.fullName] =
              doctor.availability.specificDates;
          }
        });

        setDoctorAvailability(availabilityMap);
        setDoctorSpecificDates(specificDatesMap);
      }
    });

    const unsubscribeClinics = onValue(clinicsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const clinics = Object.entries(data).map(([id, clinic]) => ({
          id,
          ...clinic,
        }));
        setClinicList(clinics);
      }
    });

    const unsubscribePat = onValue(patRef, (snap) => {
      const data = snap.val();
      if (data) {
        const generalConsultationAppointments = Object.values(data).filter(
          (appointment) => appointment.type === "General Consultation"
        );

        if (form.doctor) {
          const doctorAppointments = generalConsultationAppointments.filter(
            (appointment) => appointment.doctor === form.doctor
          );

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

    return () => {
      unsubscribeDoc();
      unsubscribeClinics();
      unsubscribePat();
    };
  }, [form.doctor]);

  // Load booked times for selected date and doctor
  useEffect(() => {
    if (!form.appointmentDate || !form.doctor) {
      setBookedTimes([]);
      return;
    }

    const patRef = ref(database, `appointments`);
    const unsubscribe = onValue(patRef, (snap) => {
      const data = snap.val();
      if (data) {
        const matched = Object.values(data).filter(
          (entry) =>
            entry.appointmentDate === form.appointmentDate &&
            entry.doctorId === selectedDoctor?.doctorId &&
            entry.type === "general_consultation"
        );
        const times = matched.map((e) => e.appointmentTime);
        setBookedTimes(times);
      } else {
        setBookedTimes([]);
      }
    });

    return () => unsubscribe();
  }, [form.appointmentDate, form.doctor, selectedDoctor?.doctorId]);

  // Check for time conflicts
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

  // Helper functions
  const getDoctorSlots = () => {
    if (!form.doctor || !form.appointmentDate) {
      return [];
    }
    return getDoctorSlotsForDate(
      form.appointmentDate,
      form.doctor,
      doctorSpecificDates,
      doctorAvailability
    );
  };

  const checkDoctorAvailability = (year, month, day) => {
    return isDoctorAvailableOnDate(
      year,
      month,
      day,
      form.doctor,
      doctorSpecificDates,
      doctorAvailability
    );
  };

  const checkDateFullyBooked = (year, month, day) => {
    return isDateFullyBookedForDoctor(
      year,
      month,
      day,
      form.doctor,
      bookedDatesForDoctor,
      doctorSpecificDates,
      doctorAvailability
    );
  };

  const getAvailableClinics = () => {
    if (!selectedDoctor || !selectedDoctor.clinicAffiliations) return [];
    return clinicList.filter((clinic) =>
      selectedDoctor.clinicAffiliations.includes(clinic.id)
    );
  };

  // Event handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handlePhone = (e) => {
    let val = e.target.value.replace(/\D/g, "");

    if (!val.startsWith("09")) {
      val = "09" + val;
    }

    if (val.length > 11) {
      val = val.slice(0, 11);
    }

    setForm((p) => ({ ...p, contactNumber: val }));
    setTouched((prev) => ({ ...prev, contactNumber: true }));

    if (errors.contactNumber) {
      setErrors((prev) => ({ ...prev, contactNumber: false }));
    }
  };

  const addComplaint = () => {
    setForm((p) => ({ ...p, patientComplaint: [...p.patientComplaint, ""] }));
  };

  const handleComplaintChange = (i, v) => {
    const updated = [...form.patientComplaint];
    updated[i] = v;
    setForm((p) => ({ ...p, patientComplaint: updated }));

    if (errors.patientComplaint) {
      setErrors((prev) => ({ ...prev, patientComplaint: false }));
    }
  };

  const handleServiceFeeChange = (e) => {
    const selectedName = e.target.value;
    let fee = "";
    let consultationType = "";

    if (selectedDoctor?.professionalFees && selectedName) {
      if (selectedName === "General Consultation") {
        fee = selectedDoctor.professionalFees.consultationFee?.toString() || "";
        consultationType = "General Consultation";
      } else if (selectedName === "Follow-up Consultation") {
        fee = selectedDoctor.professionalFees.followUpFee?.toString() || "";
        consultationType = "Follow-up Consultation";
      }
    }

    setForm((prev) => ({
      ...prev,
      serviceFee: { name: selectedName, fee: fee },
      type: consultationType, // Auto-populate consultation type (will be empty if no selection)
    }));

    setTouched((prev) => ({
      ...prev,
      serviceFee: true,
      type: !!consultationType, // Only mark as touched if we have a consultation type
    }));

    if (errors.serviceFee) {
      setErrors((prev) => ({ ...prev, serviceFee: false }));
    }
    if (errors.type && consultationType) {
      setErrors((prev) => ({ ...prev, type: false }));
    }
  };

  const handleDoctorChange = (e) => {
    const doctor = e.target.value;
    setForm((p) => ({
      ...p,
      doctor,
      clinicName: "",
      clinicId: "",
      serviceFee: { name: "", fee: "" },
      type: "", // Clear consultation type when doctor changes
      appointmentDate: "",
      appointmentTime: "",
    }));

    setErrors((prev) => ({
      ...prev,
      doctor: false,
      clinicName: false,
      clinicId: false,
      serviceFee: false,
      type: false, // Clear type error
      appointmentDate: false,
      appointmentTime: false,
    }));

    setSelectedDay(null);

    const doc = doctorList.find((d) => d.fullName === doctor);
    setSelectedDoctor(doc || null);

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
  };

  const handleClinicChange = (e) => {
    const clinicName = e.target.value;
    const selectedClinic = clinicList.find(
      (clinic) => clinic.name === clinicName
    );

    setForm((p) => ({
      ...p,
      clinicName,
      clinicId: selectedClinic?.id || "",
    }));

    setErrors((prev) => ({
      ...prev,
      clinicName: false,
      clinicId: false,
    }));
  };

  const selectDate = (day, currentYear, baseDate) => {
    const selectedFullDate = new Date(currentYear, baseDate.getMonth(), day);
    if (
      selectedFullDate < new Date().setHours(0, 0, 0, 0) &&
      !isToday(currentYear, baseDate.getMonth(), day)
    )
      return;
    const monthStr = String(baseDate.getMonth() + 1).padStart(2, "0");
    const date = `${currentYear}-${monthStr}-${String(day).padStart(2, "0")}`;
    setForm((p) => ({ ...p, appointmentDate: date }));
    setSelectedDay(day);

    if (errors.appointmentDate) {
      setErrors((prev) => ({ ...prev, appointmentDate: false }));
    }
  };

  const handleTimeSlotClick = (timeSlot) => {
    if (!bookedTimes.includes(timeSlot)) {
      setForm((prev) => ({ ...prev, appointmentTime: timeSlot }));
      setTouched((prev) => ({ ...prev, appointmentTime: true }));

      if (errors.appointmentTime) {
        setErrors((prev) => ({ ...prev, appointmentTime: false }));
      }
    }
  };

  // Form submission
  const handleSubmit = async () => {
    const validationErrors = validateForm(form, requiredFields, manualConflict);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      alert("Please fill in all required fields correctly.");
      return false;
    }

    setSubmitting(true);
    setLoadingData(true);

    try {
      const newRef = push(ref(database, `appointments`));
      const currentTimestamp = new Date().toISOString();

      const doctorId =
        selectedDoctor?.doctorId ||
        selectedDoctor?.id ||
        selectedDoctor?.uid ||
        "";

      const appointmentData = {
        chiefComplaint: form.patientComplaint,
        additionalNotes: form.additionalNotes,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        appointmentPurpose: form.serviceFee.name,
        clinicId: form.clinicId,
        clinicName: form.clinicName,
        contactNumber: form.contactNumber,
        createdAt: currentTimestamp,
        doctorId: doctorId,
        lastUpdated: currentTimestamp,
        patientId: user?.uid || "",
        sourceSystem: "OdySystem_Web",
        status: "pending",
        type: "general_consultation",
      };

      await set(newRef, appointmentData);

      // Email notification
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

        await fetch(`${API_URL}api/send-patient-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${form.patientFirstName} ${form.patientLastName}`,
            contactNumber: form.contactNumber,
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

      setSuccessModal(true);

      // Reset form
      setForm({
        ...initialFormState,
        patientFirstName: form.patientFirstName,
        patientLastName: form.patientLastName,
        email: form.email,
        contactNumber: form.contactNumber,
        dateOfBirth: form.dateOfBirth,
      });
      setSelectedDay(null);
      setSelectedDoctor(null);
      setTouched({});
      setErrors({});

      return true; // Successful submission
    } catch (err) {
      console.error("Booking error:", err);
      alert("❌ Error booking appointment: " + err.message);
      return false;
    } finally {
      setSubmitting(false);
      setLoadingData(false);
    }
  };

  return {
    // State
    form,
    doctorList,
    clinicList,
    bookedDatesForDoctor,
    bookedTimes,
    selectedDoctor,
    submitting,
    successModal,
    loadingData,
    loading,
    errors,
    touched,
    selectedDay,
    viewMonthOffset,
    manualConflict,
    user,

    // Actions
    setViewMonthOffset,
    setSuccessModal,
    handleChange,
    handlePhone,
    addComplaint,
    handleComplaintChange,
    handleServiceFeeChange,
    handleDoctorChange,
    handleClinicChange,
    selectDate,
    handleTimeSlotClick,
    handleSubmit,
    setTouched,

    // Helper functions
    getDoctorSlots,
    checkDoctorAvailability,
    checkDateFullyBooked,
    getAvailableClinics,
  };
};
