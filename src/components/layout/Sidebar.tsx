import React from "react";
import {
  getCurrentAccountId,
  buildMarketplaceRoute,
} from "../../utils/urlHelpers";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import StellarLogo from "../../assets/images/stellar-logo-v2 1.svg";
import InstacartIcon from "../../assets/images/cib_instacart.svg";
import CreateCampaignIcon from "../../assets/images/ri_amazon-fill.svg";
import CampaignIcon from "../../assets/images/campaign-svgrepo-com 1.svg";
import CampaignIconRegular from "../../assets/images/campaign.svg";
import CampaignWhiteIcon from "../../assets/campaign-white.svg";
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
  const navigate = useNavigate();
  const accountId = getCurrentAccountId(location.pathname);
  const { isCollapsed, toggleSidebar, sidebarWidth } = useSidebar();

  const isActive = (path: string) => {
    if (path === "/campaigns") {
      return location.pathname.includes("/campaigns");
    }
    return location.pathname === path;
  };

  const handleAccountRequiredClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    buildRoute: () => string | null
  ) => {
    if (!accountId) {
      e.preventDefault();
      const route = buildRoute();
      if (route) {
        navigate(`/accounts?returnUrl=${encodeURIComponent(route)}`);
      } else {
        navigate("/accounts");
      }
    }
  };

  return (
    <div
      className="sidebar-nav border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto bg-sandstorm-s20 transition-all duration-300"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="p-4">
        {/* Logo and Toggle Button */}
        <div className="mb-8 flex items-center gap-3 justify-between">
          {!isCollapsed && (
            <img
              src={StellarLogo}
              alt="Stellar Logo"
              className="h-[30px] w-auto"
            />
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Accounts Section */}
        <div className="mb-6">
          <div className="space-y-1">
            <Link
              to="/accounts"
              className={`flex items-center p-2 rounded-xl transition-colors ${
                isCollapsed ? "justify-center" : "gap-2"
              } ${
                isActive("/accounts")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent"
              }`}
              title={isCollapsed ? "Accounts" : undefined}
            >
              {isCollapsed ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              ) : (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Accounts
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Dashboards Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
              Dashboards
            </h2>
          )}
          <div className="space-y-1">
            <Link
              to="/dashboards"
              className={`flex items-center p-2 rounded-xl transition-colors ${
                isCollapsed ? "justify-center" : "gap-2"
              } ${
                isActive("/dashboards")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent"
              }`}
              title={isCollapsed ? "Overview" : undefined}
            >
              <img
                src={InstacartIcon}
                alt=""
                className={`w-5 h-5 ${
                  isActive("/dashboards") ? "brightness-0 invert" : ""
                }`}
              />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Overview
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Amazon Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
              Amazon
            </h2>
          )}
          <div className="space-y-1">
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Create Campaign" : undefined}
            >
              <img src={CreateCampaignIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Create Campaign
                </span>
              )}
            </Link>
            <Link
              to={
                accountId
                  ? buildMarketplaceRoute(accountId, "amazon", "campaigns")
                  : "/accounts"
              }
              onClick={(e) =>
                handleAccountRequiredClick(e, () =>
                  accountId
                    ? buildMarketplaceRoute(accountId, "amazon", "campaigns")
                    : "/accounts/1/amazon/campaigns"
                )
              }
              className={`flex items-center p-2 rounded-xl transition-colors ${
                isCollapsed ? "justify-center" : "gap-2"
              } ${
                isActive("/campaigns")
                  ? "w-full bg-forest-f60 text-white"
                  : "text-black hover:bg-transparent hover:text-[#136D6D]"
              }`}
              title={isCollapsed ? "Campaigns" : undefined}
            >
              <img
                src={
                  isActive("/campaigns")
                    ? CampaignWhiteIcon
                    : CampaignIconRegular
                }
                alt=""
                className="w-5 h-5"
              />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Campaigns
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Ad Groups" : undefined}
            >
              <img src={AdGroupIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Ad Groups
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Product Target" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Product Target
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Analytics" : undefined}
            >
              <img src={GoogleIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Analytics
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Blueprints" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Blueprints
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Settings" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Settings
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Marketing Channels Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
              Marketing Channels
            </h2>
          )}
          <div className="space-y-1">
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Google" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Google
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Meta" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Meta
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Walmart" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Walmart
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Instacart" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Instacart
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Criteo" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Criteo
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Overview Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">
              Overview
            </h2>
          )}
          <div className="space-y-1">
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Trend Chart" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Trend Chart
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "KPI Cards" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  KPI Cards
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Top Keywords" : undefined}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Top Keywords
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Top Products" : undefined}
            >
              <img src={TopKeywordsIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Top Products
                </span>
              )}
            </Link>
            <Link
              to="/channels"
              className={`flex items-center p-2 rounded-xl transition-colors text-black hover:bg-transparent ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
              title={isCollapsed ? "Pixels-Like Box" : undefined}
            >
              <img src={TopProductsIcon} alt="" className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-[12.32px] font-normal leading-[16px]">
                  Pixels-Like Box
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
