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
  Calendar,
  MapPin,
  Heart,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
} from "lucide-react";

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

const AllergyInput = ({ allergies, setAllergies }) => {
  const [newAllergy, setNewAllergy] = useState("");

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (index) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAllergy();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newAllergy}
          onChange={(e) => setNewAllergy(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter an allergy"
          className="flex-1 py-2 px-3 border rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={addAllergy}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {allergies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allergies.map((allergy, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
            >
              {allergy}
              <button
                type="button"
                onClick={() => removeAllergy(index)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const StepIndicator = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted
                  ? "bg-green-500 text-white"
                  : isCurrent
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`w-16 h-1 mx-2 ${
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Error message component for individual fields
const FieldError = ({ error }) => {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 mt-1 text-red-600 text-xs animate-in slide-in-from-top-1 duration-200">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
};

function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    bloodType: "",
    allergies: [],
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    password: "",
    confirmPassword: "",
  });

  // Change from single error to field-specific errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const totalSteps = 3;

  const handleChange = (e) => {
    let value = e.target.value;
    const fieldName = e.target.name;

    if (fieldName === "contactNumber" || fieldName === "emergencyPhone") {
      value = value.replace(/\D/g, "");
      if (value.length > 0 && !value.startsWith("09")) {
        if (value.startsWith("9")) value = "0" + value;
        else if (!value.startsWith("0")) value = "09" + value;
      }
      value = value.substring(0, 11);
    }

    setForm({ ...form, [fieldName]: value });

    // Clear field error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
    setSuccess(null);
  };

  const setAllergies = (allergies) => {
    setForm({ ...form, allergies });
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (password.length < minLength)
      return "Password must be at least 8 characters long";
    if (!hasUpperCase)
      return "Password must contain at least one uppercase letter";
    if (!hasLowerCase)
      return "Password must contain at least one lowercase letter";
    if (!hasNumbers) return "Password must contain at least one number";
    if (!hasSpecialChar)
      return "Password must contain at least one special character";
    return null;
  };

  // Modified validation to return field-specific errors
  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!form.firstName.trim()) errors.firstName = "First name is required";
        if (!form.lastName.trim()) errors.lastName = "Last name is required";
        if (!form.email.trim()) errors.email = "Email is required";
        if (!form.contactNumber.trim()) {
          errors.contactNumber = "Contact number is required";
        } else if (form.contactNumber.length !== 11) {
          errors.contactNumber = "Contact number must be exactly 11 digits";
        } else if (!form.contactNumber.startsWith("09")) {
          errors.contactNumber = "Contact number must start with 09";
        }
        if (!form.dateOfBirth) {
          errors.dateOfBirth = "Date of birth is required";
        } else {
          const selectedDate = new Date(form.dateOfBirth);
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (selectedDate > today) {
            errors.dateOfBirth = "Date of birth cannot be in the future";
          }
        }
        if (!form.gender) errors.gender = "Gender is required";
        if (!form.address.trim()) errors.address = "Address is required";
        break;

      case 2:
        if (!form.emergencyName.trim())
          errors.emergencyName = "Emergency contact name is required";
        if (!form.emergencyPhone.trim()) {
          errors.emergencyPhone = "Emergency contact phone is required";
        } else if (form.emergencyPhone.length !== 11) {
          errors.emergencyPhone = "Emergency phone must be exactly 11 digits";
        } else if (!form.emergencyPhone.startsWith("09")) {
          errors.emergencyPhone = "Emergency phone must start with 09";
        }
        if (!form.emergencyRelationship.trim())
          errors.emergencyRelationship =
            "Emergency contact relationship is required";
        break;

      case 3:
        const passwordError = validatePassword(form.password);
        if (passwordError) errors.password = passwordError;
        if (form.password !== form.confirmPassword)
          errors.confirmPassword = "Passwords do not match";
        break;

      default:
        break;
    }

    return errors;
  };

  const nextStep = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setFieldErrors({});
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;
      const now = new Date().toISOString();

      const userData = {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        email: form.email,
        role: "patient",
        createdAt: now,
        patientId: user.uid,
        contactNumber: form.contactNumber,
      };
      await set(ref(database, `users/${user.uid}`), userData);

      const patientData = {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        contactNumber: form.contactNumber,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address.trim(),
        bloodType: form.bloodType,
        allergies: form.allergies,
        emergencyContact: {
          name: form.emergencyName.trim(),
          phone: form.emergencyPhone,
          relationship: form.emergencyRelationship.trim(),
        },
        createdAt: now,
        lastUpdated: now,
        userId: user.uid,
      };
      await set(ref(database, `patients/${user.uid}`), patientData);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        console.log(
          "Sending email request to:",
          `${API_URL}/send-welcome-email`
        );

        const response = await fetch(`${API_URL}/send-welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            contactNumber: form.contactNumber,
            password: form.password,
            createdAt: now,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log("✅ Welcome email sent successfully.");
        } else {
          let errorMessage = "Unknown error while sending email.";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
            console.error("Mailjet email error:", errorData);
          } catch {
            errorMessage = `Server error (${response.status})`;
          }
          console.warn(`⚠️ Email sending failed: ${errorMessage}`);
        }
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);

        if (emailError.name === "AbortError") {
          console.warn(
            "⏱️ Email request timed out (server may be starting up)."
          );
        } else if (
          emailError.name === "TypeError" &&
          emailError.message.includes("fetch")
        ) {
          console.warn("⚠️ Email service unavailable (network issue).");
        }
      }

      setSuccess(
        "Account created successfully! Please check your email for login details."
      );
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error(err);
      let errorMessage = "Failed to create account. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        setFieldErrors({
          email: "Email is already registered. Please use a different email.",
        });
        return;
      } else if (err.code === "auth/weak-password") {
        setFieldErrors({
          password: "Password is too weak. Please choose a stronger password.",
        });
        return;
      } else if (err.code === "auth/invalid-email") {
        setFieldErrors({
          email: "Invalid email address. Please check your email.",
        });
        return;
      }

      // For general errors, you might want to show a general error message at the top
      setFieldErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <User className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-gray-900">
          Personal Information
        </h2>
        <p className="text-sm text-gray-600">Tell us about yourself</p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            First Name *
          </label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First name"
            required
            className={`w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.firstName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <FieldError error={fieldErrors.firstName} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Middle Name
          </label>
          <input
            type="text"
            name="middleName"
            value={form.middleName}
            onChange={handleChange}
            placeholder="Middle name"
            className="w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Last name"
            required
            className={`w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.lastName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <FieldError error={fieldErrors.lastName} />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Email Address *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
        </div>
        <FieldError error={fieldErrors.email} />
      </div>

      {/* Contact Number */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Contact Number *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            name="contactNumber"
            value={form.contactNumber}
            onChange={handleChange}
            placeholder="09xxxxxxxxx"
            required
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.contactNumber
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
        </div>
        <FieldError error={fieldErrors.contactNumber} />
        {!fieldErrors.contactNumber && (
          <p className="text-xs text-gray-500">
            Format: 09xxxxxxxxx (11 digits)
          </p>
        )}
      </div>

      {/* DOB & Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Date of Birth *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              max={getTodayDate()}
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                fieldErrors.dateOfBirth
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
            />
          </div>
          <FieldError error={fieldErrors.dateOfBirth} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Gender *</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
            className={`w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.gender
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <FieldError error={fieldErrors.gender} />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Address *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Enter your complete address"
            required
            rows={3}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none ${
              fieldErrors.address
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
        </div>
        <FieldError error={fieldErrors.address} />
      </div>

      {/* Blood Type & Allergies */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Blood Type
          </label>
          <select
            name="bloodType"
            value={form.bloodType}
            onChange={handleChange}
            className="w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select blood type</option>
            {bloodTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Allergies</label>
          <AllergyInput
            allergies={form.allergies}
            setAllergies={setAllergies}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-gray-900">
          Emergency Contact
        </h2>
        <p className="text-sm text-gray-600">
          Who should we contact in case of emergency?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Contact Name *
          </label>
          <input
            type="text"
            name="emergencyName"
            value={form.emergencyName}
            onChange={handleChange}
            placeholder="Full name of emergency contact"
            required
            className={`w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.emergencyName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <FieldError error={fieldErrors.emergencyName} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              name="emergencyPhone"
              value={form.emergencyPhone}
              onChange={handleChange}
              placeholder="09xxxxxxxxx"
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                fieldErrors.emergencyPhone
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
            />
          </div>
          <FieldError error={fieldErrors.emergencyPhone} />
          {!fieldErrors.emergencyPhone && (
            <p className="text-xs text-gray-500">
              Format: 09xxxxxxxxx (11 digits)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Relationship *
          </label>
          <input
            type="text"
            name="emergencyRelationship"
            value={form.emergencyRelationship}
            onChange={handleChange}
            placeholder="e.g., Mother, Father, Spouse, Sibling"
            required
            className={`w-full py-3 px-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.emergencyRelationship
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <FieldError error={fieldErrors.emergencyRelationship} />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Lock className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-gray-900">
          Account Security
        </h2>
        <p className="text-sm text-gray-600">
          Create a secure password for your account
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Password *</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create password"
            required
            className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.password
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        <FieldError error={fieldErrors.password} />
        {form.password && !fieldErrors.password && (
          <PasswordStrengthIndicator password={form.password} />
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Confirm Password *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
            required
            className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              fieldErrors.confirmPassword
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        <FieldError error={fieldErrors.confirmPassword} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Join us to access our clinic services</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <form
            onSubmit={
              currentStep === totalSteps
                ? handleSignup
                : (e) => e.preventDefault()
            }
          >
            {/* General error for system-level issues */}
            {fieldErrors.general && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-in slide-in-from-top-2 duration-300 mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{fieldErrors.general}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-in slide-in-from-top-2 duration-300 mb-6">
                <div className="w-5 h-5 flex-shrink-0 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm">{success}</span>
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 ml-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              )}
            </div>
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
