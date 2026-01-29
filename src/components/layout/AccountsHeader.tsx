import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const AccountsHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    // Do not navigate here: logout() clears state and does window.location.href to /login or Auth0.
    // Navigating to /login before logout completes would trigger PublicRoute to redirect to /brands.
  };

  return (
    <>
      <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
        {/* Left: reserved for future breadcrumbs / title if needed */}
        <div className="flex items-center gap-6" />
      </div>

      {/* Profile icon - fixed bottom left (same as DashboardHeader) */}
      <div className="fixed bottom-6 left-6 z-50" ref={profileDropdownRef}>
        <button
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className="w-8 h-8 rounded-full bg-[#FEFEFB] border border-gray-200 flex items-center justify-center text-gray-600 text-[12.32px] font-semibold hover:bg-gray-50 transition-colors"
        >
          {user?.first_name?.[0] || "U"}
        </button>

        {isProfileDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-[12.32px] text-[#313850] border-b border-gray-100">
                <div className="font-medium">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-[10.56px] text-[#556179] mt-1">
                  {user?.email}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  navigate("/profile");
                }}
                className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
