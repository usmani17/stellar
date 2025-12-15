import React, { type ReactNode } from "react";
import { Link } from "react-router-dom";
import googleIcon from "../../assets/images/google-white.svg";
import walmartIcon from "../../assets/images/walmart-white.svg";
import criteoIcon from "../../assets/images/criteo-white.svg";
import instacartIcon from "../../assets/images/instacart-white.svg";
import amazonIcon from "../../assets/images/amazon-white.svg";
import authDashboard1 from "../../assets/images/auth-dashboard-1.svg";
import authDashboard2 from "../../assets/images/auth-dashboard-2.svg";

interface AuthSidebarProps {
  children?: ReactNode;
  showGetStarted?: boolean;
}

export const AuthSidebar: React.FC<AuthSidebarProps> = ({
  children,
  showGetStarted = false,
}) => {
  return (
    <div className="hidden lg:flex w-full lg:w-[720px] h-screen relative overflow-hidden bg-[#062c2c]">
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#0d4747]" />
        <div
          className="absolute w-[900px] h-[900px] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 40% 20%, #25D3D3 0%, #136D6D 45%, #0B4141 80%, #0B4141 100%)",
            left: "-120px",
            top: "-140px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-16 px-16 py-20 w-full">
        <div className="w-full max-w-[620px] flex flex-col gap-8">
          {showGetStarted && (
            <Link
              to="/signup"
              className="px-6 py-3 bg-white/10 border border-white/15 rounded-full backdrop-blur inline-flex justify-center items-center gap-2.5 self-start transition-opacity hover:opacity-90"
            >
              <span className="text-white text-base font-semibold leading-6">
                Get Started
              </span>
            </Link>
          )}

          {children || (
            <div className="flex flex-col gap-8">
              <h2 className="text-white text-[28px] sm:text-[32px] font-semibold leading-tight">
                Know your numbers.
                <br />
                Grow with clarity
              </h2>
              <p className="text-white text-lg leading-7 opacity-90">
                A simple dashboard to keep an eye on your sales, customers, and
                growth in one place.
              </p>

              {/* Platform badges with icons */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <PlatformChip icon={googleIcon} label="Google" />
                  <PlatformChip icon={walmartIcon} label="Walmart" />
                  <PlatformChip icon={instacartIcon} label="Instacart" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <PlatformChip icon={criteoIcon} label="Criteo" />
                  <PlatformChip icon={amazonIcon} label="Amazon" />
                </div>
              </div>

              {/* Dashboard previews */}
              <div className="relative mt-6">
                <img
                  src={authDashboard1}
                  alt="Dashboard preview 1"
                  className="w-full max-w-[520px] rounded-[16px] border border-white/10 shadow-2xl ml-auto block"
                />
                <img
                  src={authDashboard2}
                  alt="Dashboard preview 2"
                  className="absolute left-8 -bottom-10 w-[220px] rounded-[12px] border border-white/10 shadow-2xl backdrop-blur"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlatformChip: React.FC<{ icon: string; label: string }> = ({
  icon,
  label,
}) => (
  <div className="px-4 py-2 bg-white/10 border border-white/15 rounded-full backdrop-blur flex items-center gap-2">
    <img src={icon} alt={label} className="w-5 h-5" />
    <span className="text-white text-sm font-medium leading-5">{label}</span>
  </div>
);
