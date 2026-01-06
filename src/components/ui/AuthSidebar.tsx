import React, { type ReactNode } from "react";
import { Link } from "react-router-dom";
import googleIcon from "../../assets/images/google-white.svg";
import walmartIcon from "../../assets/images/walmart-white.svg";
import criteoIcon from "../../assets/images/criteo-white.svg";
import instacartIcon from "../../assets/images/instacart-white.svg";
import amazonIcon from "../../assets/images/amazon-white.svg";
import topStats from "../../assets/images/top-stats.svg";
import bottomImage from "../../assets/images/bottom.svg";

interface AuthSidebarProps {
  children?: ReactNode;
  showGetStarted?: boolean;
}

export const AuthSidebar: React.FC<AuthSidebarProps> = ({
  children,
  showGetStarted = false,
}) => {
  return (
    <div className="hidden lg:flex w-full lg:w-[720px] h-screen relative overflow-hidden bg-forest-f60">
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-start gap-14 px-16 py-28 w-full">
        <div className="w-[590px] flex flex-col justify-start items-start gap-4">
          {showGetStarted && (
            <Link
              to="/signup"
              className="px-6 py-3 bg-white/20 rounded-3xl backdrop-blur inline-flex justify-center items-center gap-2.5 self-start transition-opacity hover:opacity-90"
            >
              <span className="text-sandstorm-s0 text-base font-normal">
                Get Started
              </span>
            </Link>
          )}

          {children || (
            <div className="self-stretch flex flex-col justify-start items-start gap-8">
              {/* Text Section */}
              <div className="self-stretch flex flex-col justify-start items-start gap-3">
                <div className="self-stretch justify-end text-sandstorm-s0 text-4xl font-bold font-gtAmerica leading-[52px] tracking-tight">
                  Know your numbers.
                  <br />
                  Grow with clarity
                </div>
                <div className="self-stretch justify-end text-sandstorm-s0 text-2xl font-normal font-gtAmerica">
                  A simple dashboard to keep an eye on your sales, customers, and growth in one place.
                </div>
              </div>

              {/* Platform badges with icons */}
              <div className="self-stretch inline-flex justify-start items-start gap-5 flex-wrap content-start">
                <div className="flex-1 flex justify-start items-center gap-5 flex-wrap content-center">
                  <PlatformChip icon={googleIcon} label="Goolge" />
                  <PlatformChip icon={walmartIcon} label="Walmart" />
                  <PlatformChip icon={instacartIcon} label="Instacart" />
                  <PlatformChip icon={criteoIcon} label="Criteo" />
                  <PlatformChip icon={amazonIcon} label="Amazon" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard preview section with stacked images */}
        <div className="relative w-full">
          {/* Top stats dashboard image */}
          <img
            src={topStats}
            alt="Dashboard stats preview"
            className="w-full"
            style={{ height: '350px', marginLeft: '85px' }}
          />

          {/* Bottom image positioned absolutely */}
          <img
            src={bottomImage}
            alt="Dashboard bottom preview"
            className="w-56 h-36 rounded-xl absolute"
            style={{ bottom: '-22px', left: '100px' }}
          />
        </div>
      </div>
    </div>
  );
};

const PlatformChip: React.FC<{ icon: string; label: string }> = ({
  icon,
  label,
}) => (
  <div className="w-36 px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
    <div className="w-5 h-5 relative">
      <img src={icon} alt={label} className="w-5 h-5" />
    </div>
    <div className="justify-end text-sandstorm-s0 text-base font-normal font-gtAmerica">
      {label}
    </div>
  </div>
);
