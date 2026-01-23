import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';

export const PasswordUpdateBanner: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; password2?: string; submit?: string }>({});
  const [loading, setLoading] = useState(false);

  // Only show banner if user has unusable password
  if (!user || !user.has_unusable_password) {
    return null;
  }

  const validate = () => {
    const newErrors: { password?: string; password2?: string; submit?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!password2) {
      newErrors.password2 = 'Please confirm your password';
    } else if (password !== password2) {
      newErrors.password2 = 'Passwords do not match';
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
      
      // Close modal and reset form
      setShowModal(false);
      setPassword('');
      setPassword2('');
      setShowPassword(false);
      setShowPassword2(false);
      setErrors({});
    } catch (err: any) {
      console.error('Failed to update password:', err);
      
      // Extract error messages
      const errorMessage = err?.response?.data?.new_password?.[0] || 
                          err?.response?.data?.error || 
                          err?.response?.data?.message ||
                          'Failed to update password. Please try again.';
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setShowModal(false);
      setPassword('');
      setPassword2('');
      setShowPassword(false);
      setShowPassword2(false);
      setErrors({});
    }
  };

  return (
    <>
      {/* Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          <div className="flex items-center">
            {user?.has_unusable_password && (
              <>
                <svg
                  className="h-5 w-5 text-yellow-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-yellow-800">
                  <strong>Action Required:</strong> Please update your password to secure your account.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
            {/* Form Container - matching CreateCampaignPanel style */}
            <div className="border border-gray-200 rounded-xl shadow-sm bg-[#f9f9f6] m-4">
              <form onSubmit={handleSubmit}>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] font-semibold text-[#072929]">
                      Update Password
                    </h2>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={loading}
                      aria-label="Close"
                    >
                      <svg
                        className="w-5 h-5 text-[#556179]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Validation Errors Banner */}
                  {(errors.password || errors.password2 || errors.submit) && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-[13px] font-semibold text-red-600 mb-2">
                        Please fix the following errors:
                      </p>
                      <ul className="list-disc list-inside text-[12px] text-red-600 space-y-1">
                        {errors.password && <li>{errors.password}</li>}
                        {errors.password2 && <li>{errors.password2}</li>}
                        {errors.submit && <li>{errors.submit}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Password Field */}
                    <div>
                      <label className="form-label-small">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) {
                              setErrors((prev) => ({ ...prev, password: undefined }));
                            }
                          }}
                          placeholder="Enter new password"
                          className={`campaign-input bg-white w-full px-4 py-2.5 pr-10 border rounded-lg text-[13.44px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                            errors.password ? "border-red-500" : "border-gray-200"
                          }`}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors"
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
                        <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label className="form-label-small">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword2 ? "text" : "password"}
                          value={password2}
                          onChange={(e) => {
                            setPassword2(e.target.value);
                            if (errors.password2) {
                              setErrors((prev) => ({ ...prev, password2: undefined }));
                            }
                          }}
                          placeholder="Confirm new password"
                          className={`campaign-input bg-white w-full px-4 py-2.5 pr-10 border rounded-lg text-[13.44px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                            errors.password2 ? "border-red-500" : "border-gray-200"
                          }`}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword2(!showPassword2)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors"
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
                        <p className="text-[10px] text-red-500 mt-1">{errors.password2}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-[13.3px] font-medium text-[#556179] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-[13.3px] font-medium text-white bg-[#136D6D] rounded-lg hover:bg-[#0f5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#136D6D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                        Updating...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
