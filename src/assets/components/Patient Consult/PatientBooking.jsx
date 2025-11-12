import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Mail,
  FileText,
  ArrowLeft,
  Plus,
  Stethoscope,
} from "lucide-react";
import SuccessModal from "./SuccessModal";

import { usePatientBooking } from "./usePatientBooking";
import {
  getInputStyle,
  isFieldValid,
  generateDoctorAvatar,
  serviceFeeOptions,
  isToday,
} from "./bookingUtils";

function PatientBooking() {
  const navigate = useNavigate();
  const {
    // State
    form,
    doctorList,
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
    bookedDatesForDoctor,
    bookedTimes,
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
  } = usePatientBooking();

  // Loading states
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

  // Calendar calculations
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

  const slots = getDoctorSlots();
  const iconStyle = "absolute right-3 top-3 w-5 h-5";

  // Helper function to render input fields
  const renderInput = (
    field,
    type = "text",
    placeholder = "",
    icon = null,
    label = ""
  ) => {
    const hasError = errors[field];
    const isTouched = touched[field];
    const isValid = isFieldValid(field, form);
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
            value={form[field]}
            onChange={handleChange}
            onBlur={() => setTouched((prev) => ({ ...prev, [field]: true }))}
            placeholder={placeholder}
            className={getInputStyle(field, errors, touched, form)}
            disabled={submitting}
            required
          />
          {showGreenCheck ? (
            <CheckCircle className={`${iconStyle} text-green-600`} />
          ) : (
            hasError && <AlertCircle className={`${iconStyle} text-red-500`} />
          )}
        </div>
      </div>
    );
  };

  // Doctor avatar rendering
  const renderDoctorAvatar = () => {
    const avatarData = generateDoctorAvatar(form.doctor);
    if (!avatarData) {
      return (
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto shadow-md" />
      );
    }

    return (
      <div
        className={`w-20 h-20 rounded-full ${avatarData.colorClass} text-white flex items-center justify-center mx-auto text-xl font-bold shadow-lg`}
      >
        {avatarData.initials}
      </div>
    );
  };

  const handleFormSubmit = async () => {
    const success = await handleSubmit();
    if (success) {
      // ✅ Show modal instead of navigating immediately
      setSuccessModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 font-sans relative">
      {/* Loading overlay */}
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

      {/* Header */}
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
        {/* Patient Information Panel */}
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="font-medium text-gray-700">
                    Chief Complaints *
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
                    required
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                name="additionalNotes"
                value={form.additionalNotes}
                onChange={handleChange}
                placeholder="Any additional information..."
                rows="3"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 transition-colors focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Date & Time Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Select Date & Time
            </h2>
          </div>

          {/* Calendar Navigation */}
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

          {/* Calendar Grid */}
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
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dayDate = new Date(currentYear, baseDate.getMonth(), day);
              const isPastDay =
                dayDate < new Date().setHours(0, 0, 0, 0) &&
                !isToday(currentYear, baseDate.getMonth(), day);
              const isSelected = selectedDay === day;

              const isDoctorAvailable = form.doctor
                ? checkDoctorAvailability(currentYear, baseDate.getMonth(), day)
                : true;

              const isFullyBooked = form.doctor
                ? checkDateFullyBooked(currentYear, baseDate.getMonth(), day)
                : false;

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
                cellClass += " bg-gray-100 text-gray-400 cursor-not-allowed";
              } else if (isSelected) {
                cellClass += " bg-teal-600 text-white shadow-lg";
              } else if (!form.doctor) {
                cellClass += " bg-gray-50 text-gray-700 hover:bg-gray-100";
              } else if (!isDoctorAvailable) {
                cellClass += " bg-gray-200 text-gray-500 cursor-not-allowed";
              } else if (isFullyBooked) {
                cellClass += " bg-red-200 text-red-700 cursor-not-allowed";
              } else if (hasPartialBookings) {
                cellClass +=
                  " bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
              } else {
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
                  onClick={() =>
                    canSelect && selectDate(day, currentYear, baseDate)
                  }
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
            })}
          </div>

          {/* Calendar Legend */}
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

          {/* Time Selection */}
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
                    required
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
                        onClick={() =>
                          !bookedTimes.includes(slot) &&
                          handleTimeSlotClick(slot)
                        }
                        className={`px-2 py-2 rounded-lg text-center font-medium transition-all cursor-pointer ${
                          bookedTimes.includes(slot)
                            ? "bg-red-100 text-red-600 cursor-not-allowed opacity-50"
                            : form.appointmentTime === slot
                            ? "bg-teal-600 text-white shadow-md"
                            : "bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-sm"
                        }`}
                        title={
                          bookedTimes.includes(slot)
                            ? "This time slot is already booked"
                            : "Click to select this time slot"
                        }
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

        {/* Doctor Selection Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-6 self-start">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Choose Doctor</h2>
          </div>

          <select
            value={form.doctor}
            onChange={handleDoctorChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none text-center mb-6 transition-colors ${
              errors.doctor
                ? "border-red-300 focus:border-red-500"
                : "border-gray-300 focus:border-purple-500"
            }`}
            required
          >
            <option value="">-- Select Doctor --</option>
            {doctorList
              .filter((d) => d.specialty === "Generalist")
              .map((d, i) => (
                <option key={i} value={d.fullName}>
                  {d.fullName}
                </option>
              ))}
          </select>

          {form.doctor && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center w-full">
              {renderDoctorAvatar()}
              <h3 className="font-semibold text-lg mt-4 text-gray-800">
                {form.doctor}
              </h3>
              {selectedDoctor?.specialty && (
                <p className="text-sm text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full mt-2">
                  {selectedDoctor.specialty}
                </p>
              )}
            </div>
          )}

          {/* Clinic and Service Selection */}
          {selectedDoctor?.clinicAffiliations && (
            <div className="mt-6 w-full">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Clinic: *
              </label>
              <select
                value={form.clinicName}
                onChange={handleClinicChange}
                className={`w-full p-3 rounded-lg border-2 focus:outline-none mb-4 transition-colors ${
                  errors.clinicName
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                required
              >
                <option value="">-- Select Clinic --</option>
                {getAvailableClinics().map((clinic, idx) => (
                  <option key={idx} value={clinic.name}>
                    {clinic.name}
                    {clinic.address && ` - ${clinic.address}`}
                  </option>
                ))}
              </select>

              {/* Consultation Type 
              <div className="flex items-center space-x-2 mb-3">
                <Stethoscope className="w-5 h-5 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">
                  Consultation Type: *
                </label>
              </div>
              <input
                value={form.type}
                onChange={handleChange}
                name="type"
                className={`w-full p-3 rounded-lg border-2 focus:outline-none mb-4 transition-colors bg-gray-50 ${
                  errors.type
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                placeholder={
                  form.serviceFee.name
                    ? "Auto-populated based on service fee"
                    : "Select a service fee first"
                }
                readOnly
                required
              />
              {!form.serviceFee.name && (
                <p className="text-xs text-gray-500 -mt-3 mb-4">
                  💡 This field will be automatically filled when you select a
                  service fee below
                </p>
              )} */}

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
                required
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
                      <span className="text-blue-600 text-sm font-bold">₱</span>
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
                          {selectedDoctor.professionalFees.consultationFee?.toLocaleString() ||
                            "N/A"}
                        </span>
                      </div>
                    )}

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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center max-w-7xl mx-auto px-6 pb-10">
        <button
          onClick={handleFormSubmit}
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

      {/* ✅ Success modal */}
      <SuccessModal
        isOpen={successModal}
        onClose={() => {
          setSuccessModal(false);
          navigate("/"); // ✅ Navigate only after closing modal
        }}
      />
    </div>
  );
}

export default PatientBooking;
