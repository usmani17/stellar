import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth";
import { Layout } from "../components/layout/Layout";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useSidebar } from "../contexts/SidebarContext";
import {
  AuthFormField,
  AuthButton,
  Alert,
} from "../components/ui";

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { sidebarWidth } = useSidebar();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    password2?: string;
    submit?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: {
      password?: string;
      password2?: string;
      submit?: string;
    } = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (!password2) {
      newErrors.password2 = "Please confirm your password";
    } else if (password !== password2) {
      newErrors.password2 = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authService.updatePassword(password, password2);

      // Refresh user profile to get updated has_unusable_password status
      const updatedUser = await authService.getProfile();
      updateUser(updatedUser);

      // Reset form
      setPassword("");
      setPassword2("");
      setErrors({});
      setShowPassword(false);
      setShowPassword2(false);
      
      // Don't show success message, just refresh seamlessly
      // The banner will automatically disappear when has_unusable_password becomes false
    } catch (err: any) {
      console.error("Failed to update password:", err);

      // Extract error messages
      const errorMessage =
        err?.response?.data?.new_password?.[0] ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update password. Please try again.";

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 bg-white"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white min-h-screen">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-[#072929]">
                Profile
              </h1>
              <p className="text-sm text-[#556179] mt-1">
                Manage your profile information and password
              </p>
            </div>

            {/* Personal Information Section */}
            <div className="bg-sandstorm-s0 rounded-xl p-6 border border-sandstorm-s40 mb-6">
              <h2 className="text-lg font-semibold text-[#072929] mb-4">
                Personal Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#556179] mb-1 uppercase">
                    Name
                  </label>
                  <p className="text-sm text-[#072929]">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#556179] mb-1 uppercase">
                    Email
                  </label>
                  <p className="text-sm text-[#072929]">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Update Password Section */}
            <div className="bg-sandstorm-s0 rounded-xl p-6 border border-sandstorm-s40">
              <h2 className="text-lg font-semibold text-[#072929] mb-4">
                Update Password
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                {/* Alerts */}
                {errors.submit && (
                  <Alert variant="error">{errors.submit}</Alert>
                )}

                {/* Input Fields - Each on separate line */}
                <div className="flex flex-col gap-5">
                  {/* Password Input */}
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                    <div className="self-stretch pb-1 inline-flex justify-start items-start">
                      <label className="justify-center text-black text-base font-medium leading-5 font-poppins">
                        Password
                      </label>
                    </div>
                    <div
                      className={`
                        self-stretch h-12 px-3 py-2 
                        bg-[#FEFEFB] 
                        rounded-xl 
                        border border-sandstorm-s40
                        inline-flex justify-start items-center gap-2
                        transition-all duration-200
                        ${errors.password ? "border-red-r30" : ""}
                        focus-within:border-forest-f40
                      `}
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) {
                            setErrors((prev) => ({
                              ...prev,
                              password: undefined,
                            }));
                          }
                        }}
                        required
                        placeholder="Enter new password"
                        className="flex-1 h-5 bg-transparent text-sm text-neutral-n1000 placeholder:text-[#bfbfbf] focus:outline-none font-poppins font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L3 3m0 0l18 18m-9.88-9.88L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="self-stretch text-h700 text-red-600 font-poppins">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Input */}
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                    <div className="self-stretch pb-1 inline-flex justify-start items-start">
                      <label className="justify-center text-black text-base font-medium leading-5 font-poppins">
                        Confirm Password
                      </label>
                    </div>
                    <div
                      className={`
                        self-stretch h-12 px-3 py-2 
                        bg-[#FEFEFB] 
                        rounded-xl 
                        border border-sandstorm-s40
                        inline-flex justify-start items-center gap-2
                        transition-all duration-200
                        ${errors.password2 ? "border-red-r30" : ""}
                        focus-within:border-forest-f40
                      `}
                    >
                      <input
                        type={showPassword2 ? "text" : "password"}
                        name="password2"
                        value={password2}
                        onChange={(e) => {
                          setPassword2(e.target.value);
                          if (errors.password2) {
                            setErrors((prev) => ({
                              ...prev,
                              password2: undefined,
                            }));
                          }
                        }}
                        required
                        placeholder="Confirm new password"
                        className="flex-1 h-5 bg-transparent text-sm text-neutral-n1000 placeholder:text-[#bfbfbf] focus:outline-none font-poppins font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword2(!showPassword2)}
                        className="flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label={showPassword2 ? "Hide password" : "Show password"}
                      >
                        {showPassword2 ? (
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L3 3m0 0l18 18m-9.88-9.88L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password2 && (
                      <p className="self-stretch text-h700 text-red-600 font-poppins">
                        {errors.password2}
                      </p>
                    )}
                  </div>
                </div>

                {/* Save Password Button */}
                <div className="flex justify-start">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`
                      bg-forest-f40
                      hover:bg-forest-f50
                      active:bg-forest-f60
                      font-semibold 
                      text-sm
                      px-4 py-2.5
                      rounded-lg
                      focus:outline-none focus:ring-1 focus:ring-forest-f40 focus:ring-offset-1
                      transition-all duration-200
                      cursor-pointer
                      disabled:opacity-50 
                      disabled:cursor-not-allowed
                      inline-flex justify-center items-center gap-2
                      shadow-sm hover:shadow-md active:shadow-sm
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2" style={{ color: "#FFFFFF" }}>
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span style={{ color: "#FFFFFF" }}>
                        Save password
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

