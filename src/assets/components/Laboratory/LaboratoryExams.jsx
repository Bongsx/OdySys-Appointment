import React from "react";
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
import { useLabExam } from "./useLabExam";
import {
  BLOOD_TYPES,
  RELATION_OPTIONS,
  formatServiceFee,
} from "./labExamUtils";

const LaboratoryExams = () => {
  const navigate = useNavigate();
  const {
    form,
    state,
    timeSlots,
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
    getEstimatedTime,
  } = useLabExam();

  // Reusable input component
  const InputField = ({
    field,
    type = "text",
    placeholder = "",
    icon = null,
  }) => (
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
        className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
          state.errors[field]
            ? "border-red-300 focus:border-red-500"
            : "border-green-300 focus:border-green-500"
        }`}
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
        <p className="text-red-500 text-sm mt-1">{getErrorMessage(field)}</p>
      )}
    </div>
  );

  // Error message helper
  const getErrorMessage = (field) => {
    const messages = {
      patientName: "Patient name is required",
      email: "Valid email is required",
      contactNumber: "Valid contact number is required",
      dateOfBirth: "Date of birth is required",
      bloodType: "Blood type is required",
      labTestName: "Lab test is required",
      slotNumber: "Slot is required",
      clinic: "Clinic is required",
    };
    return messages[field] || `${field} is required`;
  };

  // Select field component
  const SelectField = ({
    name,
    options,
    placeholder,
    icon,
    onChange = handleChange,
  }) => (
    <div className="relative mb-4">
      {icon &&
        React.createElement(icon, {
          className: "absolute left-3 top-3 w-5 h-5 text-gray-400",
        })}
      <select
        name={name}
        value={form[name]}
        onChange={onChange}
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
        <p className="text-red-500 text-sm mt-1">{getErrorMessage(name)}</p>
      )}
    </div>
  );

  // Emergency contact component
  const EmergencyContactSection = () => (
    <div className="border-t pt-4 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
        Emergency Contact
      </h3>

      {["name", "phone", "relationship"].map((field) => {
        const fieldName = `emergencyContact${
          field.charAt(0).toUpperCase() + field.slice(1)
        }`;
        const isRelationship = field === "relationship";

        return (
          <div key={field} className="relative mb-4">
            {React.createElement(
              field === "phone"
                ? Phone
                : field === "relationship"
                ? UserCheck
                : User,
              {
                className: "absolute left-3 top-3 w-5 h-5 text-gray-400",
              }
            )}

            {isRelationship ? (
              <select
                value={form.emergencyContact[field]}
                onChange={(e) =>
                  handleEmergencyContactChange(field, e.target.value)
                }
                className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                  state.errors[fieldName]
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
                disabled={state.submitting}
              >
                <option value="">-- Select Relationship --</option>
                {RELATION_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.emergencyContact[field]}
                onChange={(e) =>
                  handleEmergencyContactChange(field, e.target.value)
                }
                placeholder={`Emergency Contact ${
                  field === "name" ? "Name" : "Phone (11 digits)"
                }`}
                className={`w-full pl-10 pr-10 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                  state.errors[fieldName]
                    ? "border-red-300 focus:border-red-500"
                    : "border-green-300 focus:border-green-500"
                }`}
                disabled={state.submitting}
              />
            )}

            {state.errors[fieldName] ? (
              <AlertCircle className="absolute right-3 top-3 w-5 h-5 text-red-500" />
            ) : form.emergencyContact[field] ? (
              <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-green-600" />
            ) : null}

            {state.errors[fieldName] && (
              <p className="text-red-500 text-sm mt-1">
                Emergency contact {field} is required
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  // Time slots component
  const TimeSlotsSection = () => {
    const slotsPerPage = 20;
    const start = state.currentPage * slotsPerPage;
    const end = start + slotsPerPage;
    const currentSlots = timeSlots.slice(start, end);
    const maxPages = Math.ceil(timeSlots.length / slotsPerPage);

    const renderSlots = () =>
      currentSlots.map((slot) => {
        const isBooked = state.bookedSlots.includes(slot.number.toString());
        const isSelected = form.slotNumber === slot.number.toString();

        return (
          <div
            key={slot.number}
            onClick={() => handleSlotSelect(slot.number)}
            className={`rounded-lg p-3 text-center cursor-pointer transition-all transform hover:scale-105 shadow-sm min-h-[80px] flex flex-col justify-center ${
              isBooked
                ? "bg-red-400 text-white cursor-not-allowed opacity-75"
                : isSelected
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                : "bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
            }`}
          >
            <div className="font-semibold text-sm">{slot.display}</div>
            <div className="text-xs mt-1 opacity-90">{slot.timeRange}</div>
          </div>
        );
      });

    return (
      <div
        ref={slotRef}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            Select Ticket Slot
          </h2>
        </div>

        {form.clinic && form.labTestName ? (
          <>
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
                  Page {state.currentPage + 1} of {maxPages}
                </span>
              </div>
              <button
                disabled={state.currentPage >= maxPages - 1}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage + 1,
                  }))
                }
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 justify-items-center mb-4">
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
                      color.includes("from")
                        ? `bg-gradient-to-r ${color}`
                        : color
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
          </>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              Please select a clinic and lab test first
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Time slots will be available after making your selections
            </p>
          </div>
        )}
      </div>
    );
  };

  // Patient complaints section
  const PatientComplaintsSection = () => (
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
            onChange={(e) => handleComplaintChange(index, e.target.value)}
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
  );

  // Booking summary component
  const BookingSummary = () => {
    const summaryItems = [
      {
        title: "Patient Details",
        content: (
          <div className="space-y-2">
            <p>
              <strong>Name:</strong> {form.patientName || "Not provided"}
            </p>
            <p>
              <strong>Email:</strong> {form.email || "Not provided"}
            </p>
            <p>
              <strong>Phone:</strong> {form.contactNumber || "Not provided"}
            </p>
            <p>
              <strong>DOB:</strong> {form.dateOfBirth || "Not provided"}
            </p>
            <p>
              <strong>Blood Type:</strong> {form.bloodType || "Not provided"}
            </p>
          </div>
        ),
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
              <strong>Relation:</strong> {form.emergencyContact.relationship}
            </p>
          </div>
        ),
      },
      {
        title: "Lab Test Details",
        content: (
          <div className="space-y-2">
            <p>
              <strong>Test:</strong> {form.labTestName || "No test selected"}
            </p>
            {state.selectedDescription && (
              <p className="text-sm text-gray-600">
                {state.selectedDescription}
              </p>
            )}
            {state.selectedServiceFee && (
              <div className="flex items-center space-x-2 bg-green-50 rounded-lg p-2 border border-green-200">
                <span className="text-sm font-semibold text-green-800">
                  Service Fee: ₱{formatServiceFee(state.selectedServiceFee)}
                </span>
              </div>
            )}
          </div>
        ),
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
      },
      form.referDoctor && {
        title: "Referring Doctor",
        content: `Dr. ${form.referDoctor}`,
        extra: state.selectedDoctorInfo?.specialty,
      },
      form.patientComplaint.some((complaint) => complaint.trim() !== "") && {
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
      },
      form.slotNumber && {
        title: "Time Slot",
        content: (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                {timeSlots.find((s) => s.number === parseInt(form.slotNumber))
                  ?.display || `Slot #${form.slotNumber}`}
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Time: {getEstimatedTime(form.slotNumber)}
            </p>
          </div>
        ),
      },
      form.notes && {
        title: "Additional Notes",
        content: form.notes,
      },
    ].filter(Boolean);

    return (
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {summaryItems.map((item, idx) => (
            <div key={idx}>
              <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
              <div className="text-gray-600">{item.content}</div>
              {item.extra && (
                <p className="text-gray-500 text-sm">{item.extra}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans relative">
      {/* Loading Overlay */}
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

      {/* Header */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
        {/* Medical Information Column */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Microscope className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Medical Information
            </h2>
          </div>

          <div className="space-y-4">
            <SelectField
              name="referDoctor"
              icon={User}
              placeholder="-- Select referring doctor (optional) --"
              options={state.doctors.map((doctor) => ({
                value: doctor.fullName,
                label: `Dr. ${doctor.fullName} - ${doctor.specialty}`,
              }))}
              onChange={handleDoctorChange}
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
            />

            {state.selectedDescription && (
              <div className="text-gray-600 text-sm mt-2 bg-gray-50 rounded p-2 border border-gray-200">
                {state.selectedDescription}
              </div>
            )}

            {state.selectedServiceFee && (
              <div className="flex items-center space-x-2 bg-green-50 rounded-lg p-3 border border-green-200">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Service Fee
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    ₱{formatServiceFee(state.selectedServiceFee)}
                  </p>
                </div>
              </div>
            )}

            <SelectField
              name="clinic"
              icon={User}
              placeholder="-- Select Clinic --"
              options={state.clinics.map((clinic) => ({
                value: clinic.name,
                label: clinic.name,
              }))}
              onChange={handleClinicChange}
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

            <PatientComplaintsSection />

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

        {/* Patient Information Column */}
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
            <InputField
              field="patientName"
              placeholder="Full Name"
              icon={User}
            />
            <InputField
              field="email"
              type="email"
              placeholder="Email Address"
              icon={Mail}
            />
            <InputField
              field="contactNumber"
              placeholder="Contact Number (11 digits)"
              icon={Phone}
            />
            <InputField
              field="dateOfBirth"
              type="date"
              placeholder="Date of Birth"
              icon={Calendar}
            />

            <SelectField
              name="bloodType"
              icon={Droplet}
              placeholder="-- Select Blood Type --"
              options={BLOOD_TYPES.map((type) => ({
                value: type,
                label: type,
              }))}
            />

            <EmergencyContactSection />
          </div>
        </div>

        {/* Time Slots Column */}
        <TimeSlotsSection />
      </div>

      {/* Booking Summary */}
      <div className="max-w-7xl mx-auto px-8 pb-8">
        <BookingSummary />
      </div>

      {/* Submit Button */}
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
};

export default LaboratoryExams;
