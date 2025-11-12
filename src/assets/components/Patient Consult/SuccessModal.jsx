import React, { useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

const SuccessModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-blue-50/80 via-white/70 to-teal-50/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4 transform transition-all duration-300 scale-100 animate-bounce-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Success icon with animation */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="w-20 h-20 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <CheckCircle size={40} className="text-white animate-bounce" />
          </div>
          {/* Ripple effect */}
          <div className="absolute inset-0 w-20 h-20 bg-teal-400 rounded-full animate-ping opacity-20"></div>
        </div>

        {/* Success message */}
        <h2
          id="success-title"
          className="text-2xl font-bold text-gray-800 mb-3"
        >
          Success!
        </h2>

        <p className="text-lg font-semibold text-teal-600 mb-2">
          Appointment Booked Successfully
        </p>

        <p className="text-sm text-gray-500 mb-8">
          You will receive a confirmation email shortly with all the details.
        </p>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-6 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-200"
        >
          Perfect, got it!
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
