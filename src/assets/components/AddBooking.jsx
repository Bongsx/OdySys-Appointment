import { useState, useEffect } from "react";
import { ref, push, set, onValue } from "firebase/database";
import { database } from "../firebase/firebase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseISO, isSameDay } from "date-fns";
import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function AddBooking({ isOpen, toggleModal }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+63");
  const [address, setAddress] = useState("");
  const [complaints, setComplaints] = useState([""]);
  const [doctor, setDoctor] = useState("");
  const [status, setStatus] = useState("Pending");
  const [doctorList, setDoctorList] = useState([]);
  const [date, setDate] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const doctorRef = ref(database, "Appointments/Doctors");
    return onValue(doctorRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data).map((d) => d.Name) : [];
      setDoctorList(list);
    });
  }, []);

  useEffect(() => {
    const bookingRef = ref(database, "Appointments/Patients");
    return onValue(bookingRef, (snapshot) => {
      const data = snapshot.val();
      const dates = data
        ? Object.values(data)
            .map((b) => b.date)
            .filter(Boolean)
            .map((d) => parseISO(d))
        : [];
      setBookedDates(dates);
    });
  }, []);

  const handleComplaintChange = (index, value) => {
    const updated = [...complaints];
    updated[index] = value;
    setComplaints(updated);
  };

  const addComplaintField = () => {
    setComplaints([...complaints, ""]);
  };

  const removeComplaintField = (index) => {
    if (complaints.length > 1) {
      const updated = complaints.filter((_, i) => i !== index);
      setComplaints(updated);
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = true;
    if (!phone || phone.length !== 13) errs.phone = true;
    if (!address.trim()) errs.address = true;
    if (!complaints.filter((c) => c.trim()).length) errs.complaints = true;
    if (!date) errs.date = true;
    if (!doctor.trim()) errs.doctor = true;
    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    const newBookingRef = push(ref(database, "Appointments/Patients"));
    const bookingId = newBookingRef.key;

    const payload = {
      id: bookingId,
      patient: {
        name: name.trim(),
        phone,
        address: address.trim(),
        complaints: complaints.filter((c) => c.trim()),
      },
      date: date.toISOString().split("T")[0],
      doctor: doctor.trim(),
      status,
    };

    try {
      await set(newBookingRef, payload);

      if (doctor && !doctorList.includes(doctor)) {
        const newDoctorRef = push(ref(database, "Appointments/Doctors"));
        await set(newDoctorRef, { Name: doctor });
      }

      resetForm();
      toggleModal();
    } catch (error) {
      console.error("Error saving booking:", error);
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setName("");
    setPhone("+63");
    setAddress("");
    setComplaints([""]);
    setDate(null);
    setDoctor("");
    setStatus("Pending");
    setErrors({});
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (val.startsWith("+63"))
      val = "+63" + val.substring(3).replace(/\D/g, "");
    if (val.length > 13) val = val.slice(0, 13);
    if (val.length >= 3) setPhone(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 relative">
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            onClick={toggleModal}
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <CalendarDaysIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add New Booking</h2>
              <p className="text-blue-100 text-sm">
                Schedule a new patient appointment
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Patient Information Section */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-blue-600" />
                Patient Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.name
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      placeholder="Enter patient's full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Name is required
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.phone
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      value={phone}
                      onChange={handlePhoneChange}
                      disabled={submitting}
                      placeholder="+63XXXXXXXXXX"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Valid phone number required
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.address
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={submitting}
                      placeholder="Enter patient's address"
                    />
                  </div>
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Address is required
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Complaints Section */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
                Medical Complaints *
              </h3>

              <div className="space-y-3">
                {complaints.map((complaint, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          errors.complaints && !complaint.trim()
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                        value={complaint}
                        onChange={(e) =>
                          handleComplaintChange(index, e.target.value)
                        }
                        disabled={submitting}
                        placeholder={`Complaint ${index + 1}`}
                      />
                    </div>
                    {complaints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComplaintField(index)}
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors duration-200"
                        disabled={submitting}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addComplaintField}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-xl hover:bg-blue-50 transition-colors duration-200"
                  disabled={submitting}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add another complaint
                </button>

                {errors.complaints && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    At least one complaint is required
                  </p>
                )}
              </div>
            </div>

            {/* Appointment Details Section */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                Appointment Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Appointment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date *
                  </label>
                  <DatePicker
                    selected={date}
                    onChange={(d) => setDate(d)}
                    dayClassName={(d) =>
                      bookedDates.some((bd) => isSameDay(bd, d))
                        ? "bg-red-200 text-red-700 hover:bg-red-300"
                        : "hover:bg-blue-100"
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.date
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholderText="Select appointment date"
                    disabled={submitting}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    minDate={new Date()}
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Date is required
                    </p>
                  )}
                </div>

                {/* Doctor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Doctor *
                  </label>
                  <div className="relative">
                    <UserCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      list="doctors"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.doctor
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                      placeholder="Select or type doctor name"
                      disabled={submitting}
                    />
                    <datalist id="doctors">
                      {doctorList.map((doc, idx) => (
                        <option key={idx} value={doc} />
                      ))}
                    </datalist>
                  </div>
                  {errors.doctor && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Doctor is required
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Status
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Create Booking
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleModal}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow hover:shadow-lg"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddBooking;
