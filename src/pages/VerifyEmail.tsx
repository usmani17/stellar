import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import {
  AuthPageLayout,
  AuthHeader,
  AuthButton,
  Alert,
} from "../components/ui";

export const VerifyEmail: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const hasVerified = useRef(false);

  // Auto-verify when user lands on the page with valid uid and token
  useEffect(() => {
    if (!uid || !token || hasVerified.current || loading || message) return;
    hasVerified.current = true;
    setLoading(true);
    authService
      .verifyEmail(uid, token)
      .then(() => {
        setMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      })
      .catch((err: any) => {
        setError(
          err.response?.data?.error || "Verification failed. The link may have expired."
        );
        hasVerified.current = false;
      })
      .finally(() => setLoading(false));
  }, [uid, token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!uid || !token) {
      setError("Invalid verification link. Please use the link from your email.");
      return;
    }

    setLoading(true);

    try {
      await authService.verifyEmail(uid, token);
      setMessage("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Verification failed. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout showGetStarted={false}>
      <div className="flex flex-col gap-16 w-full">
        <div className="flex flex-col gap-4">
          <AuthHeader
            title="Verify your email"
            description="Click the button below to verify your email and activate your workspace."
          />
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-8 w-full">
          <div className="flex flex-col gap-5">
            {error && <Alert variant="error">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
          </div>

          <div className="flex flex-col items-center w-full">
            <AuthButton
              loading={loading}
              loadingText="Verifying..."
              disabled={!!message}
            >
              Verify email
            </AuthButton>
          </div>
        </form>
      </div>
    </AuthPageLayout>
  );
};
