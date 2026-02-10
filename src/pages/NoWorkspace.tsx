import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthPageLayout } from "../components/ui";

export const NoWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AuthPageLayout>
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-semibold text-forest-f60 mb-4">
          No workspace assigned
        </h1>
        <p className="text-forest-f40 mb-6">
          You're not assigned to any workspace yet. Contact your administrator to
          receive an invite, or sign up with a new workspace.
        </p>
        <div className="flex flex-col gap-3">
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-forest-f60 text-white rounded-lg hover:bg-forest-f50 transition-colors"
            >
              Sign out
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-forest-f60 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    </AuthPageLayout>
  );
};
