import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  FlaskConical,
  Shield,
  BookOpen,
  LogOut,
  Activity,
} from "lucide-react";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem("user");
    // Navigate to login page
    navigate("/");
  };

  const navItems = [
    {
      to: "/PatientBooking",
      label: "Patient Booking",
      icon: CalendarDays,
    },
    {
      to: "/LaboratoryExams",
      label: "Laboratory Exams",
      icon: FlaskConical,
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            OdySys Appointments
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`
                group flex items-center gap-3 p-3 rounded-xl font-medium
                transition-all duration-300 ease-in-out transform
                hover:scale-105 hover:shadow-lg
                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                    : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
                }
                relative overflow-hidden
              `}
            >
              {/* Background animation */}
              <div
                className={`
                absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 
                transform scale-x-0 group-hover:scale-x-100 
                transition-transform duration-300 ease-out origin-left
                ${isActive ? "scale-x-100" : ""}
              `}
              />

              {/* Icon */}
              <Icon
                className={`
                w-5 h-5 z-10 transition-all duration-300
                ${
                  isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-blue-400"
                }
              `}
              />

              {/* Label */}
              <span className="z-10 transition-all duration-300">
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="
            group w-full flex items-center gap-3 p-3 rounded-xl font-medium
            text-gray-300 hover:text-white hover:bg-red-600/20
            transition-all duration-300 ease-in-out transform
            hover:scale-105 hover:shadow-lg
            border border-transparent hover:border-red-500/30
          "
        >
          <LogOut className="w-5 h-5 transition-all duration-300 group-hover:text-red-400" />
          <span className="transition-all duration-300">Logout</span>

          {/* Logout hover effect */}
          <div
            className="
            absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-500/10 
            transform scale-x-0 group-hover:scale-x-100 
            transition-transform duration-300 ease-out origin-left
            rounded-xl
          "
          />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
