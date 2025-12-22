import React, { useState, useEffect } from "react";
import {
  getCurrentAccountId,
  buildMarketplaceRoute,
  getMarketplaceFromUrl,
} from "../../utils/urlHelpers";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import StellarLogo from "../../assets/images/stellar-logo-v2 1.svg";
import InstacartIcon from "../../assets/images/cib_instacart.svg";
import CampaignIcon from "../../assets/images/campaign-svgrepo-com 1.svg";
import CampaignIconRegular from "../../assets/images/campaign.svg";
import CampaignWhiteIcon from "../../assets/campaign-white.svg";
import AdGroupIcon from "../../assets/images/adgroups.svg";
import BlueprintsIcon from "../../assets/images/ph_fingerprint-fill.svg";
import SettingsIcon from "../../assets/images/settings.svg";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import WalmartIcon from "../../assets/images/cbi_walmart.svg";
import TopKeywordsIcon from "../../assets/images/cbi_walmart.svg";
import TopProductsIcon from "../../assets/images/cib_instacart.svg";
import PixelsLikeBoxIcon from "../../assets/images/cib_instacart.svg";
import ProductTargetIcon from "../../assets/images/producttarget.svg";

const AMAZON_SECTION_STORAGE_KEY = "amazon-section-collapsed";
const GOOGLE_SECTION_STORAGE_KEY = "google-section-collapsed";
const MARKETING_CHANNELS_SECTION_STORAGE_KEY =
  "marketing-channels-section-collapsed";
