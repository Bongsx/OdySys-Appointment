// Validation helper functions
export const isFieldEmpty = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim()).length === 0;
  }
  if (typeof value === "object" && value !== null) {
    if (value.name !== undefined && value.fee !== undefined) {
      return !value.name || !value.fee;
    }
  }
  return !value || value.toString().trim() === "";
};

export const validatePhone = (phone) => {
  return phone && phone.length === 11 && phone.startsWith("09");
};

export const isFieldValid = (field, form) => {
  const value = form[field];
  return !isFieldEmpty(value);
};

// Form validation
export const validateForm = (form, requiredFields, manualConflict) => {
  const newErrors = {};

  requiredFields.forEach((field) => {
    if (isFieldEmpty(form[field])) {
      newErrors[field] = true;
    }
  });

  if (isFieldEmpty(form.serviceFee)) {
    newErrors.serviceFee = true;
  }

  if (isFieldEmpty(form.patientComplaint)) {
    newErrors.patientComplaint = true;
  }

  if (manualConflict) {
    newErrors.appointmentTime = true;
  }

  return newErrors;
};

// Time conversion and slot generation utilities
export const convertTo24Hour = (time12) => {
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

export const generateTimeSlotsFromData = (timeSlotData) => {
  const timeSlots = [];

  timeSlotData.forEach((slot) => {
    const startTime = slot.startTime;
    const endTime = slot.endTime;

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    for (
      let totalMinutes = startTotalMinutes;
      totalMinutes < endTotalMinutes;
      totalMinutes += 20
    ) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

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

  const uniqueSlots = [...new Set(timeSlots)];
  return uniqueSlots.sort((a, b) => {
    const timeA = convertTo24Hour(a);
    const timeB = convertTo24Hour(b);
    return timeA.localeCompare(timeB);
  });
};

// Doctor availability utilities
export const getDoctorSlotsForDate = (
  dateString,
  doctor,
  doctorSpecificDates,
  doctorAvailability
) => {
  if (!doctor) return [];

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

  const specificDates = doctorSpecificDates[doctor];
  if (specificDates && specificDates[dateString]) {
    const specificDateData = specificDates[dateString];
    if (specificDateData.timeSlots && specificDateData.timeSlots.length > 0) {
      return generateTimeSlotsFromData(specificDateData.timeSlots);
    }
  }

  const doctorSchedule = doctorAvailability[doctor];
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

export const isDoctorAvailableOnDate = (
  year,
  month,
  day,
  doctor,
  doctorSpecificDates,
  doctorAvailability
) => {
  if (!doctor) return false;

  const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;

  const specificDates = doctorSpecificDates[doctor];
  if (specificDates && specificDates[dateString]) {
    const specificDateData = specificDates[dateString];
    return specificDateData.timeSlots && specificDateData.timeSlots.length > 0;
  }

  if (!doctorAvailability[doctor]) return false;

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

  const doctorSchedule = doctorAvailability[doctor];
  const daySchedule = doctorSchedule[dayName];

  return daySchedule && daySchedule.enabled;
};

export const isDateFullyBookedForDoctor = (
  year,
  month,
  day,
  doctor,
  bookedDatesForDoctor,
  doctorSpecificDates,
  doctorAvailability
) => {
  if (!doctor) return false;

  const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;

  const allAvailableSlots = getDoctorSlotsForDate(
    dateString,
    doctor,
    doctorSpecificDates,
    doctorAvailability
  );

  if (allAvailableSlots.length === 0) {
    return true;
  }

  const bookedSlotsForDate = bookedDatesForDoctor
    .filter(
      (appointment) =>
        appointment.year === year &&
        appointment.month === month + 1 &&
        appointment.day === day
    )
    .map((appointment) => appointment.time);

  return allAvailableSlots.every((slot) => bookedSlotsForDate.includes(slot));
};

// Date utilities
export const isToday = (year, month, day) => {
  const d = new Date(year, month, day);
  return d.toDateString() === new Date().toDateString();
};

// Avatar generation utility
export const generateDoctorAvatar = (doctorName) => {
  const name = doctorName.trim();
  if (!name) return null;

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

  return {
    initials,
    colorClass: colors[colorIndex],
  };
};

// Input styling utility
export const getInputStyle = (field, errors, touched, form) => {
  const hasError = errors[field];
  const isTouched = touched[field];
  const isValid = isFieldValid(field, form);

  if (hasError) {
    return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 transition-colors focus:outline-none";
  } else if (isTouched && isValid) {
    return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 transition-colors focus:outline-none";
  } else {
    return "w-full pl-10 pr-10 py-3 rounded-lg border-2 border-red-300 focus:border-red-400 transition-colors focus:outline-none";
  }
};

// Service fee options
export const serviceFeeOptions = [
  { name: "General Consultation", fee: "" },
  { name: "Follow-up Consultation", fee: "" },
];

// Required fields
export const requiredFields = [
  "appointmentDate",
  "appointmentTime",
  "clinicName",
  "clinicId",
];
