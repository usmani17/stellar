import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";

export const AccountProfiles: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const account = accountIdNum
    ? accounts.find((a) => a.id === accountIdNum)
    : null;

  useEffect(() => {
    setPageTitle("Profiles");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
    }
  }, [accountIdNum, navigate]);

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="p-8 bg-white">
          <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal] mb-6">
            {account ? `${account.name} – Profiles` : "Profiles"}
          </h1>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[24px] sm:text-[28px] font-medium text-[#072929] mb-2">
              Coming Soon
            </p>
            <p className="text-[14px] text-[#556179] max-w-md">
              Profile management for this brand is under development. Check back
              later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
