import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "../firebase/firebase";
import { set, ref } from "firebase/database";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  User,
  Phone,
  UserPlus,
} from "lucide-react";

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }) => {
  const checks = [
    { test: password.length >= 8, label: "At least 8 characters" },
    { test: /[A-Z]/.test(password), label: "One uppercase letter" },
    { test: /[a-z]/.test(password), label: "One lowercase letter" },
    { test: /\d/.test(password), label: "One number" },
    {
      test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      label: "One special character",
    },
  ];

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 text-xs ${
            check.test ? "text-green-600" : "text-gray-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              check.test ? "bg-green-500" : "bg-gray-300"
            }`}
          ></span>
          {check.label}
        </div>
      ))}
    </div>
  );
};

function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    let value = e.target.value;

    // Format contact number to ensure it starts with 09 and is max 11 digits
    if (e.target.name === "contactNumber") {
      // Remove all non-digits
      value = value.replace(/\D/g, "");

      // Ensure it starts with 09
      if (value.length > 0 && !value.startsWith("09")) {
        if (value.startsWith("9")) {
          value = "0" + value;
        } else if (!value.startsWith("0")) {
          value = "09" + value;
        }
      }

      // Limit to 11 digits
      value = value.substring(0, 11);
    }

    setForm({ ...form, [e.target.name]: value });
    setError(null);
    setSuccess(null);
  };

  // Enhanced password validation function
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
    }
    return null; // Password is valid
  };

  const validateForm = () => {
    if (!form.firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!form.lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!form.contactNumber.trim()) {
      setError("Contact number is required");
      return false;
    }
    if (form.contactNumber.length !== 11) {
      setError("Contact number must be exactly 11 digits");
      return false;
    }
    if (!form.contactNumber.startsWith("09")) {
      setError("Contact number must start with 09");
      return false;
    }

    // Enhanced password validation
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;
      const createdAt = new Date()
        .toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(/(\d+)\/(\d+)\/(\d+),/, "$3-$1-$2,");

      // Save user data to Realtime Database
      const userData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email,
        contactNumber: form.contactNumber,
        role: "patient",
        createdAt: createdAt,
      };

      await set(ref(database, `users/${user.uid}`), userData);

      // Send welcome email
      try {
        await fetch("http://localhost:5000/api/send-welcome-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.contactNumber,
            password: form.password,
            createdAt: new Date().toISOString(),
          }),
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Continue with signup even if email fails
      }

      setSuccess(
        "Account created successfully! Please check your email for login details."
      );

      // Clear form
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        password: "",
        confirmPassword: "",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already registered. Please use a different email.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address. Please check your email.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Join us to access our clinic services</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-in slide-in-from-top-2 duration-300">
                <div className="w-5 h-5 flex-shrink-0 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>

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
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Contact Number Input */}
            <div className="space-y-2">
              <label
                htmlFor="contactNumber"
                className="text-sm font-medium text-gray-700"
              >
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="contactNumber"
                  type="tel"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  placeholder="09xxxxxxxxx"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                Format: 09xxxxxxxxx (11 digits)
              </p>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
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
              {form.password && (
                <PasswordStrengthIndicator password={form.password} />
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{" "}
            <button className="text-indigo-600 hover:text-indigo-500 transition-colors">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="text-indigo-600 hover:text-indigo-500 transition-colors">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
