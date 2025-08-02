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
} from "firebase/database";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

function PatientBooking() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientFirstName: "",
    patientLastName: "",
    email: "",
    phone: "+63",
    dateOfBirth: "",
    bloodType: "",
    address: "",
    patientComplaint: [""],
    doctor: "",
    appointmentDate: "",
    appointmentTime: "",
    clinicName: "",
    clinicId: "", // Added clinic ID field
    type: "",
    emergencyContact: { name: "", phone: "", relation: "" },
  });

  const [doctorList, setDoctorList] = useState([]);
  const [clinicList, setClinicList] = useState([]); // Added clinic list state
  const [medicalServices, setMedicalServices] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    patientFirstName: true,
    patientLastName: true,
    email: true,
    phone: true,
    address: true,
    patientComplaint: true,
    doctor: true,
    appointmentDate: true,
    appointmentTime: true,
    clinicName: true,
    clinicId: true, // Added clinic ID validation
    type: true,
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMonthOffset, setViewMonthOffset] = useState(0);
  const [manualConflict, setManualConflict] = useState("");

  const doctorAvailability = {
    "Dr. A": ["10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM"],
    "Dr. B": [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "01:00 PM",
      "03:00 PM",
      "04:00 PM",
    ],
    default: [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "01:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
      "05:00 PM",
    ],
  };

  useEffect(() => {
    const docRef = ref(database, "doctors");
    const clinicsRef = ref(database, "clinics"); // Added clinics reference
    const patRef = ref(database, `appointments/consultations`);
    const servicesRef = ref(database, "medicalServices/consultationTypes");

    // Fetch doctors
    onValue(docRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.values(data);
        setDoctorList(list);
      }
    });

    // Fetch clinics with their IDs
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
        // Filter to show only General Consultation
        const generalConsultation = services.filter(
          (service) => service.name === "General Consultation"
        );
        setMedicalServices(generalConsultation);
      }
    });

    onValue(patRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Filter appointments to only include General Consultation
        const generalConsultationAppointments = Object.values(data).filter(
          (appointment) => appointment.type === "General Consultation"
        );

        const dates = generalConsultationAppointments.map(
          (e) => e.appointmentDate?.split("-")[2]
        );
        setBookedDates(dates.map(Number));
      } else {
        setBookedDates([]);
      }
    });
  }, []);

  // Also modify the second useEffect for booked times
  useEffect(() => {
    if (!form.appointmentDate || !form.doctor) return;

    const patRef = ref(database, `appointments/consultations`);
    onValue(patRef, (snap) => {
      const data = snap.val();
      const matched = Object.values(data || {}).filter(
        (entry) =>
          entry.appointmentDate === form.appointmentDate &&
          entry.doctor === form.doctor &&
          entry.type === "General Consultation" // Add this filter
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

  const validateField = (name, value) => {
    if (name === "patientComplaint")
      return value.filter((c) => c.trim()).length > 0 ? null : true;
    if (name === "phone") return value && value.length === 13 ? null : true;
    if (name === "appointmentTime")
      return value && !manualConflict ? null : true;
    if (name === "doctor") return value && value.trim() !== "" ? null : true;
    if (name === "clinicName")
      return value && value.trim() !== "" ? null : true;
    if (name === "clinicId") return value && value.trim() !== "" ? null : true;
    if (name === "type") return value && value.trim() !== "" ? null : true;

    return value.trim() ? null : true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handlePhone = (e) => {
    let val = e.target.value;
    if (val.startsWith("+63"))
      val = "+63" + val.substring(3).replace(/\D/g, "");
    if (val.length > 13) val = val.slice(0, 13);
    if (val.length >= 3) {
      setForm((p) => ({ ...p, phone: val }));
      const err = validateField("phone", val);
      setErrors((prev) => ({ ...prev, phone: err }));
    }
  };

  const addComplaint = () => {
    setForm((p) => ({ ...p, patientComplaint: [...p.patientComplaint, ""] }));
  };

  const handleComplaintChange = (i, v) => {
    const updated = [...form.patientComplaint];
    updated[i] = v;
    setForm((p) => ({ ...p, patientComplaint: updated }));
    const err = validateField("patientComplaint", updated);
    setErrors((prev) => ({ ...prev, patientComplaint: err }));
  };

  const validate = () => {
    const e = {};
    for (const key in form) {
      const err = validateField(key, form[key]);
      if (err) e[key] = true;
    }
    // Additional check for manual conflicts
    if (manualConflict) {
      e.appointmentTime = true;
    }
    return e;
  };

  const handleSubmit = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      console.log("Validation errors:", v);
      alert("Please fill in all required fields correctly.");
      return;
    }
    setSubmitting(true);
    setLoading(true);

    try {
      const newRef = push(ref(database, `appointments/consultations`));

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
          patientFirstName: form.patientFirstName,
          patientLastName: form.patientLastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          complaints: form.patientComplaint.filter((c) => c.trim() !== ""),
        },
        doctor: form.doctor,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        clinicName: form.clinicName,
        clinicId: form.clinicId,
        type: form.type,
        status: "Pending",
        createdAt: createdAt,
        lastUpdated: lastUpdated,
      };

      console.log("Saving appointment data:", appointmentData);

      await set(newRef, appointmentData);

      // Send confirmation email
      try {
        await fetch("http://localhost:5000/api/send-patient-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${form.patientFirstName} ${form.patientLastName}`,
            phone: form.phone,
            doctor: form.doctor,
            clinic: form.clinicName,
            date: form.appointmentDate,
            time: form.appointmentTime,
            email: form.email,
          }),
        });
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
        // Don't block the booking if email fails
      }

      alert("✅ Appointment booked successfully!");

      // Reset form
      setForm({
        patientFirstName: "",
        patientLastName: "",
        email: "",
        phone: "+63",
        address: "",
        patientComplaint: [""],
        doctor: "",
        appointmentDate: "",
        appointmentTime: "",
        clinicName: "",
        clinicId: "", // Reset clinic ID
        type: "",
      });
      setSelectedDay(null);
      setSelectedDoctor(null);
      setErrors({
        patientFirstName: true,
        patientLastName: true,
        email: true,
        phone: true,
        address: true,
        patientComplaint: true,
        doctor: true,
        appointmentDate: true,
        appointmentTime: true,
        clinicName: true,
        clinicId: true, // Reset clinic ID error
        type: true,
      });
      navigate("/login");
    } catch (err) {
      console.error("Booking error:", err);
      alert("❌ Error booking appointment: " + err.message);
    }

    setSubmitting(false);
    setLoading(false);
  };

  const inputStyle = (field) =>
    `w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
      errors[field]
        ? "border-red-300 focus:border-red-500"
        : "border-green-300 focus:border-green-500"
    }`;
  const iconStyle = "absolute right-3 top-3 w-5 h-5";

  const renderInput = (field, type = "text", placeholder = "", icon = null) => (
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
        placeholder={placeholder}
        className={inputStyle(field)}
        disabled={submitting}
      />
      {errors[field] ? (
        <AlertCircle className={`${iconStyle} text-red-500`} />
      ) : (
        <CheckCircle className={`${iconStyle} text-green-600`} />
      )}
    </div>
  );

  const getDoctorSlots = () => {
    const doc = form.doctor.trim();
    return doctorAvailability[doc] || doctorAvailability.default;
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

  // Helper function to get available clinics for the selected doctor
  const getAvailableClinics = () => {
    if (!selectedDoctor || !selectedDoctor.clinicAffiliations) return [];

    return clinicList.filter((clinic) =>
      selectedDoctor.clinicAffiliations.includes(clinic.name)
    );
  };

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
    const err = validateField("appointmentDate", date);
    setErrors((prev) => ({ ...prev, appointmentDate: err }));
  };

  const slots = getDoctorSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 font-sans relative">
      {loading && (
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
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {renderInput("patientFirstName", "text", "First Name", User)}
                {renderInput("patientLastName", "text", "Last Name", User)}
              </div>
              {renderInput("email", "email", "Email", Mail)}
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  name="phone"
                  type="text"
                  value={form.phone}
                  onChange={handlePhone}
                  placeholder="Phone (+63)"
                  className={inputStyle("phone")}
                  disabled={submitting}
                />
                {errors.phone ? (
                  <AlertCircle className={`${iconStyle} text-red-500`} />
                ) : (
                  <CheckCircle className={`${iconStyle} text-green-600`} />
                )}
              </div>
              {renderInput("address", "text", "Address", MapPin)}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-700">
                      Medical Complaints
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
                  <input
                    key={i}
                    value={c}
                    onChange={(e) => handleComplaintChange(i, e.target.value)}
                    className={`w-full px-4 py-3 mb-2 rounded-lg border-2 transition-colors focus:outline-none ${
                      errors.patientComplaint
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-teal-500"
                    }`}
                    placeholder={`Complaint ${i + 1}`}
                  />
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
                  const isBooked = bookedDates.includes(day);

                  return (
                    <div
                      key={day}
                      className={`rounded-lg w-10 h-10 flex items-center justify-center cursor-pointer text-sm font-medium transition-all
                    ${
                      isPastDay
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : isSelected
                        ? "bg-teal-600 text-white shadow-lg"
                        : isBooked
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-gray-50 text-gray-700 hover:bg-teal-100 hover:text-teal-600"
                    }`}
                      onClick={() => !isPastDay && selectDate(day)}
                    >
                      {day}
                    </div>
                  );
                }
              )}
            </div>

            {form.appointmentDate && (
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">
                    Select Time:
                  </label>
                </div>
                <select
                  name="appointmentTime"
                  value={form.appointmentTime}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none mb-4"
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
                {manualConflict && (
                  <p className="text-red-600 text-sm mt-3 p-3 bg-red-50 rounded-lg">
                    {manualConflict}
                  </p>
                )}
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
                  clinicName: "", // Reset clinic selection when doctor changes
                  clinicId: "", // Reset clinic ID when doctor changes
                }));
                const err = validateField("doctor", doctor);
                setErrors((prev) => ({
                  ...prev,
                  doctor: err,
                  clinicName: true, // Reset clinic validation
                  clinicId: true, // Reset clinic ID validation
                }));

                const doc = doctorList.find((d) => d.fullName === doctor);
                setSelectedDoctor(doc || null);

                // Auto-select clinic if doctor has only one clinic affiliation
                if (doc?.clinicAffiliations?.length === 1) {
                  const clinicName = doc.clinicAffiliations[0];
                  const clinic = clinicList.find((c) => c.name === clinicName);

                  setForm((p) => ({
                    ...p,
                    clinicName: clinicName,
                    clinicId: clinic?.id || "",
                  }));

                  const clinicErr = validateField("clinicName", clinicName);
                  const clinicIdErr = validateField(
                    "clinicId",
                    clinic?.id || ""
                  );
                  setErrors((prev) => ({
                    ...prev,
                    clinicName: clinicErr,
                    clinicId: clinicIdErr,
                  }));
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-center mb-6"
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
                  Clinic:
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

                    const clinicErr = validateField("clinicName", clinicName);
                    const clinicIdErr = validateField(
                      "clinicId",
                      selectedClinic?.id || ""
                    );
                    setErrors((prev) => ({
                      ...prev,
                      clinicName: clinicErr,
                      clinicId: clinicIdErr,
                    }));
                  }}
                  className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none mb-4"
                >
                  <option value="">-- Select Clinic --</option>
                  {getAvailableClinics().map((clinic, idx) => (
                    <option key={idx} value={clinic.name}>
                      {clinic.name}
                      {clinic.address && ` - ${clinic.address}`}
                    </option>
                  ))}
                </select>

                <div className="flex items-center space-x-2 mb-3">
                  <Stethoscope className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Consultation Type:
                  </label>
                </div>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setForm((p) => ({ ...p, type }));
                    const err = validateField("type", type);
                    setErrors((prev) => ({ ...prev, type: err }));
                  }}
                  className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">-- Select Consultation Type --</option>
                  {medicalServices.map((service, idx) => (
                    <option key={idx} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
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
