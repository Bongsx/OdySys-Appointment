// utils/labExamUtils.js
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const RELATION_OPTIONS = [
  "Spouse/Partner",
  "Parent",
  "Child",
  "sibling",
  "Grandparent",
  "Grandchild",
  "Friend",
  "Guardian",
  "Caregiver",
  "Colleague",
  "Neighbor",
  "Other",
];

export const getCurrentDateTime = () => {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-CA"),
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export const generateTimeSlots = () => {
  const slots = [];
  const startHour = 8;
  const endHour = 18;

  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = hour <= 12 ? `${hour}:00AM` : `${hour - 12}:00PM`;
    const endTime =
      hour + 1 <= 12 ? `${hour + 1}:00AM` : `${hour + 1 - 12}:00PM`;

    const displayStartTime = hour === 12 ? "12:00PM" : startTime;
    const displayEndTime = hour + 1 === 12 ? "12:00PM" : endTime;

    for (let slot = 1; slot <= 10; slot++) {
      const slotNumber = (hour - startHour) * 10 + slot;
      slots.push({
        number: slotNumber,
        display: `Slot ${slotNumber}`,
        timeRange: `${displayStartTime} - ${displayEndTime}`,
        fullDisplay: `Slot ${slotNumber} (${displayStartTime} - ${displayEndTime})`,
      });
    }
  }
  return slots;
};

export const validateField = (name, value) => {
  console.log(`Validating field: ${name}, value: "${value}"`); // Debug log

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
    "emergencyContactRelationship",
  ];

  if (required.includes(name)) {
    // Check if value exists and is not empty
    if (!value || (typeof value === "string" && !value.trim())) {
      console.log(`Field ${name} failed - empty value`); // Debug log
      return true; // Error
    }

    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(value.trim());
      console.log(`Email validation for "${value}": ${isValid}`); // Debug log
      return isValid ? null : true;
    }

    if (name === "contactNumber" || name === "emergencyContactPhone") {
      const phoneRegex = /^\d{11}$/;
      const isValid = phoneRegex.test(value.trim());
      console.log(`Phone validation for "${value}": ${isValid}`); // Debug log
      return isValid ? null : true;
    }

    console.log(`Field ${name} passed validation`); // Debug log
    return null; // No error
  }

  if (name === "slotNumber") {
    return value ? null : true;
  }

  return null;
};

export const getInitialFormState = (userData, userId) => {
  // More robust name extraction
  const fullName =
    userData?.fullName ||
    (userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : "") ||
    userData?.name ||
    "";
  const email = userData?.email || userData?.emailAddress || "";

  return {
    labTestName: "",
    labTestId: "",
    patientName: fullName,
    email: email,
    contactNumber:
      userData?.contactNumber || userData?.phoneNumber || userData?.phone || "",
    dateOfBirth: userData?.dateOfBirth || userData?.birthDate || "",
    bloodType: userData?.bloodType || "",
    referDoctor: "",
    userId: userId || "",
    slotNumber: "",
    notes: "",
    clinic: "",
    clinicId: "",
    addressLine: "",
    type: "",
    emergencyContact: userData?.emergencyContact || {
      name: "",
      phone: "",
      relationship: "",
    },
    patientComplaint: [""],
    createdAt: getCurrentDateTime(),
  };
};

export const getInitialErrorState = (userData) => {
  // More robust data extraction for validation
  const fullName =
    userData?.fullName ||
    (userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : "") ||
    userData?.name ||
    "";
  const email = userData?.email || userData?.emailAddress || "";
  const contactNumber =
    userData?.contactNumber || userData?.phoneNumber || userData?.phone || "";
  const dateOfBirth = userData?.dateOfBirth || userData?.birthDate || "";
  const bloodType = userData?.bloodType || "";
  const emergencyContact = userData?.emergencyContact || {};

  return {
    patientName: validateField("patientName", fullName),
    email: validateField("email", email),
    contactNumber: validateField("contactNumber", contactNumber),
    dateOfBirth: validateField("dateOfBirth", dateOfBirth),
    bloodType: validateField("bloodType", bloodType),
    labTestName: true,
    slotNumber: true,
    clinic: true,
    clinicId: true,
    emergencyContactName: validateField(
      "emergencyContactName",
      emergencyContact.name || ""
    ),
    emergencyContactPhone: validateField(
      "emergencyContactPhone",
      emergencyContact.phone || ""
    ),
    emergencyContactRelationship: validateField(
      "emergencyContactRelationship",
      emergencyContact.relationship || ""
    ),
  };
};

export const formatServiceFee = (fee) => {
  if (!fee) return null;
  return typeof fee === "number" ? fee.toLocaleString() : fee;
};

export const getEstimatedTime = (slotNumber, timeSlots, appointments) => {
  const slot = timeSlots.find((s) => s.number === parseInt(slotNumber));
  if (slot) return slot.timeRange;

  // Fallback calculation
  const sorted = appointments
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
