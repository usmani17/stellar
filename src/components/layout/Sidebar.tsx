import React from "react";
import { Link, useLocation } from "react-router-dom";
import StellarLogo from "../../assets/images/stellar-logo-v2 1.svg";
import InstacartIcon from "../../assets/images/cib_instacart.svg";
import CreateCampaignIcon from "../../assets/images/ri_amazon-fill.svg";
import CampaignIcon from "../../assets/images/campaign-svgrepo-com 1.svg";
import AdGroupIcon from "../../assets/images/adgroups.svg";
import ProductTargetIcon from "../../assets/images/producttarget.svg";
import AnalyticsIcon from "../../assets/images/majesticons_analytics.svg";
import BlueprintsIcon from "../../assets/images/ph_fingerprint-fill.svg";
import SettingsIcon from "../../assets/images/settings.svg";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import WalmartIcon from "../../assets/images/cbi_walmart.svg";
import TopKeywordsIcon from "../../assets/images/cbi_walmart.svg";
import TopProductsIcon from "../../assets/images/cib_instacart.svg";
import PixelsLikeBoxIcon from "../../assets/images/cib_instacart.svg";

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/campaigns") {
      return location.pathname.includes("/campaigns");
    }
    return location.pathname === path;
  };

  return (
    <div className="sidebar-nav w-[272px] border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto bg-sandstorm-s20">
      <div className="p-4">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <img
            src={StellarLogo}
            alt="Stellar Logo"
            className="h-[30px] w-auto"
          />
        </div>

        {/* Accounts Section */}
        <div className="mb-6">
          <div className="space-y-1">
            <Link
              to="/accounts"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive("/accounts")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent"
              }`}
            >
              <span className="text-[11.2px] font-normal leading-[16px]">
                Accounts
              </span>
            </Link>
          </div>
        </div>

        {/* Dashboards Section */}
        <div className="mb-6">
          <h2 className="text-[11.2px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
            Dashboards
          </h2>
          <div className="space-y-1">
            <Link
              to="/dashboards"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive("/dashboards")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent"
              }`}
            >
              <img
                src={InstacartIcon}
                alt=""
                className={`w-5 h-5 ${
                  isActive("/dashboards") ? "brightness-0 invert" : ""
                }`}
              />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Overview
              </span>
            </Link>
          </div>
        </div>

        {/* Amazon Section */}
        <div className="mb-6">
          <h2 className="text-[11.2px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
            Amazon
          </h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={CreateCampaignIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Create Campaign
              </span>
            </Link>
            <Link
              to="/accounts"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive("/campaigns")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent"
              }`}
            >
              <img
                src={CreateCampaignIcon}
                alt=""
                className={`w-5 h-5 ${
                  isActive("/campaigns") ? "brightness-0 invert" : ""
                }`}
              />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Campaigns
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={AdGroupIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Ad Groups
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Product Target
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={GoogleIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Analytics
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Blueprints
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Settings
              </span>
            </Link>
          </div>
        </div>

        {/* Marketing Channels Section */}
        <div className="mb-6">
          <h2 className="text-[11.2px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
            Marketing Channels
          </h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Google
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Meta
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Walmart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Instacart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Criteo
              </span>
            </Link>
          </div>
        </div>

        {/* Overview Section */}
        <div className="mb-6">
          <h2 className="text-[11.2px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
            Overview
          </h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Trend Chart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                KPI Cards
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Top Keywords
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={TopKeywordsIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Top Products
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl transition-colors text-black hover:bg-transparent"
            >
              <img src={TopProductsIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Pixels-Like Box
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
