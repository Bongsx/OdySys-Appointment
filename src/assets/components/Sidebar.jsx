import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  FlaskConical,
  Shield,
  BookOpen,
  LogOut,
  Activity,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  Settings,
  Bell,
  BarChart3,
} from "lucide-react";
import { ref, get } from "firebase/database";
import { database } from "../firebase/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const [currentUser, setCurrentUser] = useState({
    firstName: "Guest",
    lastName: "User",
    role: "Patient",
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snapshot = await get(ref(database, `users/${user.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setCurrentUser({
              firstName: userData.firstName || "Guest",
              lastName: userData.lastName || "User",
              role: userData.role || "Patient",
            });
          } else {
            console.warn("User not found in database.");
          }
        } catch (error) {
          console.error("Failed to fetch user from database:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const appointmentItems = [
    {
      to: "/PatientBooking",
      label: "Consultation Booking",
      icon: CalendarDays,
    },
    { to: "/LaboratoryExams", label: "Laboratory Exams", icon: FlaskConical },
  ];

  const otherNavItems = [
    { to: "/", label: "Dashboard", icon: BarChart3 },
    { to: "/patients", label: "Patient Records", icon: Users },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const isAppointmentActive = appointmentItems.some(
    (item) => location.pathname === item.to
  );

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-80"
      } bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col min-h-screen relative`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-indigo-600/10 pointer-events-none" />
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-40 right-5 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

      <div className="p-6 border-b border-white/10 backdrop-blur-sm relative z-10">
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-3 transition-all duration-300 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent whitespace-nowrap">
                  OdySys Medical
                </h1>
                <p className="text-xs text-blue-200/70 mt-1">
                  Healthcare Management
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="p-4 space-y-3 flex-1 overflow-y-auto relative z-10">
        {/* User Info */}
        {!isCollapsed && (
          <div className="mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-xs text-blue-200/70 truncate">
                  {currentUser.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Link */}
        {otherNavItems
          .filter((item) => item.to === "/")
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-4 p-4 rounded-2xl font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-xl border border-blue-400/30"
                    : "hover:bg-white/10 text-gray-300 hover:text-white border border-transparent hover:border-white/20"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left rounded-2xl ${
                    isActive ? "scale-x-100" : ""
                  }`}
                />
                <Icon
                  className={`w-6 h-6 z-10 transition-all duration-300 flex-shrink-0 ${
                    isActive
                      ? "text-blue-300"
                      : "text-gray-400 group-hover:text-blue-300"
                  }`}
                />
                {!isCollapsed && (
                  <span className="z-10 transition-all duration-300 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-l-full shadow-lg" />
                )}
              </Link>
            );
          })}

        {/* Appointments Dropdown */}
        <div className="space-y-2">
          <button
            onClick={() =>
              !isCollapsed && setIsAppointmentsOpen(!isAppointmentsOpen)
            }
            className={`group w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
              isAppointmentActive || isAppointmentsOpen
                ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white shadow-xl border border-emerald-400/30"
                : "hover:bg-white/10 text-gray-300 hover:text-white border border-transparent hover:border-white/20"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Appointments Scheduling" : ""}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left rounded-2xl ${
                isAppointmentActive || isAppointmentsOpen ? "scale-x-100" : ""
              }`}
            />
            <Calendar
              className={`w-6 h-6 z-10 transition-all duration-300 flex-shrink-0 ${
                isAppointmentActive || isAppointmentsOpen
                  ? "text-emerald-300"
                  : "text-gray-400 group-hover:text-emerald-300"
              }`}
            />
            {!isCollapsed && (
              <>
                <span className="z-10 transition-all duration-300 whitespace-nowrap flex-1 text-left">
                  Appointments Scheduling
                </span>
                <div className="z-10 transition-transform duration-300">
                  {isAppointmentsOpen ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </>
            )}
            {isAppointmentActive && (
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-l-full shadow-lg" />
            )}
          </button>

          {!isCollapsed && (
            <div
              className={`space-y-2 transition-all duration-300 overflow-hidden ${
                isAppointmentsOpen
                  ? "max-h-96 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              {appointmentItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-4 p-3 ml-6 rounded-xl font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white shadow-lg border-l-4 border-emerald-400"
                        : "hover:bg-white/5 text-gray-400 hover:text-emerald-300 border-l-4 border-transparent hover:border-emerald-500/50"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 z-10 transition-all duration-300 flex-shrink-0 ${
                        isActive
                          ? "text-emerald-300"
                          : "text-gray-500 group-hover:text-emerald-400"
                      }`}
                    />
                    <span className="z-10 transition-all duration-300 text-sm">
                      {item.label}
                    </span>
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left rounded-xl ${
                        isActive ? "scale-x-100" : ""
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Remaining Nav Items */}
        {otherNavItems
          .filter((item) => item.to !== "/")
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-4 p-4 rounded-2xl font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-xl border border-blue-400/30"
                    : "hover:bg-white/10 text-gray-300 hover:text-white border border-transparent hover:border-white/20"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left rounded-2xl ${
                    isActive ? "scale-x-100" : ""
                  }`}
                />
                <Icon
                  className={`w-6 h-6 z-10 transition-all duration-300 flex-shrink-0 ${
                    isActive
                      ? "text-blue-300"
                      : "text-gray-400 group-hover:text-blue-300"
                  }`}
                />
                {!isCollapsed && (
                  <span className="z-10 transition-all duration-300 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-l-full shadow-lg" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10 backdrop-blur-sm relative z-10">
        <button
          onClick={handleLogout}
          className={`group w-full flex items-center gap-4 p-4 rounded-2xl font-medium text-gray-300 hover:text-white hover:bg-red-500/20 transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-xl border border-transparent hover:border-red-400/30 relative overflow-hidden ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut className="w-6 h-6 transition-all duration-300 group-hover:text-red-400 flex-shrink-0 z-10" />
          {!isCollapsed && (
            <span className="transition-all duration-300 z-10">Logout</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left rounded-2xl" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