const OVERVIEW_SECTION_STORAGE_KEY = "overview-section-collapsed";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const accountId = getCurrentAccountId(location.pathname);
  const { isCollapsed, toggleSidebar, sidebarWidth } = useSidebar();
  const [isAmazonSectionCollapsed, setIsAmazonSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(AMAZON_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });
  const [isGoogleSectionCollapsed, setIsGoogleSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(GOOGLE_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });
  const [
    isMarketingChannelsSectionCollapsed,
    setIsMarketingChannelsSectionCollapsed,
  ] = useState<boolean>(() => {
    const saved = localStorage.getItem(MARKETING_CHANNELS_SECTION_STORAGE_KEY);
    return saved === "true" || saved === null; // Default to collapsed
  });
  const [isOverviewSectionCollapsed, setIsOverviewSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(OVERVIEW_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });

  // Auto-expand/collapse sections based on current page
  useEffect(() => {
    const marketplace = getMarketplaceFromUrl(location.pathname);

    // If on accounts page, collapse all sections
    if (location.pathname === "/accounts") {
      setIsAmazonSectionCollapsed(true);
      setIsGoogleSectionCollapsed(true);
      setIsMarketingChannelsSectionCollapsed(true);
      setIsOverviewSectionCollapsed(true);
    } else {
      // Auto-expand the relevant marketplace section when on that page
      if (marketplace === "amazon") {
        setIsAmazonSectionCollapsed(false);
      } else if (marketplace === "google") {
        setIsGoogleSectionCollapsed(false);
      }
      // Marketing Channels and Overview don't have marketplace-specific routes
      // so they stay in their saved state
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(
      AMAZON_SECTION_STORAGE_KEY,
      String(isAmazonSectionCollapsed)
    );
  }, [isAmazonSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      GOOGLE_SECTION_STORAGE_KEY,
      String(isGoogleSectionCollapsed)
    );
  }, [isGoogleSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      MARKETING_CHANNELS_SECTION_STORAGE_KEY,
      String(isMarketingChannelsSectionCollapsed)
    );
  }, [isMarketingChannelsSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      OVERVIEW_SECTION_STORAGE_KEY,
      String(isOverviewSectionCollapsed)
    );
  }, [isOverviewSectionCollapsed]);

  const toggleAmazonSection = () => {
    setIsAmazonSectionCollapsed((prev) => !prev);
  };

  const toggleGoogleSection = () => {
    setIsGoogleSectionCollapsed((prev) => !prev);
  };

  const toggleMarketingChannelsSection = () => {
    setIsMarketingChannelsSectionCollapsed((prev) => !prev);
  };

  const toggleOverviewSection = () => {
    setIsOverviewSectionCollapsed((prev) => !prev);
  };

  const isActive = (path: string) => {
    if (path === "/campaigns") {
      return (
        location.pathname.includes("/campaigns") &&
        !location.pathname.includes("/google")
      );
    }
    if (path === "/google/campaigns") {
      return location.pathname.includes("/google/campaigns");
    }
    if (path === "/google/adgroups") {
      return location.pathname.includes("/google/adgroups");
    }
    if (path === "/google/keywords") {
      return location.pathname.includes("/google/keywords");
    }
    if (path === "/google/ads") {
      return location.pathname.includes("/google/ads");
    }
    if (path === "/adgroups") {
      return location.pathname.includes("/adgroups");
    }
    if (path === "/keywords") {
      return location.pathname.includes("/keywords");
    }
    if (path === "/targets") {
      return location.pathname.includes("/targets");
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
              className={`flex items-center p-2 rounded-xl ${
                isActive("/accounts") ? "" : "transition-colors"
              } ${isCollapsed ? "justify-center" : "gap-2"} ${
                isActive("/accounts")
                  ? "w-full bg-forest-f60 !text-white hover:!text-white"
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
                <span
                  className={`text-[12.32px] font-normal leading-[16px] ${
                    isActive("/accounts") ? "!text-white" : ""
                  }`}
                >
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
              className={`flex items-center p-2 rounded-xl ${
                isActive("/dashboards") ? "" : "transition-colors"
              } ${isCollapsed ? "justify-center" : "gap-2"} ${
                isActive("/dashboards")
                  ? "w-full bg-forest-f60 !text-white hover:!text-white"
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
                <span
                  className={`text-[12.32px] font-normal leading-[16px] ${
                    isActive("/dashboards") ? "!text-white" : ""
                  }`}
                >
                  Overview
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Amazon Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                Amazon
              </h2>
              <button
                onClick={toggleAmazonSection}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={
                  isAmazonSectionCollapsed
                    ? "Expand Amazon section"
                    : "Collapse Amazon section"
                }
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isAmazonSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}
          {(isCollapsed || !isAmazonSectionCollapsed) && (
            <div className="space-y-1">
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
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/campaigns") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/campaigns")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
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
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/campaigns") ? "!text-white" : ""
                    }`}
                  >
                    Campaigns
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "amazon", "adgroups")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "amazon", "adgroups")
                      : "/accounts/1/amazon/adgroups"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/adgroups") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/adgroups")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Ad Groups" : undefined}
              >
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/adgroups") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/adgroups") ? "!text-white" : ""
                    }`}
                  >
                    Ad Groups
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "amazon", "keywords")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "amazon", "keywords")
                      : "/accounts/1/amazon/keywords"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/keywords") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/keywords")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Keywords" : undefined}
              >
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/keywords") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/keywords") ? "!text-white" : ""
                    }`}
                  >
                    Keywords
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "amazon", "targets")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "amazon", "targets")
                      : "/accounts/1/amazon/targets"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/targets") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/targets")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Targets" : undefined}
              >
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/targets") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/targets") ? "!text-white" : ""
                    }`}
                  >
                    Targets
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
          )}
        </div>

        {/* Google Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                Google
              </h2>
              <button
                onClick={toggleGoogleSection}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={
                  isGoogleSectionCollapsed
                    ? "Expand Google section"
                    : "Collapse Google section"
                }
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isGoogleSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}
          {(isCollapsed || !isGoogleSectionCollapsed) && (
            <div className="space-y-1">
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "google", "campaigns")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "google", "campaigns")
                      : "/accounts/1/google/campaigns"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/google/campaigns") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/google/campaigns")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Campaign" : undefined}
              >
                <img
                  src={
                    isActive("/google/campaigns")
                      ? CampaignWhiteIcon
                      : CampaignIconRegular
                  }
                  alt=""
                  className="w-5 h-5"
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/google/campaigns") ? "!text-white" : ""
                    }`}
                  >
                    Campaign
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "google", "adgroups")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "google", "adgroups")
                      : "/accounts/1/google/adgroups"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/google/adgroups") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/google/adgroups")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Ad Group" : undefined}
              >
                <img src={AdGroupIcon} alt="" className="w-5 h-5" />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/google/adgroups") ? "!text-white" : ""
                    }`}
                  >
                    Ad Group
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "google", "keywords")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "google", "keywords")
                      : "/accounts/1/google/keywords"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/google/keywords") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/google/keywords")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Keyword" : undefined}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/google/keywords") ? "!text-white" : ""
                    }`}
                  >
                    Keyword
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, "google", "ads")
                    : "/accounts"
                }
                onClick={(e) =>
                  handleAccountRequiredClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, "google", "ads")
                      : "/accounts/1/google/ads"
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/google/ads") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/google/ads")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Ads" : undefined}
              >
                <img src={ProductTargetIcon} alt="" className="w-5 h-5" />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/google/ads") ? "!text-white" : ""
                    }`}
                  >
                    Ads
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Marketing Channels Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                Marketing Channels
              </h2>
              <button
                onClick={toggleMarketingChannelsSection}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={
                  isMarketingChannelsSectionCollapsed
                    ? "Expand Marketing Channels section"
                    : "Collapse Marketing Channels section"
                }
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isMarketingChannelsSectionCollapsed
                      ? "rotate-[-90deg]"
                      : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}
          {(isCollapsed || !isMarketingChannelsSectionCollapsed) && (
            <div className="space-y-1">
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
          )}
        </div>

        {/* Overview Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                Overview
              </h2>
              <button
                onClick={toggleOverviewSection}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={
                  isOverviewSectionCollapsed
                    ? "Expand Overview section"
                    : "Collapse Overview section"
                }
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isOverviewSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          )}
          {(isCollapsed || !isOverviewSectionCollapsed) && (
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
          )}
        </div>
      </div>
    </div>
  );
};
