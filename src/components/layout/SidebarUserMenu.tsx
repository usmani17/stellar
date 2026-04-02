import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getInitialColor } from "../../lib/initials";
import { cn } from "../../lib/cn";

/**
 * User avatar + Profile / Logout — lives at the bottom of the main app sidebar so it
 * appears on every page that renders {@link Sidebar}, not only when a page also mounts
 * {@link DashboardHeader} or {@link AccountsHeader}.
 */
export const SidebarUserMenu: React.FC<{ isCollapsed?: boolean }> = ({
  isCollapsed = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const letter = (user?.first_name?.[0] || "U").toUpperCase();

  return (
    <div
      ref={ref}
      className={cn("relative", isCollapsed && "flex justify-center")}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold border border-[#e8e8e3] shadow-sm transition-opacity hover:opacity-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-f40 focus-visible:ring-offset-2",
        )}
        style={{ backgroundColor: getInitialColor(letter) }}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {letter}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[60] w-48 bg-[#FEFEFB] border border-[#e8e8e3] rounded-lg shadow-lg",
            isCollapsed
              ? "left-full bottom-0 ml-2"
              : "bottom-full left-0 mb-2",
          )}
          role="menu"
        >
          <div className="p-2">
            <div className="px-3 py-2 text-[12.32px] text-[#313850] border-b border-gray-100">
              <div className="font-medium">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-[10.56px] text-[#556179] mt-1 break-all">
                {user?.email}
              </div>
              {user?.role && (
                <div className="text-[10.56px] text-[#556179] mt-0.5 capitalize">
                  {user.role}
                </div>
              )}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
            >
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                logout();
              }}
              className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
