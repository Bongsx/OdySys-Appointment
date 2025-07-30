// ✅ Applied categorized display & changed Edit to View
import { useEffect, useState } from "react";
import { ref, onValue, update, remove, push } from "firebase/database";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import DeleteAppointmentModal from "./DeleteAppointmentModal";
import AddMedicalServices from "./AddMedicalServicesModal";
import ViewAppointmentModal from "./ViewAppointmentModal";

function AdminLabAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [errors, setErrors] = useState({});
  const [sortKey, setSortKey] = useState("date");
  const [filterExam, setFilterExam] = useState("");
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;

  useEffect(() => {
    const refApp = ref(database, `appointments/laboratory`);
    onValue(refApp, (snap) => {
      const data = snap.val();
      if (data) setAppointments(data);
    });

    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const openModal = (type, id) => {
    setModalType(type);
    setCurrentId(id);
    setModalOpen(true);
    if (type === "view") setEditForm({ ...appointments[id] });
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setCurrentId(null);
    setEditForm({});
    setErrors({});
  };

  const validateForm = () => {
    const errs = {};
    for (const key in editForm) {
      if (
        key !== "done" &&
        key !== "notes" &&
        (!editForm[key] || editForm[key].trim() === "")
      ) {
        errs[key] = `${key.replace(/([A-Z])/g, " $1")} is required`;
      }
    }
    return errs;
  };

  const saveEdit = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    update(ref(database, `appointments/laboratory/${currentId}`), editForm)
      .then(() => alert("✅ Appointment updated successfully."))
      .catch(() => alert("❌ Failed to update appointment."));
    closeModal();
  };

  const confirmDelete = () => {
    remove(ref(database, `appointments/laboratory/${currentId}`));
    closeModal();
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]:
        name !== "notes" && value.trim() === ""
          ? `${name.replace(/([A-Z])/g, " $1")} is required`
          : undefined,
    }));
  };

  const groupedByExamType = Object.entries(appointments).reduce(
    (acc, [id, app]) => {
      const key = app.examType || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push([id, app]);
      return acc;
    },
    {}
  );

  const sortedFiltered = Object.entries(appointments)
    .filter(([_, a]) => {
      const matchesExam = !filterExam || a.examType === filterExam;
      const matchesSearch =
        !searchTerm ||
        a.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.examType?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesExam && matchesSearch;
    })
    .sort(([, a], [, b]) => {
      if (sortKey === "date") {
        return new Date(a.date) - new Date(b.date);
      }
      const pa = (a.patientName || "").toLowerCase();
      const pb = (b.patientName || "").toLowerCase();
      if (pa !== pb) return pa.localeCompare(pb);
      return (a.examType || "")
        .toLowerCase()
        .localeCompare((b.examType || "").toLowerCase());
    });

  const paginated = sortedFiltered.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const examTypes = [
    ...new Set(
      Object.values(appointments)
        .map((a) => a.examType)
        .filter(Boolean)
    ),
  ];

  const totalPages = Math.ceil(sortedFiltered.length / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Dashboard
              </button>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🧪</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Laboratory Appointments
                  </h1>
                  <p className="text-sm text-gray-500">
                    Admin Management Panel
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                {sortedFiltered.length} Total Appointments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search patients, emails, or exam types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="date">Date</option>
                  <option value="patient">Patient Name</option>
                  <option value="examType">Exam Type</option>
                </select>
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filter:
                </label>
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Exams</option>
                  {examTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterExam) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterExam("");
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear
              </button>
            )}
          </div>

          <div>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                setModalType("AddMedicalService");
                setModalOpen(true);
              }}
            >
              Add Medical Service
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Slot
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Exam Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg
                          className="w-12 h-12 text-gray-400 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">
                          No appointments found
                        </p>
                        <p className="text-gray-400 text-sm">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map(([id, app]) => (
                    <tr
                      key={id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {app.patientName?.charAt(0)?.toUpperCase() || "P"}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {app.patientName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          #{app.slotNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {app.labTestName || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {app.createdAt?.date}
                          </div>
                          <div className="font-medium">
                            {app.createdAt?.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {app.estimatedTime}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-900 max-w-xs truncate"
                          title={app.email}
                        >
                          {app.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-500 max-w-xs truncate"
                          title={app.notes}
                        >
                          {app.notes || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openModal("view", id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors duration-200"
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => openModal("delete", id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors duration-200"
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sortedFiltered.length > pageSize && (
            <div className="bg-white px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{page * pageSize + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min((page + 1) * pageSize, sortedFiltered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{sortedFiltered.length}</span>{" "}
                  results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    disabled={(page + 1) * pageSize >= sortedFiltered.length}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ViewAppointmentModal
        open={modalOpen && modalType === "view"}
        onClose={closeModal}
        form={editForm}
      />

      <DeleteAppointmentModal
        open={modalOpen && modalType === "delete"}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />

      <AddMedicalServices
        open={modalOpen && modalType === "AddMedicalService"}
        onClose={closeModal}
      />
    </div>
  );
}

export default AdminLabAppointments;
