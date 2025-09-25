import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../firebase/firebase";
import {
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
} from "lucide-react";

function ResetPassword() {
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oobCode, setOobCode] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [];

    if (!checks.length) feedback.push("At least 8 characters");
    if (!checks.uppercase) feedback.push("One uppercase letter");
    if (!checks.lowercase) feedback.push("One lowercase letter");
    if (!checks.number) feedback.push("One number");
    if (!checks.special) feedback.push("One special character");

    return { score, feedback, checks };
  };

  // Extract and validate the oobCode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get("oobCode");
    const mode = urlParams.get("mode");

    // Validate that this is a password reset request
    if (mode !== "resetPassword") {
      setError(
        "Invalid password reset link. Please request a new password reset."
      );
      setIsValidating(false);
      return;
    }

    if (!code) {
      setError(
        "Invalid or missing reset code. Please request a new password reset."
      );
      setIsValidating(false);
      return;
    }

    // Verify the reset code and get user email
    const verifyCode = async () => {
      try {
        const email = await verifyPasswordResetCode(auth, code);
        setOobCode(code);
        setUserEmail(email);
        setIsValidating(false);
      } catch (err) {
        console.error("Error verifying reset code:", err);

        let errorMessage =
          "Unable to verify reset code. Please request a new password reset.";

        switch (err.code) {
          case "auth/expired-action-code":
            errorMessage =
              "This password reset link has expired. Please request a new one.";
            break;
          case "auth/invalid-action-code":
            errorMessage =
              "Invalid or malformed reset code. Please request a new password reset.";
            break;
          case "auth/user-disabled":
            errorMessage =
              "This account has been disabled. Please contact support.";
            break;
          case "auth/user-not-found":
            errorMessage =
              "No account found for this reset link. The account may have been deleted.";
            break;
          case "auth/network-request-failed":
            errorMessage =
              "Network error. Please check your connection and try again.";
            break;
          default:
            errorMessage = `Unable to verify reset code: ${err.message}`;
        }

        setError(errorMessage);
        setIsValidating(false);
      }
    };

    verifyCode();
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);

    // Check password strength for new password
    if (name === "newPassword") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validatePasswords = () => {
    const { newPassword, confirmPassword } = passwords;

    if (!newPassword.trim()) {
      setError("New password is required");
      return false;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    // Check password strength
    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 3) {
      setError(
        "Password is too weak. Please include uppercase, lowercase, numbers, and special characters."
      );
      return false;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your password");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validatePasswords()) {
      return;
    }

    if (!oobCode) {
      setError("Invalid reset code. Please request a new password reset.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Reset the password using Firebase
      await confirmPasswordReset(auth, oobCode, passwords.newPassword);

      setSuccess(
        "Password reset successful! You can now sign in with your new password."
      );
      setPasswords({
        newPassword: "",
        confirmPassword: "",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Password reset successful! Please sign in with your new password.",
            type: "success",
          },
        });
      }, 3000);
    } catch (err) {
      console.error("Error resetting password:", err);

      let errorMessage = "Failed to reset password. Please try again.";

      switch (err.code) {
        case "auth/expired-action-code":
          errorMessage =
            "This password reset link has expired. Please request a new one.";
          break;
        case "auth/invalid-action-code":
          errorMessage =
            "Invalid reset code. Please request a new password reset.";
          break;
        case "auth/weak-password":
          errorMessage =
            "Password is too weak. Please choose a stronger password.";
          break;
        case "auth/user-disabled":
          errorMessage =
            "This account has been disabled. Please contact support.";
          break;
        case "auth/user-not-found":
          errorMessage =
            "Account not found. Please request a new password reset.";
          break;
        default:
          errorMessage = `Failed to reset password: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = (score) => {
    if (score < 2) return "bg-red-500";
    if (score < 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (score) => {
    if (score < 2) return "Weak";
    if (score < 4) return "Medium";
    return "Strong";
  };

  // Show loading screen while validating the reset code
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          {userEmail && (
            <p className="text-gray-600 mb-2">
              Resetting password for:{" "}
              <span className="font-medium text-gray-800">{userEmail}</span>
            </p>
          )}
          <p className="text-gray-600 text-sm">Enter your new password below</p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <form onSubmit={handleResetPassword} className="space-y-6">
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
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm leading-relaxed">{success}</span>
                  <div className="mt-2 text-xs text-green-600">
                    Redirecting to login page in 3 seconds...
                  </div>
                </div>
              </div>
            )}

            {/* New Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {passwords.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(
                          passwordStrength.score
                        )}`}
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.score < 2
                          ? "text-red-600"
                          : passwordStrength.score < 4
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span>
                        Include: {passwordStrength.feedback.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your new password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwords.confirmPassword &&
                passwords.newPassword !== passwords.confirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isLoading || success || !oobCode || passwordStrength.score < 3
              }
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Resetting Password...
                </div>
              ) : success ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Password Reset Successful
                </div>
              ) : (
                "Reset Password"
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

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Security Notice
            </h3>
            <p className="text-xs text-blue-700">
              For your security, this reset link will expire in 1 hour and can
              only be used once.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
