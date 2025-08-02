import { useState, useEffect, useRef } from "react";
import React from "react";
import { ref, push, set, onValue } from "firebase/database";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  FileText,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Microscope,
  Plus,
  X,
  Phone,
  Calendar,
  Droplet,
  UserCheck,
} from "lucide-react";

function LaboratoryExams() {
  const navigate = useNavigate();
  const slotRef = useRef(null);
  const newRef = push(ref(database, `appointments/laboratory`));

  const [form, setForm] = useState({
    labTestName: "",
    labTestId: "",
    patientName: "",
    email: "",
    contactNumber: "",
    dateOfBirth: "",
    bloodType: "",
    referDoctor: "",
    userId: "",
    slotNumber: "",
    notes: "",
    clinic: "",
    clinicId: "",
    addressLine: "",
    type: "",
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
    patientComplaint: [""],
    createdAt: {
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  });

  const [state, setState] = useState({
    examTypes: [],
    selectedDescription: "",
    clinics: [],
    selectedClinicInfo: null,
    doctors: [],
    selectedDoctorInfo: null,
    bookedSlots: [],
    appointments: [],
    submitting: false,
    loading: false,
    currentPage: 0,
    errors: {
      patientName: true,
      email: true,
      contactNumber: true,
      dateOfBirth: true,
      bloodType: true,
      labTestName: true,
      slotNumber: true,
      clinic: true,
      clinicId: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelation: true,
    },
  });

  // Blood type options
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  // Relation options for emergency contact
  const relationOptions = [
    "Spouse",
    "Parent",
    "Child",
    "Sibling",
    "Friend",
    "Guardian",
    "Other",
  ];

  // Fetch data
  useEffect(() => {
    const types = [];
    ["laboratoryTests", "imagingTests"].forEach((service) => {
      onValue(ref(database, `medicalServices/${service}`), (snap) => {
        const data = snap.val();
        if (data) {
          const items = Object.entries(data).map(([key, e]) => ({
            id: key,
            name: e.name,
            description: e.description,
          }));
          setState((prev) => ({
            ...prev,
            examTypes: [
              ...prev.examTypes.filter(
                (t) => !items.some((i) => i.id === t.id)
              ),
              ...items,
            ],
          }));
        }
      });
    });

    // Fetch clinics with debugging
    onValue(ref(database, "clinics"), (snap) => {
      const data = snap.val();
      console.log("Raw clinics data from Firebase:", data);
      if (data) {
        const clinicsWithKeys = Object.entries(data).map(([key, value]) => {
          console.log("Processing clinic:", key, value);
          return {
            ...value,
            id: key, // Firebase key as ID
            clinicId: key, // Also store as clinicId for backup
          };
        });
        console.log("Processed clinics:", clinicsWithKeys);
        setState((prev) => ({ ...prev, clinics: clinicsWithKeys }));
      }
    });

    // Fetch doctors
    onValue(ref(database, "doctors"), (snap) => {
      const data = snap.val();
      if (data) {
        const doctorsWithKeys = Object.entries(data).map(([key, value]) => ({
          ...value,
          id: key,
        }));
        setState((prev) => ({ ...prev, doctors: doctorsWithKeys }));
      }
    });
  }, []);

  // Fetch appointments
  useEffect(() => {
    onValue(ref(database, `appointments/laboratory`), (snap) => {
      const data = snap.val();
      if (data) {
        const all = Object.values(data);
        const todaysAppointments = all.filter(
          (a) =>
            a.createdAt?.date === form.createdAt.date &&
            a.labTestName === form.labTestName
        );
        setState((prev) => ({
          ...prev,
          appointments: todaysAppointments,
          bookedSlots: todaysAppointments.map((e) => e.slotNumber),
        }));
      } else {
        setState((prev) => ({ ...prev, appointments: [], bookedSlots: [] }));
      }
    });
  }, [form.createdAt.date, form.labTestName]);

  const validateField = (name, value) => {
    const required = [
      "patientName",
      "email",
      "contactNumber",
      "dateOfBirth",
      "bloodType",
      "labTestName",
      "clinic",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelation",
    ];

    if (required.includes(name)) {
      if (name === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return value?.trim() && emailRegex.test(value) ? null : true;
      }
      if (name === "contactNumber" || name === "emergencyContactPhone") {
        // Must be exactly 11 digits, numbers only
        const phoneRegex = /^\d{11}$/;
        return value?.trim() && phoneRegex.test(value) ? null : true;
      }
      return value?.trim() ? null : true;
    }

    if (name === "slotNumber") {
      return value ? null : true;
    }

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle phone number inputs - only allow numbers and limit to 11 digits
    if (name === "contactNumber") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 11) {
        const err = validateField(name, numbersOnly);
        setForm((prev) => ({ ...prev, [name]: numbersOnly }));
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [name]: err },
        }));
      }
      return;
    }

    const err = validateField(name, value);
    setForm((prev) => ({ ...prev, [name]: value }));
    setState((prev) => ({ ...prev, errors: { ...prev.errors, [name]: err } }));

    if (name === "labTestName") {
      setState((prev) => ({ ...prev, currentPage: 0 }));
      const selectedTest = state.examTypes.find((test) => test.name === value);
      setForm((prev) => ({
        ...prev,
        [name]: value,
        labTestId: selectedTest?.id || "",
        slotNumber: "",
      }));
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, slotNumber: true },
      }));
      setTimeout(
        () => slotRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    }
  };

  // Handle emergency contact changes
  const handleEmergencyContactChange = (field, value) => {
    const fieldName = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;

    // Handle phone number for emergency contact - only allow numbers and limit to 11 digits
    if (field === "phone") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 11) {
        const err = validateField(fieldName, numbersOnly);

        setForm((prev) => ({
          ...prev,
          emergencyContact: {
            ...prev.emergencyContact,
            [field]: numbersOnly,
          },
        }));

        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [fieldName]: err },
        }));
      }
      return;
    }

    const err = validateField(fieldName, value);

    setForm((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));

    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: err },
    }));
  };

  // Handle patient complaint changes
  const handleComplaintChange = (index, value) => {
    const newComplaints = [...form.patientComplaint];
    newComplaints[index] = value;
    setForm((prev) => ({ ...prev, patientComplaint: newComplaints }));
  };

  // Add new complaint field
  const addComplaintField = () => {
    setForm((prev) => ({
      ...prev,
      patientComplaint: [...prev.patientComplaint, ""],
    }));
  };

  // Remove complaint field
  const removeComplaintField = (index) => {
    if (form.patientComplaint.length > 1) {
      const newComplaints = form.patientComplaint.filter((_, i) => i !== index);
      setForm((prev) => ({ ...prev, patientComplaint: newComplaints }));
    }
  };

  const validate = () => {
    const errs = {};

    // Validate basic form fields
    Object.entries(form).forEach(([name, value]) => {
      if (name !== "patientComplaint" && name !== "emergencyContact") {
        const err = validateField(name, value);
        if (err) errs[name] = true;
      }
    });

    // Validate emergency contact fields
    const emergencyContactFields = ["name", "phone", "relation"];
    emergencyContactFields.forEach((field) => {
      const fieldName = `emergencyContact${
        field.charAt(0).toUpperCase() + field.slice(1)
      }`;
      const err = validateField(fieldName, form.emergencyContact[field]);
      if (err) errs[fieldName] = true;
    });

    return errs;
  };

  const getEstimatedTime = (slotNumber) => {
    const sorted = state.appointments
      .filter((a) => parseInt(a.slotNumber) < parseInt(slotNumber))
      .sort((a, b) => parseInt(a.slotNumber) - parseInt(b.slotNumber));
    const baseTime = new Date();
    baseTime.setHours(8, 0, 0, 0);
    baseTime.setMinutes(baseTime.getMinutes() + sorted.length * 30);
    return baseTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setState((prev) => ({ ...prev, errors: validationErrors }));
    if (Object.keys(validationErrors).length > 0) return;

    setState((prev) => ({ ...prev, submitting: true, loading: true }));

    try {
      const estimatedTime = getEstimatedTime(form.slotNumber);
      const description =
        state.selectedDescription || "No description provided";
      const nameParts = form.patientName.trim().split(" ");
      const patientFirstName =
        nameParts.length === 1
          ? nameParts[0]
          : nameParts.slice(0, -1).join(" ");
      const patientLastName =
        nameParts.length === 1 ? "" : nameParts[nameParts.length - 1];

      const dataToPush = {
        ...form,
        estimatedTime,
        description,
        patientFirstName,
        patientLastName,
        status: "Pending",
        addressLine: state.selectedClinicInfo?.addressLine || "",
        type: state.selectedClinicInfo?.type || "",
        clinicId: state.selectedClinicInfo?.id || "",
        patientComplaint: form.patientComplaint.filter(
          (complaint) => complaint.trim() !== ""
        ),
      };

      await set(
        ref(database, `appointments/laboratory/${newRef.key}`),
        dataToPush
      );

      await fetch("http://localhost:5000/api/send-lab-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: form.patientName,
          labTestName: form.labTestName,
          slotNumber: form.slotNumber,
          estimatedTime,
          email: form.email,
          contactNumber: form.contactNumber,
          dateOfBirth: form.dateOfBirth,
          bloodType: form.bloodType,
          referDoctor: form.referDoctor,
          clinic: form.clinic,
          addressLine: state.selectedClinicInfo?.addressLine || "",
          emergencyContact: form.emergencyContact,
          patientComplaint: form.patientComplaint.filter(
            (complaint) => complaint.trim() !== ""
          ),
        }),
      });

      alert("✅ Booking saved successfully!");

      // Reset form
      setForm({
        labTestName: "",
        labTestId: "",
        patientName: "",
        email: "",
        contactNumber: "",
        dateOfBirth: "",
        bloodType: "",
        referDoctor: "",
        userId: "",
        slotNumber: "",
        notes: "",
        clinic: "",
        clinicId: "",
        addressLine: "",
        type: "",
        emergencyContact: { name: "", phone: "", relation: "" },
        patientComplaint: [""],
        createdAt: {
          date: new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      });

      setState((prev) => ({
        ...prev,
        errors: {
          patientName: true,
          email: true,
          contactNumber: true,
          dateOfBirth: true,
          bloodType: true,
          labTestName: true,
          slotNumber: true,
          clinic: true,
          clinicId: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
        },
        selectedDoctorInfo: null,
        selectedClinicInfo: null,
      }));

      navigate("/login");
    } catch (error) {
      alert("❌ " + error.message);
    }

    setState((prev) => ({ ...prev, submitting: false, loading: false }));
  };

  const inputStyle = (field) =>
    `w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
      state.errors[field]
        ? "border-red-300 focus:border-red-500"
        : "border-green-300 focus:border-green-500"
    }`;

  const renderInput = (field, type = "text", placeholder = "", icon = null) => (
    <div className="relative mb-4">
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
        disabled={state.submitting}
        max={
          type === "date" ? new Date().toISOString().split("T")[0] : undefined
        }
      />
      {state.errors[field] ? (
        <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
      ) : (
        <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
      )}
      {state.errors[field] && (
        <p className="text-red-500 text-sm mt-1">
          {field === "patientName" && "Patient name is required"}
          {field === "email" && "Valid email is required"}
          {field === "contactNumber" && "Valid contact number is required"}
          {field === "dateOfBirth" && "Date of birth is required"}
          {field === "bloodType" && "Blood type is required"}
          {field === "labTestName" && "Lab test is required"}
          {field === "slotNumber" && "Slot is required"}
          {field === "clinic" && "Clinic is required"}
        </p>
      )}
    </div>
  );

  const renderSlots = () => {
    const start = state.currentPage * 50 + 1;
    return Array.from({ length: 50 }, (_, i) => {
      const slot = String(start + i).padStart(3, "0");
      const isBooked = state.bookedSlots.includes(slot);
      const isSelected = form.slotNumber === slot;
      return (
        <div
          key={slot}
          onClick={() => {
            if (!isBooked) {
              setForm((f) => ({ ...f, slotNumber: slot }));
              setState((prev) => ({
                ...prev,
                errors: { ...prev.errors, slotNumber: null },
              }));
            }
          }}
          className={`rounded-lg w-12 h-12 flex items-center justify-center text-sm font-semibold cursor-pointer transition-all transform hover:scale-105 shadow-sm ${
            isBooked
              ? "bg-red-400 text-white cursor-not-allowed opacity-75"
              : isSelected
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
              : "bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
          }`}
        >
          {slot}
        </div>
      );
    });
  };

  const SelectField = ({ name, options, placeholder, icon, onChange }) => (
    <div className="relative mb-4">
      {icon &&
        React.createElement(icon, {
          className: "absolute left-3 top-3 w-5 h-5 text-gray-400",
        })}
      <select
        name={name}
        value={form[name]}
        onChange={onChange || handleChange}
        className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
          state.errors[name]
            ? "border-red-300 focus:border-red-500"
            : "border-gray-300 focus:border-blue-500"
        }`}
        disabled={state.submitting}
      >
        <option value="">{placeholder}</option>
        {options.map((option, idx) => (
          <option key={idx} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {state.errors[name] ? (
        <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
      ) : form[name] ? (
        <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
      ) : null}
      {state.errors[name] && (
        <p className="text-red-500 text-sm mt-1">{name} is required</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans relative">
      {state.loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">
              Processing Laboratory Booking...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Please wait while we schedule your exam
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
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
              Book Laboratory Exam
            </h1>
            <div className="w-40"></div>
          </div>
          <p className="text-center text-blue-100 mt-2">
            Schedule your diagnostic tests and lab work
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
            {renderInput("patientName", "text", "Full Name", User)}
            {renderInput("email", "email", "Email Address", Mail)}
            {renderInput(
              "contactNumber",
              "text",
              "Contact Number (11 digits)",
              Phone
            )}
            {renderInput("dateOfBirth", "date", "Date of Birth", Calendar)}

            <SelectField
              name="bloodType"
              icon={Droplet}
              placeholder="-- Select Blood Type --"
              options={bloodTypes.map((type) => ({
                value: type,
                label: type,
              }))}
            />

            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
                Emergency Contact
              </h3>

              <div className="relative mb-4">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.emergencyContact.name}
                  onChange={(e) =>
                    handleEmergencyContactChange("name", e.target.value)
                  }
                  placeholder="Emergency Contact Name"
                  className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    state.errors.emergencyContactName
                      ? "border-red-300 focus:border-red-500"
                      : "border-green-300 focus:border-green-500"
                  }`}
                  disabled={state.submitting}
                />
                {state.errors.emergencyContactName ? (
                  <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
                )}
                {state.errors.emergencyContactName && (
                  <p className="text-red-500 text-sm mt-1">
                    Emergency contact name is required
                  </p>
                )}
              </div>

              <div className="relative mb-4">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.emergencyContact.phone}
                  onChange={(e) =>
                    handleEmergencyContactChange("phone", e.target.value)
                  }
                  placeholder="Emergency Contact Phone (11 digits)"
                  className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    state.errors.emergencyContactPhone
                      ? "border-red-300 focus:border-red-500"
                      : "border-green-300 focus:border-green-500"
                  }`}
                  disabled={state.submitting}
                />
                {state.errors.emergencyContactPhone ? (
                  <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
                )}
                {state.errors.emergencyContactPhone && (
                  <p className="text-red-500 text-sm mt-1">
                    Valid phone number is required
                  </p>
                )}
              </div>

              <div className="relative mb-4">
                <UserCheck className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={form.emergencyContact.relation}
                  onChange={(e) =>
                    handleEmergencyContactChange("relation", e.target.value)
                  }
                  className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    state.errors.emergencyContactRelation
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  }`}
                  disabled={state.submitting}
                >
                  <option value="">-- Select Relationship --</option>
                  {relationOptions.map((relation) => (
                    <option key={relation} value={relation}>
                      {relation}
                    </option>
                  ))}
                </select>
                {state.errors.emergencyContactRelation ? (
                  <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
                ) : form.emergencyContact.relation ? (
                  <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
                ) : null}
                {state.errors.emergencyContactRelation && (
                  <p className="text-red-500 text-sm mt-1">
                    Relationship is required
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Microscope className="w-5 h-5 mr-2 text-purple-600" />
                Medical Information
              </h3>

              <SelectField
                name="referDoctor"
                icon={User}
                placeholder="-- Select referring doctor (optional) --"
                options={state.doctors.map((doctor) => ({
                  value: doctor.fullName,
                  label: `Dr. ${doctor.fullName} - ${doctor.specialty}`,
                }))}
                onChange={(e) => {
                  const selected = state.doctors.find(
                    (d) => d.fullName === e.target.value
                  );
                  setForm((prev) => ({
                    ...prev,
                    referDoctor: e.target.value,
                    userId: selected?.userId || "",
                  }));
                  setState((prev) => ({
                    ...prev,
                    selectedDoctorInfo: selected,
                  }));
                }}
              />

              {state.selectedDoctorInfo && (
                <div className="text-sm text-gray-700 bg-blue-50 rounded p-3 border border-blue-200 mb-4">
                  <p>
                    <strong>Doctor:</strong> Dr.{" "}
                    {state.selectedDoctorInfo.fullName}
                  </p>
                  <p>
                    <strong>Specialty:</strong>{" "}
                    {state.selectedDoctorInfo.specialty}
                  </p>
                </div>
              )}

              <SelectField
                name="labTestName"
                icon={Microscope}
                placeholder="-- Select Lab Test --"
                options={state.examTypes.map((type) => ({
                  value: type.name,
                  label: type.name,
                }))}
                onChange={(e) => {
                  handleChange(e);
                  const found = state.examTypes.find(
                    (ex) => ex.name === e.target.value
                  );
                  setState((prev) => ({
                    ...prev,
                    selectedDescription: found ? found.description : "",
                  }));
                }}
              />

              {state.selectedDescription && (
                <div className="text-gray-600 text-sm mt-2 bg-gray-50 rounded p-2 border border-gray-200">
                  {state.selectedDescription}
                </div>
              )}

              <SelectField
                name="clinic"
                icon={User}
                placeholder="-- Select Clinic --"
                options={state.clinics.map((clinic) => {
                  console.log("Mapping clinic for dropdown:", clinic);
                  return {
                    value: clinic.name,
                    label: clinic.name,
                  };
                })}
                onChange={(e) => {
                  console.log("Clinic dropdown changed to:", e.target.value);
                  console.log("Available clinics:", state.clinics);

                  const selected = state.clinics.find(
                    (c) => c.name === e.target.value
                  );
                  console.log("Found selected clinic:", selected);

                  const clinicId =
                    selected?.id || selected?.clinicId || selected?.key || "";
                  console.log("Extracted clinic ID:", clinicId);

                  setForm((prev) => ({
                    ...prev,
                    clinic: e.target.value,
                    clinicId: clinicId,
                  }));
                  setState((prev) => ({
                    ...prev,
                    selectedClinicInfo: selected,
                    errors: {
                      ...prev.errors,
                      clinic: validateField("clinic", e.target.value),
                      clinicId: clinicId ? null : true,
                    },
                  }));
                }}
              />

              {state.selectedClinicInfo && (
                <div className="text-sm text-gray-700 bg-gray-50 rounded p-3 border border-gray-200 mb-4">
                  <p>
                    <strong>Address:</strong>{" "}
                    {state.selectedClinicInfo.addressLine ||
                      state.selectedClinicInfo.address ||
                      "Not provided"}
                  </p>
                  <p>
                    <strong>Type:</strong>{" "}
                    {state.selectedClinicInfo.type ||
                      state.selectedClinicInfo.clinicType ||
                      "Not specified"}
                  </p>
                </div>
              )}

              {/* Patient Complaint Fields */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Patient Complaints (optional)
                  </label>
                  <button
                    type="button"
                    onClick={addComplaintField}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                    disabled={state.submitting}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {form.patientComplaint.map((complaint, index) => (
                  <div key={index} className="relative mb-2">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={complaint}
                      onChange={(e) =>
                        handleComplaintChange(index, e.target.value)
                      }
                      placeholder={`Complaint ${index + 1}`}
                      className="w-full pl-10 pr-12 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                      disabled={state.submitting}
                    />
                    {form.patientComplaint.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComplaintField(index)}
                        className="absolute right-3 top-3 w-5 h-5 text-red-500 hover:text-red-700 transition-colors"
                        disabled={state.submitting}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Additional Notes (optional)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  disabled={state.submitting}
                  rows="3"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          ref={slotRef}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Select Time Slot
            </h2>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button
              disabled={state.currentPage === 0}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  currentPage: Math.max(0, prev.currentPage - 1),
                }))
              }
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-lg">
              <span className="font-semibold text-gray-700">
                Slots {state.currentPage * 50 + 1}–
                {(state.currentPage + 1) * 50}
              </span>
            </div>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  currentPage: prev.currentPage + 1,
                }))
              }
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3 justify-items-center mb-4">
            {renderSlots()}
          </div>

          <div className="flex justify-center space-x-6 text-sm">
            {[
              { color: "from-green-400 to-blue-500", label: "Available" },
              { color: "bg-red-400", label: "Booked" },
              { color: "from-blue-600 to-purple-600", label: "Selected" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded ${
                    color.includes("from") ? `bg-gradient-to-r ${color}` : color
                  }`}
                ></div>
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {state.errors.slotNumber && (
            <p className="text-red-500 text-sm mt-4 text-center p-3 bg-red-50 rounded-lg">
              Please select a time slot
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Microscope className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Booking Summary</h2>
          </div>

          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg">
              🧪
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                title: "Patient Details",
                content: (
                  <div className="space-y-2">
                    <p>
                      <strong>Name:</strong>{" "}
                      {form.patientName || "Not provided"}
                    </p>
                    <p>
                      <strong>Email:</strong> {form.email || "Not provided"}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {form.contactNumber || "Not provided"}
                    </p>
                    <p>
                      <strong>DOB:</strong> {form.dateOfBirth || "Not provided"}
                    </p>
                    <p>
                      <strong>Blood Type:</strong>{" "}
                      {form.bloodType || "Not provided"}
                    </p>
                  </div>
                ),
                isSpecial: true,
              },
              form.emergencyContact.name && {
                title: "Emergency Contact",
                content: (
                  <div className="space-y-1">
                    <p>
                      <strong>Name:</strong> {form.emergencyContact.name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {form.emergencyContact.phone}
                    </p>
                    <p>
                      <strong>Relation:</strong>{" "}
                      {form.emergencyContact.relation}
                    </p>
                  </div>
                ),
                isSpecial: true,
              },
              {
                title: "Lab Test Details",
                content: form.labTestName || "No test selected",
                extra: state.selectedDescription || "No description provided",
              },
              form.clinic && {
                title: "Clinic Information",
                content: (
                  <div className="space-y-1">
                    <p>
                      <strong>Clinic:</strong> {form.clinic}
                    </p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {state.selectedClinicInfo?.addressLine ||
                        state.selectedClinicInfo?.address ||
                        "Not provided"}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {state.selectedClinicInfo?.type ||
                        state.selectedClinicInfo?.clinicType ||
                        "Not specified"}
                    </p>
                  </div>
                ),
                isSpecial: true,
              },
              form.referDoctor && {
                title: "Referring Doctor",
                content: `Dr. ${form.referDoctor}`,
                extra: state.selectedDoctorInfo?.specialty,
              },
              form.patientComplaint.some(
                (complaint) => complaint.trim() !== ""
              ) && {
                title: "Patient Complaints",
                content: form.patientComplaint
                  .filter((complaint) => complaint.trim() !== "")
                  .map((complaint, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 bg-yellow-50 rounded p-2 mb-1 border border-yellow-200"
                    >
                      {index + 1}. {complaint}
                    </div>
                  )),
                isSpecial: true,
              },
              form.slotNumber && {
                title: "Time Slot",
                content: (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Slot #{form.slotNumber}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Estimated Time: {getEstimatedTime(form.slotNumber)}
                    </p>
                  </div>
                ),
                isSpecial: true,
              },
              form.notes && {
                title: "Additional Notes",
                content: form.notes,
                isSmall: true,
              },
            ]
              .filter(Boolean)
              .map((item, idx) => (
                <div
                  key={idx}
                  className={item.isSpecial ? "" : "bg-gray-50 rounded-lg p-4"}
                >
                  {!item.isSpecial && (
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {item.title}
                    </h3>
                  )}
                  {item.isSpecial ? (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {item.title}
                      </h3>
                      {item.content}
                    </div>
                  ) : (
                    <>
                      <p
                        className={`text-gray-600 ${
                          item.isSmall ? "text-sm" : ""
                        }`}
                      >
                        {item.content}
                      </p>
                      {item.extra && (
                        <p className="text-gray-500 text-sm">{item.extra}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center max-w-7xl mx-auto px-6 pb-10">
        <button
          onClick={handleSubmit}
          disabled={state.submitting || Object.keys(validate()).length > 0}
          className={`px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all transform ${
            state.submitting || Object.keys(validate()).length > 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 active:scale-95"
          }`}
        >
          {state.submitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Booking...</span>
            </div>
          ) : (
            "Confirm Lab Booking"
          )}
        </button>
      </div>
    </div>
  );
}

export default LaboratoryExams;
