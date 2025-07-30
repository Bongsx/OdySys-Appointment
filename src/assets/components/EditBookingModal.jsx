import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseISO, isSameDay } from "date-fns";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebase";

function EditBookingModal({ isOpen, toggleModal, currentBooking, handleUpdate }) {
const [formData, setFormData] = useState({
  name: "",
  phone: "+63",
  address: "",
  complaints: [""],
  doctor: "",
  date: "",
  status: "Pending"
});

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    if (currentBooking) {
      const { patient, doctor, date } = currentBooking;
      setFormData({
        name: patient?.name || "",
        phone: patient?.phone || "+63",
        address: patient?.address || "",
        complaints: patient?.complaints || [""],
        doctor: doctor || "",
        date: date ? parseISO(date) : null,
        status: currentBooking.status || "Pending"
      });
    }
  }, [currentBooking]);

  useEffect(() => {
    const bookingRef = ref(database, "Clinic1/Appointments/booking/patients");
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComplaintChange = (index, value) => {
    const updated = [...formData.complaints];
    updated[index] = value;
    setFormData(prev => ({ ...prev, complaints: updated }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name) errs.name = true;
    if (!formData.phone || formData.phone.length !== 13) errs.phone = true;
    if (!formData.address) errs.address = true;
    if (!formData.complaints.filter(Boolean).length) errs.complaints = true;
    if (!formData.date) errs.date = true;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    handleUpdate({
      patient: {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        complaints: formData.complaints,
      },
      doctor: formData.doctor,
      date: formData.date.toISOString().split("T")[0],
      status: formData.status
    });
    setSubmitting(false);
  };

  if (!isOpen || !currentBooking) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-full overflow-y-auto relative">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-6 text-center">Edit Booking</h2>

          {/* Full Name */}
          <div className="mb-4">
            <label className="block mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded ${errors.name ? "border-red-500" : "border-gray-300"}`}
              disabled={submitting}
            />
            {errors.name && <p className="text-red-500 text-sm">Name is required</p>}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="block mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                let val = e.target.value;
                if (val.startsWith("+63")) {
                  val = "+63" + val.substring(3).replace(/\D/g, "");
                }
                if (val.length > 13) val = val.slice(0, 13);
                if (val.length >= 3) setFormData(prev => ({ ...prev, phone: val }));
              }}
              className={`w-full border px-3 py-2 rounded ${errors.phone ? "border-red-500" : "border-gray-300"}`}
              disabled={submitting}
            />
            {errors.phone && <p className="text-red-500 text-sm">Valid phone required</p>}
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`w-full border px-3 py-2 rounded ${errors.address ? "border-red-500" : "border-gray-300"}`}
              disabled={submitting}
            />
            {errors.address && <p className="text-red-500 text-sm">Address is required</p>}
          </div>

          {/* Complaints */}
          <div className="mb-4">
            <label className="block mb-1">Complaints</label>
            {formData.complaints.map((c, i) => (
              <input
                key={i}
                value={c}
                onChange={(e) => handleComplaintChange(i, e.target.value)}
                className={`w-full mb-2 px-3 py-2 border rounded ${errors.complaints && !c ? "border-red-500" : "border-gray-300"}`}
                disabled={submitting}
              />
            ))}
            <button
              type="button"
              className="text-sm text-blue-600"
              onClick={() =>
                setFormData(prev => ({
                  ...prev,
                  complaints: [...prev.complaints, ""],
                }))
              }
              disabled={submitting}
            >
              + Add more
            </button>
            {errors.complaints && <p className="text-red-500 text-sm">At least one complaint required</p>}
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="block mb-1">Appointment Date</label>
            <DatePicker
              selected={formData.date}
              onChange={(d) => setFormData((prev) => ({ ...prev, date: d }))}
              dayClassName={(d) =>
                bookedDates.some((bd) => isSameDay(bd, d))
                  ? "bg-red-200 text-red-700"
                  : "bg-green-100"
              }
              className={`w-full border px-3 py-2 rounded ${errors.date ? "border-red-500" : "border-gray-300"}`}
              placeholderText="Select date"
              disabled={submitting}
            />
            {errors.date && <p className="text-red-500 text-sm">Date is required</p>}
          </div>

          {/* Status */}
          <div className="mb-4">
             <label className="block text-gray-700 mb-2">Status</label>
                <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={submitting}
                >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

          {/* Buttons */}
          <div className="flex justify-between space-x-4">
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update"}
            </button>
            <button
              type="button"
              onClick={toggleModal}
              className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditBookingModal;
