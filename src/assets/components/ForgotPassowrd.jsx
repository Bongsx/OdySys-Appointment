import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, database } from "../firebase/firebase";
import { get, ref } from "firebase/database";
import { Mail, AlertCircle, ArrowLeft, Key } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError(null);
    setSuccess(null);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user exists in our database first
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);

      let userExists = false;
      let userData = null;

      if (snapshot.exists()) {
        const users = snapshot.val();
        // Find user by email
        for (const userId in users) {
          if (users[userId].email?.toLowerCase() === email.toLowerCase()) {
            userExists = true;
            userData = users[userId];
            break;
          }
        }
      }

      if (!userExists) {
        setError("No account found with this email address");
        return;
      }

      // Configure action code settings to use your custom domain
      const actionCodeSettings = {
        // This should point to your Firebase hosting domain with the action handler
        url: "https://odyssey-test-db.firebaseapp.com/__/auth/action",
        handleCodeInApp: false, // Set to false since we're using the default Firebase action page
      };

      // Send Firebase password reset email with custom action URL
      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      setSuccess(
        "Password reset instructions have been sent to your email address. Please check your inbox and follow the instructions to reset your password."
      );
      setEmail("");

      // Optional: Send additional custom notification email
      try {
        const resetNotificationPayload = {
          email: email,
          userName: userData
            ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              "User"
            : "User",
          timestamp: new Date().toISOString(),
        };

        // Only send if you have a backend endpoint for additional notifications
        await fetch("http://localhost:5000/api/send-password-reset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resetNotificationPayload),
        });
      } catch (notificationError) {
        console.warn("Failed to send notification email:", notificationError);
        // Don't show error to user since main reset email was sent successfully
      }
    } catch (err) {
      console.error("Password reset error:", err);

      // Handle specific Firebase Auth errors
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email address");
          break;
        case "auth/invalid-email":
          setError(
            "Invalid email address. Please check your email and try again."
          );
          break;
        case "auth/too-many-requests":
          setError(
            "Too many password reset requests. Please wait before trying again."
          );
          break;
        case "auth/network-request-failed":
          setError(
            "Network error. Please check your connection and try again."
          );
          break;
        default:
          setError("Failed to send reset email. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you instructions to reset
            your password
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-in slide-in-from-top-2 duration-300">
                <div className="w-5 h-5 flex-shrink-0 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm leading-relaxed">{success}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                We'll send password reset instructions to this email
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending Instructions...
                </div>
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Need Help?
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              If you don't receive the email within a few minutes, please check
              your spam folder. The reset link will expire in 1 hour for
              security.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
