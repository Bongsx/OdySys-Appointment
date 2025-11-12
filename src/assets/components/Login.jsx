import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "../firebase/firebase";
import { get, ref } from "firebase/database";
import { Eye, EyeOff } from "lucide-react";
import logo from "../../../public/logo.jpg";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);

      let userData = { uid: user.uid, email: user.email };

      if (snapshot.exists()) {
        userData = { ...userData, ...snapshot.val() };
      }

      localStorage.setItem("user", JSON.stringify(userData));
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 flex">
      {/* Left: Image */}
      <div className="relative w-1/2 h-screen hidden lg:block overflow-hidden">
        <img
          src={logo}
          alt="OddySys"
          className="object-cover w-full h-full scale-105 transition-transform duration-700 hover:scale-100"
        />
      </div>

      {/* Right: Login Form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 px-8 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent mb-3">
              Login
            </h1>
            <p className="text-gray-400 text-lg">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-8 shadow-2xl shadow-blue-500/10">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-white font-medium text-sm tracking-wide"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-white font-medium text-sm tracking-wide"
                >
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl py-3 px-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform ${
                  isLoading
                    ? "bg-slate-800/50 cursor-not-allowed scale-95"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
                }`}
              >
                <span className="flex items-center justify-center">
                  {isLoading && (
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {isLoading ? "Signing In..." : "Sign In"}
                </span>
              </button>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-blue-300 hover:text-white text-sm font-medium transition-colors duration-200 hover:underline decoration-blue-300"
                >
                  Forgot Password?
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-blue-300 hover:text-white text-sm font-medium transition-colors duration-200 hover:underline decoration-blue-300"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              Secure login powered by Odyssey encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
