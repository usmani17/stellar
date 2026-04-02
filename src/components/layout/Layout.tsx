import React from "react";
import { PasswordUpdateBanner } from "../auth/PasswordUpdateBanner";
import { VerifyEmailBanner } from "../auth/VerifyEmailBanner";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui";
import { superAdminService } from "../../services/superAdmin";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { impersonatedWorkspace, setImpersonatedWorkspace, setActiveWorkspaceId } =
    useAuth();

  const handleExitImpersonation = async () => {
    try {
      await superAdminService.exitImpersonation();
    } catch {
      // Ignore errors, this is best-effort
    }
    setImpersonatedWorkspace(null);
    // Let workspace selection fall back to user's default; do not force-change here
    setActiveWorkspaceId(0 as unknown as number);
  };

  return (
    <div className="min-h-screen bg-white">
      <PasswordUpdateBanner />
      <VerifyEmailBanner />
      {impersonatedWorkspace && (
        <div className="bg-red-r0 text-red-r30 text-[13px] py-2 px-4 flex items-center justify-between">
          <span>
            You are viewing workspace "{impersonatedWorkspace.name}" as a super
            admin.
          </span>
          <Button size="sm" variant="outline" onClick={handleExitImpersonation}>
            Exit impersonation
          </Button>
        </div>
      )}
      <main>{children}</main>
    </div>
  );
};

