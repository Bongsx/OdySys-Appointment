import { useState, useEffect } from "react";
import { ref, onValue, remove, update } from "firebase/database";
import { database } from "../firebase/firebase";
import DeleteConfirmationModal from "./DeleteConfirmationModalBooking";
import EditBookingModal from "./EditBookingModal";
import AddBooking from "./AddBooking";
import { useNavigate } from "react-router-dom";
import {
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

function AdminConsult() {
  const navigate = useNavigate();
  const [bookingList, setBookingList] = useState([]);
  const [consultationTypes, setConsultationTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch consultation types
    const typesRef = ref(database, "medicalServices/consultationTypes");
    const typesUnsubscribe = onValue(typesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const types = Object.values(data).map((service) => service.name);
        setConsultationTypes(["All", ...types]);
      } else {
        setConsultationTypes(["All"]);
      }
    });

    // Fetch bookings
    const bookingRef = ref(database, `appointments/consultations`);
    const bookingsUnsubscribe = onValue(bookingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bookings = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        bookings.sort((a, b) =>
          (a.patient?.patientFirstName || "").localeCompare(
            b.patient?.patientFirstName || ""
          )
        );
        setBookingList(bookings);
      } else {
        setBookingList([]);
      }
      setLoading(false);
    });

    return () => {
      typesUnsubscribe();
      bookingsUnsubscribe();
    };
  }, []);

  const toggleModal = () => setModal(!modal);
  const toggleEditModal = () => setEditModal(!editModal);
  const toggleDeleteModal = () => setDeleteModal(!deleteModal);

  const handleDeleteConfirmation = (booking) => {
    setCurrentBooking(booking);
    toggleDeleteModal();
  };

  const handleDelete = async () => {
    if (currentBooking) {
      await remove(
        ref(database, `appointments/consultations/${currentBooking.id}`)
      );
      toggleDeleteModal();
    }
  };

  const handleEdit = (booking) => {
    setCurrentBooking(booking);
    toggleEditModal();
  };

  const handleUpdate = async (updatedBooking) => {
    await update(
      ref(database, `appointments/consultations/${currentBooking.id}`),
      updatedBooking
    );
    toggleEditModal();
  };

  // Filter bookings by selected type and search query
  const filteredBookings = bookingList.filter((booking) => {
    const matchesSearch =
      (booking.patient?.patientFirstName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (booking.patient?.patientLastName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      `${booking.patient?.patientFirstName || ""} ${
        booking.patient?.patientLastName || ""
      }`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesType = selectedType === "All" || booking.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Get statistics for current filter
  const getStats = () => {
    const currentBookings =
      selectedType === "All"
        ? bookingList
        : bookingList.filter((b) => b.type === selectedType);
    return {
      total: currentBookings.length,
      completed: currentBookings.filter((b) => b.status === "Completed").length,
      pending: currentBookings.filter(
        (b) => !b.status || b.status === "Pending"
      ).length,
      confirmed: currentBookings.filter((b) => b.status === "Confirmed").length,
      cancelled: currentBookings.filter((b) => b.status === "Cancelled").length,
    };
  };

  const stats = getStats();

  const getStatusConfig = (status) => {
    switch (status) {
      case "Completed":
        return {
          icon: CheckCircleIcon,
          class: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "Confirmed":
        return {
          icon: CheckCircleIcon,
          class: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "Cancelled":
        return {
          icon: ExclamationTriangleIcon,
          class: "bg-red-50 text-red-700 border-red-200",
        };
      default:
        return {
          icon: ClockIcon,
          class: "bg-amber-50 text-amber-700 border-amber-200",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Appointment Bookings
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage and track patient appointments by consultation type
              </p>
            </div>
          </div>

          {/* Consultation Type Tabs */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Filter by Consultation Type
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {consultationTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedType === type
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {type}
                  {type !== "All" && (
                    <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                      {bookingList.filter((b) => b.type === type).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {stats.completed}
                  </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.confirmed}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.pending}
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <ClockIcon className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.cancelled}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="relative w-full lg:w-96">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-3 w-full lg:w-auto">
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Back
                </button>
                <button
                  onClick={toggleModal}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Booking
                </button>
              </div>
            </div>

            {/* Current Filter Info */}
            {selectedType !== "All" && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Squares2X2Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Showing appointments for: <strong>{selectedType}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedType("All")}
                    className="ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Patient
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      Contact
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      Address
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                      Complaints
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <UserCircleIcon className="h-4 w-4" />
                      Doctor
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Consultation Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      Schedule
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking, index) => {
                    const statusConfig = getStatusConfig(booking.status);
                    const StatusIcon = statusConfig.icon;
                    const patientName = `${
                      booking.patient?.patientFirstName || ""
                    } ${booking.patient?.patientLastName || ""}`.trim();

                    return (
                      <tr
                        key={booking.id}
                        className={`hover:bg-gray-50 transition-colors duration-200 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                              {(
                                booking.patient?.patientFirstName?.charAt(0) ||
                                "P"
                              ).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {patientName || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            <div>{booking.patient?.phone || "N/A"}</div>
                            <div className="text-xs text-gray-500">
                              {booking.patient?.email || ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                          {booking.patient?.address || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {booking.patient?.complaints?.filter(Boolean)
                              .length > 0 ? (
                              <ul className="text-xs text-gray-600 space-y-1">
                                {booking.patient.complaints
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((complaint, i) => (
                                    <li
                                      key={i}
                                      className="flex items-center gap-1"
                                    >
                                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                      <span className="truncate">
                                        {complaint}
                                      </span>
                                    </li>
                                  ))}
                                {booking.patient.complaints.filter(Boolean)
                                  .length > 2 && (
                                  <li className="text-gray-400 text-xs">
                                    +
                                    {booking.patient.complaints.filter(Boolean)
                                      .length - 2}{" "}
                                    more
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                No complaints
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.doctor || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.clinicName || ""}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {booking.type || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">
                              {booking.appointmentDate
                                ? new Date(
                                    booking.appointmentDate
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.appointmentTime || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.class}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {booking.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(booking)}
                              className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                              <PencilIcon className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteConfirmation(booking)}
                              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <CalendarDaysIcon className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No bookings found
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {searchQuery || selectedType !== "All"
                            ? "Try adjusting your search terms or filters"
                            : "Get started by adding your first booking"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {modal && <AddBooking isOpen={modal} toggleModal={toggleModal} />}
        <DeleteConfirmationModal
          isOpen={deleteModal}
          toggleModal={toggleDeleteModal}
          onConfirm={handleDelete}
        />
        <EditBookingModal
          isOpen={editModal}
          toggleModal={toggleEditModal}
          currentBooking={currentBooking}
          handleUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}

export default AdminConsult;
