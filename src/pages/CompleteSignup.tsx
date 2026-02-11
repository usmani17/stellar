import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth";
import {
  AuthPageLayout,
  AuthHeader,
  AuthFormField,
  AuthButton,
  Alert,
  Dropdown,
} from "../components/ui";

export const CompleteSignup: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    workspace_name: "",
    role: "",
    team_size: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already has workspace, go to brands
  useEffect(() => {
    if (!authLoading && user?.workspace) {
      navigate("/brands", { replace: true });
    }
  }, [authLoading, user?.workspace, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.workspace_name.trim()) {
      setError("Workspace name is required.");
      return;
    }
    setLoading(true);
    try {
      const { user: updatedUser } = await authService.completeSignup({
        workspace_name: formData.workspace_name.trim(),
        role: formData.role || undefined,
        team_size: formData.team_size || undefined,
      });
      updateUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      navigate("/brands", { replace: true });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.workspace_name?.[0] ??
        err.response?.data?.error ??
        "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && user.workspace)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
        <div className="text-forest-f60 text-h900">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <AuthPageLayout showGetStarted={false}>
      <div className="flex flex-col gap-16 w-full">
        <div className="flex flex-col gap-4">
          <AuthHeader
            title="Complete your account"
            description="Add your workspace details to get started."
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          <div className="flex flex-col gap-5">
            {error && <Alert variant="error">{error}</Alert>}

            <AuthFormField
              label="Workspace Name"
              type="text"
              name="workspace_name"
              value={formData.workspace_name}
              onChange={handleChange}
              required
              placeholder="Enter your organization name"
            />

            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 w-full">
              <label className="justify-center text-black text-base font-medium leading-5 font-poppins pb-1">
                What best describes your role
              </label>
              <Dropdown
                options={[
                  { value: "Founder/CEO", label: "Founder/CEO" },
                  { value: "Marketing Manager", label: "Marketing Manager" },
                  { value: "Media Buyer", label: "Media Buyer" },
                  { value: "Agency", label: "Agency" },
                  { value: "Other", label: "Other" },
                ]}
                value={formData.role || undefined}
                placeholder="Select your role"
                onChange={handleRoleChange}
                buttonClassName="w-full !h-12 min-h-[3rem] px-3 py-2 bg-[#FEFEFB] !rounded-xl border border-sandstorm-s40 text-sm text-neutral-n1000 font-poppins justify-between"
              />
            </div>

            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 w-full">
              <label className="justify-center text-black text-base font-medium leading-5 font-poppins pb-1">
                Team Size
              </label>
              <div className="flex flex-nowrap gap-0 rounded-xl border border-sandstorm-s40 overflow-hidden bg-[#FEFEFB] w-full">
                {[
                  { value: "1-50", label: "1-50" },
                  { value: "50-100", label: "50-100" },
                  { value: "100-500", label: "100-500" },
                  { value: "500+", label: "500+" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex-shrink-0 px-4 py-3 cursor-pointer text-center text-sm font-poppins transition-colors whitespace-nowrap ${
                      formData.team_size === opt.value
                        ? "bg-forest-f60 text-white"
                        : "text-neutral-n1000 hover:bg-sandstorm-s20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="team_size"
                      value={opt.value}
                      checked={formData.team_size === opt.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center w-full">
            <AuthButton loading={loading} loadingText="Creating workspace...">
              Create workspace
            </AuthButton>
          </div>
        </form>
      </div>
    </AuthPageLayout>
  );
};
