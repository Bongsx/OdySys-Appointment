// hooks/useLabExam.js
import { useState, useEffect, useRef } from "react";
import { ref, push, set, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { database, auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import {
  validateField,
  getInitialFormState,
  getInitialErrorState,
  generateTimeSlots,
  getEstimatedTime,
} from "./labExamUtils";

export const useLabExam = () => {
  const navigate = useNavigate();
  const slotRef = useRef(null);
  const newRef = push(ref(database, "clinicLabRequests"));

  // Generate timeSlots at the beginning
  const timeSlots = generateTimeSlots();

  const [form, setForm] = useState(getInitialFormState());
  const [state, setState] = useState({
    examTypes: [],
    selectedDescription: "",
    selectedServiceFee: null,
    clinics: [],
    selectedClinicInfo: null,
    doctors: [],
    selectedDoctorInfo: null,
    bookedSlots: [],
    appointments: [],
    submitting: false,
    loading: false,
    currentPage: 0,
    currentUser: null,
    errors: getInitialErrorState(),
  });

  const refreshUserData = () => {
    const user = auth.currentUser;
    if (user) {
      console.log("Manually refreshing user data for:", user.uid);
      const userRef = ref(database, `patients/${user.uid}`);
      onValue(
        userRef,
        (snapshot) => {
          const userData = snapshot.val();
          console.log("Manual refresh - user data:", userData);

          if (userData || user.email) {
            const formData = {
              ...getInitialFormState(userData, user.uid),
              email:
                userData?.email || userData?.emailAddress || user.email || "",
            };
            console.log("Manual refresh - setting form:", formData);

            setForm(formData);

            const errorState = getInitialErrorState({
              ...userData,
              email: formData.email,
            });
            console.log("Manual refresh - setting errors:", errorState);

            setState((prev) => ({
              ...prev,
              currentUser: userData,
              errors: errorState,
            }));
          }
        },
        { onlyOnce: true }
      ); // Only get data once
    }
  };

  // Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth user:", user); // Debug log

        const userRef = ref(database, `patients/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          console.log("Raw user data from Firebase:", userData); // Debug log
          console.log("Auth user email:", user.email); // Debug log

          if (userData) {
            setState((prev) => ({ ...prev, currentUser: userData }));

            // Create form state with user data, fallback to auth email
            const formData = {
              ...getInitialFormState(userData, user.uid),
              email:
                userData?.email || userData?.emailAddress || user.email || "", // Add auth fallback
            };
            console.log("Final form state being set:", formData); // Debug log

            setForm(formData);

            // Wait a bit then set validation errors
            setTimeout(() => {
              const errorState = getInitialErrorState({
                ...userData,
                email: formData.email, // Use the actual email we're setting
              });
              console.log("Setting error state:", errorState); // Debug log

              setState((prev) => ({
                ...prev,
                errors: errorState,
              }));
            }, 100); // Small delay to ensure form is updated first
          } else {
            // If no userData in database, still set form with auth info
            console.log("No user data in database, using auth info only");
            const basicFormData = {
              ...getInitialFormState({}, user.uid),
              email: user.email || "",
            };
            setForm(basicFormData);

            setTimeout(() => {
              setState((prev) => ({
                ...prev,
                errors: getInitialErrorState({ email: user.email }),
              }));
            }, 100);
          }
        });
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Data fetching
  useEffect(() => {
    // Fetch exam types
    ["laboratoryTests", "imagingTests"].forEach((service) => {
      onValue(ref(database, `medicalServices/${service}`), (snap) => {
        const data = snap.val();
        if (data) {
          const items = Object.entries(data).map(([key, e]) => ({
            id: key,
            name: e.name,
            description: e.description,
            serviceFee: e.serviceFee || e.fee || e.price || null,
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

    // Fetch clinics
    onValue(ref(database, "clinics"), (snap) => {
      const data = snap.val();
      if (data) {
        const clinicsWithKeys = Object.entries(data).map(([key, value]) => ({
          ...value,
          id: key,
          clinicId: key,
        }));
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
    onValue(ref(database, "clinicLabRequests"), (snap) => {
      const data = snap.val();
      if (data) {
        const all = Object.values(data);
        const todaysAppointments = all.filter(
          (a) =>
            a.createdAt?.date === form.createdAt.date &&
            a.labTestName === form.labTestName &&
            a.clinic === form.clinic
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
  }, [form.createdAt.date, form.labTestName, form.clinic]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Phone number validation
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
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [name]: err },
    }));

    // Handle lab test selection
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
        selectedDescription: selectedTest?.description || "",
        selectedServiceFee: selectedTest?.serviceFee || null,
        errors: { ...prev.errors, slotNumber: true },
      }));
      setTimeout(
        () => slotRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    }
  };

  const handleEmergencyContactChange = (field, value) => {
    const fieldName = `emergencyContact${
      field.charAt(0).toUpperCase() + field.slice(1)
    }`;

    if (field === "phone") {
      const numbersOnly = value.replace(/\D/g, "");
      if (numbersOnly.length <= 11) {
        const err = validateField(fieldName, numbersOnly);
        setForm((prev) => ({
          ...prev,
          emergencyContact: { ...prev.emergencyContact, [field]: numbersOnly },
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
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: err },
    }));
  };

  // Handle updating a specific complaint field
  const handleComplaintChange = (index, value) => {
    setForm((prev) => {
      const newComplaints = [...(prev.patientComplaint || [])];
      newComplaints[index] = value;
      return { ...prev, patientComplaint: newComplaints };
    });
  };

  const addComplaintField = () => {
    setForm((prev) => ({
      ...prev,
      patientComplaint: [...(prev.patientComplaint || []), ""],
    }));
  };

  const removeComplaintField = (index) => {
    setForm((prev) => {
      if ((prev.patientComplaint?.length || 0) > 1) {
        const newComplaints = prev.patientComplaint.filter(
          (_, i) => i !== index
        );
        return { ...prev, patientComplaint: newComplaints };
      }
      return prev;
    });
  };

  const handleClinicChange = (e) => {
    const selected = state.clinics.find((c) => c.name === e.target.value);
    const clinicId = selected?.id || selected?.clinicId || selected?.key || "";

    setForm((prev) => ({
      ...prev,
      clinic: e.target.value,
      clinicId: clinicId,
      slotNumber: "",
    }));
    setState((prev) => ({
      ...prev,
      selectedClinicInfo: selected,
      currentPage: 0,
      errors: {
        ...prev.errors,
        clinic: validateField("clinic", e.target.value),
        clinicId: clinicId ? null : true,
        slotNumber: true,
      },
    }));
  };

  const handleDoctorChange = (e) => {
    const selected = state.doctors.find((d) => d.fullName === e.target.value);
    setForm((prev) => ({
      ...prev,
      referDoctor: e.target.value,
      userId: selected?.userId || "",
    }));
    setState((prev) => ({ ...prev, selectedDoctorInfo: selected }));
  };

  const handleSlotSelect = (slotNumber) => {
    if (!state.bookedSlots.includes(slotNumber.toString())) {
      setForm((prev) => ({ ...prev, slotNumber: slotNumber.toString() }));
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, slotNumber: null },
      }));
    }
  };

  const validate = () => {
    const errs = {};

    Object.entries(form).forEach(([name, value]) => {
      if (name !== "patientComplaint" && name !== "emergencyContact") {
        const err = validateField(name, value);
        if (err) errs[name] = true;
      }
    });

    ["name", "phone", "relationship"].forEach((field) => {
      const fieldName = `emergencyContact${
        field.charAt(0).toUpperCase() + field.slice(1)
      }`;
      const err = validateField(fieldName, form.emergencyContact[field]);
      if (err) errs[fieldName] = true;
    });

    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setState((prev) => ({ ...prev, errors: validationErrors }));
    if (Object.keys(validationErrors).length > 0) return;

    setState((prev) => ({ ...prev, submitting: true, loading: true }));

    try {
      const estimatedTime = getEstimatedTime(
        form.slotNumber,
        timeSlots,
        state.appointments
      );
      const description =
        state.selectedDescription || "No description provided";
      const nameParts = form.patientName.trim().split(" ");
      const firstName =
        nameParts.length === 1
          ? nameParts[0]
          : nameParts.slice(0, -1).join(" ");
      const lastName =
        nameParts.length === 1 ? "" : nameParts[nameParts.length - 1];

      const dataToPush = {
        ...form,
        estimatedTime,
        description,
        firstName,
        lastName,
        status: "Pending",
        addressLine: state.selectedClinicInfo?.addressLine || "",
        type: state.selectedClinicInfo?.type || "",
        clinicId: state.selectedClinicInfo?.id || "",
        serviceFee: state.selectedServiceFee,
        patientComplaint: form.patientComplaint.filter(
          (complaint) => complaint.trim() !== ""
        ),
      };

      await set(ref(database, `clinicLabRequests/${newRef.key}`), dataToPush);

      // Send confirmation email
      await fetch("http://localhost:5000/api/send-lab-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedTime,
          addressLine: state.selectedClinicInfo?.addressLine || "",
          serviceFee: state.selectedServiceFee,
          patientComplaint: form.patientComplaint.filter(
            (complaint) => complaint.trim() !== ""
          ),
        }),
      });

      alert("✅ Booking saved successfully!");

      // Reset form
      const userData = state.currentUser;
      setForm(getInitialFormState(userData, form.userId));
      setState((prev) => ({
        ...prev,
        selectedServiceFee: null,
        errors: getInitialErrorState(userData),
        selectedDoctorInfo: null,
        selectedClinicInfo: null,
      }));

      navigate("/");
    } catch (error) {
      alert("❌ " + error.message);
    }

    setState((prev) => ({ ...prev, submitting: false, loading: false }));
  };

  return {
    form,
    state,
    timeSlots, // Now properly defined and returned
    slotRef,
    handleChange,
    handleEmergencyContactChange,
    handleComplaintChange,
    addComplaintField,
    removeComplaintField,
    handleClinicChange,
    handleDoctorChange,
    handleSlotSelect,
    handleSubmit,
    validate,
    setState,
    refreshUserData,
    getEstimatedTime: (slotNumber) =>
      getEstimatedTime(slotNumber, timeSlots, state.appointments),
  };
};
