import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCurrentAccountId,
  getChannelIdFromUrl,
  buildMarketplaceRoute,
  buildAccountRoute,
  getMarketplaceFromUrl,
} from "../../utils/urlHelpers";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAccounts } from "../../contexts/AccountsContext";
import { useAuth } from "../../contexts/AuthContext";
import { useChannels } from "../../hooks/queries/useChannels";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { SelectBrandRequiredModal } from "../ui/SelectBrandRequiredModal";
import StellarLogo from "../../assets/images/stellar-logo-v2 1.svg";
import InstacartIcon from "../../assets/images/cib_instacart.svg";
import CampaignIcon from "../../assets/images/campaign-svgrepo-com 1.svg";
import CampaignIconRegular from "../../assets/images/campaign.svg";
import CampaignWhiteIcon from "../../assets/campaign-white.svg";
import AdGroupIcon from "../../assets/images/adgroups.svg";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import AmazonIcon from "../../assets/images/ri_amazon-fill-1.svg";
import WalmartIcon from "../../assets/images/cbi_walmart.svg";
import TopKeywordsIcon from "../../assets/images/cbi_walmart.svg";
import TopProductsIcon from "../../assets/images/cib_instacart.svg";
import PixelsLikeBoxIcon from "../../assets/images/cib_instacart.svg";
import ProductTargetIcon from "../../assets/images/producttarget.svg";
import KeywordsIcon from "../../assets/images/keywords.svg";
import KeywordsWhiteIcon from "../../assets/images/keywords-white.svg";
import TargetsIcon from "../../assets/images/targets.svg";
import TargetsWhiteIcon from "../../assets/images/targets-white.svg";
import BrandsIcon from "../../assets/images/brands.svg";
import BrandsActiveIcon from "../../assets/images/brands-active.svg";
import IntegrationsIcon from "../../assets/images/integrations.svg";
import IntegrationsActiveIcon from "../../assets/images/integrations-active.svg";
import ProfilesIcon from "../../assets/images/profiles.svg";
import ProfilesActiveIcon from "../../assets/images/profiles-active.svg";
import UsersIcon from "../../assets/images/users.svg";
import UsersActiveIcon from "../../assets/images/users-active.svg";
import WorkspaceIcon from "../../assets/workspace.svg";
import { GOOGLE_ONLY_UI } from "../../constants/featureFlags";

const WORKSPACE_SECTION_STORAGE_KEY = "workspace-section-collapsed";
const AMAZON_SECTION_STORAGE_KEY = "amazon-section-collapsed";
const GOOGLE_SECTION_STORAGE_KEY = "google-section-collapsed";
const META_SECTION_STORAGE_KEY = "meta-section-collapsed";
const TIKTOK_SECTION_STORAGE_KEY = "tiktok-section-collapsed";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasWorkspace = !!user?.workspace;
  const hasUsersAccess = user?.role !== "team"; // Owner and Manager can see Users tab
  const accountId = getCurrentAccountId(location.pathname);
  const { isCollapsed, toggleSidebar, sidebarWidth } = useSidebar();
  const { accounts, getAccountById } = useAccounts();
  const accountIdNum = accountId !== null ? accountId : undefined;
  const currentAccount = accountIdNum != null ? getAccountById(accountIdNum) : null;
  const { data: channelsFromApi = [] } = useChannels(accountIdNum);
  const channels = currentAccount?.channels?.length
    ? currentAccount.channels
    : channelsFromApi;
  const hasAmazonChannel = channels.some((c) => c.channel_type === "amazon");
  const hasGoogleChannel = channels.some((c) => c.channel_type === "google");
  const hasMetaChannel = channels.some((c) => c.channel_type === "meta");
  const hasTikTokChannel = channels.some((c) => c.channel_type === "tiktok");
  const amazonChannelId =
    (location.pathname.includes("/amazon/") ? getChannelIdFromUrl(location.pathname) : null) ??
    channels.find((c) => c.channel_type === "amazon")?.id ??
    0;
  const googleChannelId =
    (location.pathname.includes("/google/") ? getChannelIdFromUrl(location.pathname) : null) ??
    channels.find((c) => c.channel_type === "google")?.id ??
    0;
  const metaChannelId =
    (location.pathname.includes("/meta/") ? getChannelIdFromUrl(location.pathname) : null) ??
    channels.find((c) => c.channel_type === "meta")?.id ??
    0;
  const tiktokChannelId =
    (location.pathname.includes("/tiktok/") ? getChannelIdFromUrl(location.pathname) : null) ??
    channels.find((c) => c.channel_type === "tiktok")?.id ??
    0;

  const [channelRequiredModal, setChannelRequiredModal] = useState<
    "amazon" | "google" | "tiktok" | "meta" | null
  >(null);
  const [showBrandRequiredModal, setShowBrandRequiredModal] = useState(false);
  const [brandRequiredReturnUrl, setBrandRequiredReturnUrl] = useState<string | undefined>(undefined);

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
  const [isMetaSectionCollapsed, setIsMetaSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(META_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });
  const [isTikTokSectionCollapsed, setIsTikTokSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(TIKTOK_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });
  const [isWorkspaceSectionCollapsed, setIsWorkspaceSectionCollapsed] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(WORKSPACE_SECTION_STORAGE_KEY);
      return saved === "true" || saved === null; // Default to collapsed
    });

  // Auto-expand/collapse sections based on current page
  useEffect(() => {
    const marketplace = getMarketplaceFromUrl(location.pathname);
    const isBrandsArea =
      location.pathname === "/brands" ||
      /^\/brands\/\d+\/integrations$/.test(location.pathname) ||
      /^\/brands\/\d+\/profiles$/.test(location.pathname) ||
      /^\/brands\/\d+\/users$/.test(location.pathname) ||
      location.pathname === "/workspace/team";

    if (isBrandsArea) {
      setIsWorkspaceSectionCollapsed(false);
    }
    // If on brands page, collapse all marketplace sections
    if (location.pathname === "/brands") {
      setIsAmazonSectionCollapsed(true);
      setIsGoogleSectionCollapsed(true);
      setIsMetaSectionCollapsed(true);
    } else {
      // Auto-expand the relevant marketplace section when on that page
      if (marketplace === "amazon") {
        setIsAmazonSectionCollapsed(false);
      } else if (marketplace === "google") {
        setIsGoogleSectionCollapsed(false);
      } else if (marketplace === "meta") {
        setIsMetaSectionCollapsed(false);
      } else if (marketplace === "tiktok") {
        setIsTikTokSectionCollapsed(false);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(
      WORKSPACE_SECTION_STORAGE_KEY,
      String(isWorkspaceSectionCollapsed),
    );
  }, [isWorkspaceSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      AMAZON_SECTION_STORAGE_KEY,
      String(isAmazonSectionCollapsed),
    );
  }, [isAmazonSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      GOOGLE_SECTION_STORAGE_KEY,
      String(isGoogleSectionCollapsed),
    );
  }, [isGoogleSectionCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      META_SECTION_STORAGE_KEY,
      String(isMetaSectionCollapsed),
    );
  }, [isMetaSectionCollapsed]);

  const toggleAmazonSection = () => {
    setIsAmazonSectionCollapsed((prev) => !prev);
  };

  const toggleGoogleSection = () => {
    setIsGoogleSectionCollapsed((prev) => !prev);
  };

  const toggleMetaSection = () => {
    setIsMetaSectionCollapsed((prev) => !prev);
  };

  const toggleTikTokSection = () => {
    setIsTikTokSectionCollapsed((prev) => !prev);
  };

  const toggleWorkspaceSection = () => {
    setIsWorkspaceSectionCollapsed((prev) => !prev);
  };

  const isActive = (path: string) => {
    if (path === "/brands") return location.pathname === "/brands";
    if (path === "/brands/integrations")
      return /^\/brands\/\d+\/integrations$/.test(location.pathname);
    if (path === "/brands/profiles")
      return /^\/brands\/\d+\/profiles$/.test(location.pathname);
    if (path === "/brands/users" || path === "/workspace/team")
      return location.pathname === "/workspace/team" || /^\/brands\/\d+\/users$/.test(location.pathname);
    if (path === "/campaigns") {
      return (
        location.pathname.includes("/campaigns") &&
        !location.pathname.includes("/google") &&
        !location.pathname.includes("/tiktok")
      );
    }
    if (path === "/google/campaigns") {
      return location.pathname.includes("/google/campaigns");
    }
    if (path === "/tiktok/campaigns") {
      return location.pathname.includes("/tiktok/campaigns");
    }
    if (path === "/tiktok/adgroups") {
      return location.pathname.includes("/tiktok/adgroups");
    }
    if (path === "/tiktok/ads") {
      return location.pathname.includes("/tiktok/ads");
    }
    if (path === "/tiktok/logs") {
      return location.pathname.includes("/tiktok/logs");
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
    if (path === "/google/targets") {
      return location.pathname.includes("/google/targets");
    }
    if (path === "/meta/campaigns") {
      return location.pathname.includes("/meta/campaigns");
    }
    if (path === "/meta/adsets") {
      return location.pathname.includes("/meta/adsets");
    }
    if (path === "/meta/ads") {
      return location.pathname.includes("/meta/ads");
    }

    // Generic paths for Amazon (exclude google and tiktok paths)
    if (path === "/adgroups") {
      return (
        location.pathname.includes("/adgroups") &&
        !location.pathname.includes("/google") &&
        !location.pathname.includes("/tiktok")
      );
    }
    if (path === "/keywords") {
      return (
        location.pathname.includes("/keywords") &&
        !location.pathname.includes("/google") &&
        !location.pathname.includes("/tiktok")
      );
    }
    if (path === "/targets") {
      return (
        location.pathname.includes("/targets") &&
        !location.pathname.includes("/google") &&
        !location.pathname.includes("/tiktok")
      );
    }
    // Handle marketplace-specific logs routes FIRST to prevent global logs from matching
    if (path === "/amazon/logs") {
      return (
        location.pathname.includes("/amazon/logs") ||
        location.pathname.includes("/amazon/log-history")
      );
    }
    if (path === "/google/logs") {
      return (
        location.pathname.includes("/google/logs") ||
        location.pathname.includes("/google/log-history")
      );
    }
    if (path === "/tiktok/logs") {
      return (
        location.pathname.includes("/tiktok/logs") ||
        location.pathname.includes("/tiktok/log-history")
      );
    }
    // Global logs route - only match if NOT a marketplace-specific route
    if (path === "/log-history" || path === "/logs") {
      return (
        (location.pathname.includes("/log-history") ||
          location.pathname.includes("/logs")) &&
        !location.pathname.includes("/amazon/logs") &&
        !location.pathname.includes("/amazon/log-history") &&
        !location.pathname.includes("/google/logs") &&
        !location.pathname.includes("/google/log-history") &&
        !location.pathname.includes("/tiktok/logs") &&
        !location.pathname.includes("/tiktok/log-history")
      );
    }
    return location.pathname === path;
  };

  const handleAccountRequiredClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    buildRoute: () => string | null,
  ) => {
    if (!accountId) {
      e.preventDefault();
      const route = buildRoute();
      // Show popup instead of redirecting - force user to select a brand first
      setBrandRequiredReturnUrl(route || undefined);
      setShowBrandRequiredModal(true);
    }
  };

  const handleAmazonNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    buildRoute: () => string | null,
  ) => {
    if (!accountId) {
      handleAccountRequiredClick(e, buildRoute);
      return;
    }
    if (!hasAmazonChannel) {
      e.preventDefault();
      setChannelRequiredModal("amazon");
    }
  };

  const handleMarketplaceClick = (
    marketplace: "google" | "tiktok" | "meta",
    e: React.MouseEvent<HTMLAnchorElement>,
    buildRoute: () => string | null,
  ) => {
    if (!accountId) {
      handleAccountRequiredClick(e, buildRoute);
      return;
    }
    const hasChannel =
      marketplace === "google"
        ? hasGoogleChannel
        : marketplace === "meta"
          ? hasMetaChannel
          : hasTikTokChannel;
    if (!hasChannel) {
      e.preventDefault();
      setChannelRequiredModal(marketplace);
    }
  };

  return (
    <div
      className="sidebar-nav border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto bg-[#f9f9f6] transition-all duration-300"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="p-4">
        {/* Logo and Toggle Button */}
        <div className="mb-2 flex items-center gap-3 justify-between">
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

        {/* Workspace name - top left when sidebar expanded */}
        {hasWorkspace && user?.workspace?.name && !isCollapsed && (
          <div className="mb-6 px-1">
            <p
              className="text-[11px] font-medium text-[rgba(0,0,0,0.5)] truncate"
              title={user.workspace.name}
            >
              {user.workspace.name}
            </p>
          </div>
        )}

        {/* Workspace Section - sub-nav: Brands, Integrations, Profiles, Users (hidden when no workspace) */}
        {hasWorkspace && (
        <div className="mb-6">
          {!isCollapsed ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 min-w-0" onClick={toggleWorkspaceSection}>
                  <img src={WorkspaceIcon} alt="" className="w-5 h-5 shrink-0" />
                  <h2
                    className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide truncate"
                  >
                    Workspace
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWorkspaceSection();
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0"
                  aria-label={
                    isWorkspaceSectionCollapsed
                      ? "Expand Workspace section"
                      : "Collapse Workspace section"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      isWorkspaceSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
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
              {!isWorkspaceSectionCollapsed && (
                <div className="space-y-1 ml-[15px]">
                  <Link
                    to="/brands"
                    className={`flex items-center p-2 rounded-xl gap-2 ${
                      isActive("/brands")
                        ? "w-full bg-forest-f60 !text-white hover:!text-white"
                        : "text-black hover:bg-transparent hover:text-[#136D6D]"
                    }`}
                    title="Brands"
                  >
                    <img
                      src={isActive("/brands") ? BrandsActiveIcon : BrandsIcon}
                      alt=""
                      className="w-5 h-5 shrink-0"
                    />
                    <span className="text-[12.32px] font-normal leading-[16px]">
                      Brands
                    </span>
                  </Link>
                  <Link
                    to={
                      accountId
                        ? buildAccountRoute(accountId, "integrations")
                        : "/brands"
                    }
                    onClick={(e) =>
                      handleAccountRequiredClick(e, () =>
                        accountId
                          ? buildAccountRoute(accountId, "integrations")
                          : "/brands",
                      )
                    }
                    className={`flex items-center p-2 rounded-xl gap-2 ${
                      isActive("/brands/integrations")
                        ? "w-full bg-forest-f60 !text-white hover:!text-white"
                        : "text-black hover:bg-transparent hover:text-[#136D6D]"
                    }`}
                    title="Integrations"
                  >
                    <img
                      src={isActive("/brands/integrations") ? IntegrationsActiveIcon : IntegrationsIcon}
                      alt=""
                      className="w-5 h-5 shrink-0"
                    />
                    <span className="text-[12.32px] font-normal leading-[16px]">
                      Integrations
                    </span>
                  </Link>
                  <Link
                    to={
                      accountId
                        ? buildAccountRoute(accountId, "profiles")
                        : "/brands"
                    }
                    onClick={(e) =>
                      handleAccountRequiredClick(e, () =>
                        accountId
                          ? buildAccountRoute(accountId, "profiles")
                          : "/brands",
                      )
                    }
                    className={`flex items-center p-2 rounded-xl gap-2 ${
                      isActive("/brands/profiles")
                        ? "w-full bg-forest-f60 !text-white hover:!text-white"
                        : "text-black hover:bg-transparent hover:text-[#136D6D]"
                    }`}
                    title="Profiles"
                  >
                    <img
                      src={isActive("/brands/profiles") ? ProfilesActiveIcon : ProfilesIcon}
                      alt=""
                      className="w-5 h-5 shrink-0"
                    />
                    <span className="text-[12.32px] font-normal leading-[16px]">
                      Profiles
                    </span>
                  </Link>
                  {hasUsersAccess && (
                    <Link
                      to={
                        accountId
                          ? buildAccountRoute(accountId, "users")
                          : accounts.length > 0
                            ? buildAccountRoute(accounts[0].id, "users")
                            : "/workspace/team"
                      }
                      className={`flex items-center p-2 rounded-xl gap-2 ${
                        isActive("/workspace/team") || isActive("/brands/" + (accountId ?? "") + "/users")
                          ? "w-full bg-forest-f60 !text-white hover:!text-white"
                          : "text-black hover:bg-transparent hover:text-[#136D6D]"
                      }`}
                      title="Users"
                    >
                      <img
                        src={isActive("/workspace/team") || isActive("/brands/" + (accountId ?? "") + "/users") ? UsersActiveIcon : UsersIcon}
                        alt=""
                        className="w-5 h-5 shrink-0"
                      />
                      <span className="text-[12.32px] font-normal leading-[16px]">
                        Users
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <Link
              to="/brands"
              className={`flex items-center justify-center p-2 rounded-xl ${
                isActive("/brands")
                  ? "w-full bg-forest-f60 !text-white hover:!text-white"
                  : "text-black hover:bg-transparent"
              }`}
              title="Workspace"
            >
              <img
                src={WorkspaceIcon}
                alt=""
                className="w-5 h-5 shrink-0"
              />
            </Link>
          )}
        </div>
        )}

        {/* Amazon Section (hidden when no workspace; hidden when GOOGLE_ONLY_UI) */}
        {!GOOGLE_ONLY_UI && hasWorkspace && (
        <div>
          {!isCollapsed && (
            <div className="mb-3">
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "campaigns")
                    : "/brands"
                }
                onClick={(e) => {
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "campaigns")
                      : "/brands/1/amazon/campaigns",
                  );
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <img src={AmazonIcon} alt="Amazon" className="w-4 h-4" />
                  <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                    Amazon
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleAmazonSection();
                  }}
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
              </Link>
            </div>
          )}
          {(isCollapsed || !isAmazonSectionCollapsed) && (
            <div className={`space-y-1 ${!isCollapsed ? "ml-[15px]" : ""}`}>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "campaigns")
                    : "/brands"
                }
                onClick={(e) =>
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "campaigns")
                      : "/brands/1/amazon/campaigns",
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
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "adgroups")
                    : "/brands"
                }
                onClick={(e) =>
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "adgroups")
                      : "/brands/1/amazon/adgroups",
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
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "keywords")
                    : "/brands"
                }
                onClick={(e) =>
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "keywords")
                      : "/brands/1/amazon/keywords",
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
                  src={isActive("/keywords") ? KeywordsWhiteIcon : KeywordsIcon}
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
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "targets")
                    : "/brands"
                }
                onClick={(e) =>
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "targets")
                      : "/brands/1/amazon/targets",
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
                  src={isActive("/targets") ? TargetsWhiteIcon : TargetsIcon}
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
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "logs")
                    : "/brands"
                }
                onClick={(e) =>
                  handleAmazonNavClick(e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, amazonChannelId, "amazon", "logs")
                      : "/brands/1/amazon/logs",
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/amazon/logs") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/amazon/logs")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Logs" : undefined}
              >
                <svg
                  className={`w-5 h-5 ${
                    isActive("/amazon/logs") ? "brightness-0 invert" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/amazon/logs") ? "!text-white" : ""
                    }`}
                  >
                    Logs
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
        )}

        {/* Google Section */}
        {hasWorkspace && (
        <div>
          {!isCollapsed && (
            <div className="mb-3">
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "campaigns")
                    : "/brands"
                }
                onClick={(e) => {
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "campaigns")
                      : "/brands/1/google/campaigns",
                  );
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <img src={GoogleIcon} alt="Google" className="w-4 h-4" />
                  <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                    Google
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleGoogleSection();
                  }}
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
              </Link>
            </div>
          )}
          {(isCollapsed || !isGoogleSectionCollapsed) && (
            <div className={`space-y-1 ${!isCollapsed ? "ml-[15px]" : ""}`}>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "campaigns")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "campaigns")
                      : "/brands/1/google/campaigns",
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
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "adgroups")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "adgroups")
                      : "/brands/1/google/adgroups",
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
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/google/adgroups") ? "brightness-0 invert" : ""
                  }`}
                />
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
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "keywords")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "keywords")
                      : "/brands/1/google/keywords",
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
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "ads")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "ads")
                      : "/brands/1/google/ads",
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
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, googleChannelId, "google", "logs")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("google", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, googleChannelId, "google", "logs")
                      : buildMarketplaceRoute(1, googleChannelId, "google", "logs"),
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/google/logs") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/google/logs")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Logs" : undefined}
              >
                <svg
                  className={`w-5 h-5 ${
                    isActive("/google/logs") ? "brightness-0 invert" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/google/logs") ? "!text-white" : ""
                    }`}
                  >
                    Logs
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
        )}

        {/* Meta Section - Campaign, Adset, Ad */}
        {hasWorkspace && (
        <div>
          {!isCollapsed && (
            <div className="mb-3">
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "campaigns")
                    : "/brands"
                }
                onClick={(e) => {
                  handleMarketplaceClick("meta", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "campaigns")
                      : "/brands/1/meta/campaigns",
                  );
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <img src={MetaIcon} alt="Meta" className="w-4 h-4" />
                  <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                    Meta
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMetaSection();
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label={
                    isMetaSectionCollapsed
                      ? "Expand Meta section"
                      : "Collapse Meta section"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      isMetaSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
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
              </Link>
            </div>
          )}
          {(isCollapsed || !isMetaSectionCollapsed) && (
            <div className={`space-y-1 ${!isCollapsed ? "ml-[15px]" : ""}`}>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "campaigns")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("meta", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "campaigns")
                      : "/brands/1/meta/campaigns",
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/meta/campaigns") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/meta/campaigns")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Campaign" : undefined}
              >
                <img
                  src={
                    isActive("/meta/campaigns")
                      ? CampaignWhiteIcon
                      : CampaignIconRegular
                  }
                  alt=""
                  className="w-5 h-5"
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/meta/campaigns") ? "!text-white" : ""
                    }`}
                  >
                    Campaign
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "adsets")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("meta", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "adsets")
                      : "/brands/1/meta/adsets",
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/meta/adsets") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/meta/adsets")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Adset" : undefined}
              >
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/meta/adsets") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/meta/adsets") ? "!text-white" : ""
                    }`}
                  >
                    Adset
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId
                    ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "ads")
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("meta", e, () =>
                    accountId
                      ? buildMarketplaceRoute(accountId, metaChannelId, "meta", "ads")
                      : "/brands/1/meta/ads",
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/meta/ads") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/meta/ads")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Ad" : undefined}
              >
                <img src={ProductTargetIcon} alt="" className="w-5 h-5" />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/meta/ads") ? "!text-white" : ""
                    }`}
                  >
                    Ad
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
        )}

        {/* TikTok Section (hidden when GOOGLE_ONLY_UI) */}
        {!GOOGLE_ONLY_UI && hasWorkspace && (
        <div>
          {!isCollapsed && (
            <div className="mb-3">
              <Link
                to={
                  accountId
                    ? `/brands/${accountId}/tiktok/campaigns`
                    : "/brands"
                }
                onClick={(e) => {
                  handleMarketplaceClick("tiktok", e, () =>
                    accountId ? `/brands/${accountId}/tiktok/campaigns` : null,
                  );
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7.41a4.85 4.85 0 0 0 3.77 1.52v-3.4a1 1 0 0 0-1.04-1.09z" />
                  </svg>
                  <h2 className="text-[12.32px] font-normal text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
                    TikTok
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTikTokSection();
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label={
                    isTikTokSectionCollapsed
                      ? "Expand TikTok section"
                      : "Collapse TikTok section"
                  }
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      isTikTokSectionCollapsed ? "rotate-[-90deg]" : "rotate-0"
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
              </Link>
            </div>
          )}

          {(isCollapsed || !isTikTokSectionCollapsed) && (
            <div className={`space-y-1 ${!isCollapsed ? "ml-[15px]" : ""}`}>
              <Link
                to={
                  accountId
                    ? `/brands/${accountId}/tiktok/campaigns`
                    : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("tiktok", e, () =>
                    accountId
                      ? `/brands/${accountId}/tiktok/campaigns`
                      : null,
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/tiktok/campaigns") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/tiktok/campaigns")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "TikTok Campaigns" : undefined}
              >
                <img
                  src={
                    isActive("/tiktok/campaigns")
                      ? CampaignWhiteIcon
                      : CampaignIconRegular
                  }
                  alt=""
                  className="w-5 h-5"
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/tiktok/campaigns") ? "!text-white" : ""
                    }`}
                  >
                    Campaigns
                  </span>
                )}
              </Link>
              <Link
                to={
                  accountId ? `/brands/${accountId}/tiktok/adgroups` : "/brands"
                }
                onClick={(e) =>
                  handleMarketplaceClick("tiktok", e, () =>
                    accountId ? `/brands/${accountId}/tiktok/adgroups` : null,
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/tiktok/adgroups") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/tiktok/adgroups")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "TikTok Ad Groups" : undefined}
              >
                <img
                  src={AdGroupIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/tiktok/adgroups") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/tiktok/adgroups") ? "!text-white" : ""
                    }`}
                  >
                    Ad Groups
                  </span>
                )}
              </Link>
              <Link
                to={accountId ? `/brands/${accountId}/tiktok/ads` : "/brands"}
                onClick={(e) =>
                  handleMarketplaceClick("tiktok", e, () =>
                    accountId ? `/brands/${accountId}/tiktok/ads` : null,
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/tiktok/ads") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/tiktok/ads")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "TikTok Ads" : undefined}
              >
                <img
                  src={ProductTargetIcon}
                  alt=""
                  className={`w-5 h-5 ${
                    isActive("/tiktok/ads") ? "brightness-0 invert" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/tiktok/ads") ? "!text-white" : ""
                    }`}
                  >
                    Ads
                  </span>
                )}
              </Link>
              <Link
                to={accountId ? `/brands/${accountId}/tiktok/logs` : "/brands"}
                onClick={(e) =>
                  handleMarketplaceClick("tiktok", e, () =>
                    accountId
                      ? `/brands/${accountId}/tiktok/logs`
                      : "/brands/1/tiktok/logs",
                  )
                }
                className={`flex items-center p-2 rounded-xl ${
                  isActive("/tiktok/logs") ? "" : "transition-colors"
                } ${isCollapsed ? "justify-center" : "gap-2"} ${
                  isActive("/tiktok/logs")
                    ? "w-full bg-forest-f60 !text-white hover:!text-white"
                    : "text-black hover:bg-transparent hover:text-[#136D6D]"
                }`}
                title={isCollapsed ? "Logs" : undefined}
              >
                <svg
                  className={`w-5 h-5 ${
                    isActive("/tiktok/logs") ? "brightness-0 invert" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {!isCollapsed && (
                  <span
                    className={`text-[12.32px] font-normal leading-[16px] ${
                      isActive("/tiktok/logs") ? "!text-white" : ""
                    }`}
                  >
                    Logs
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
        )}
      </div>

      {channelRequiredModal !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <ConfirmationModal
            isOpen
            onClose={() => setChannelRequiredModal(null)}
            onConfirm={() => {
              if (accountId) {
                navigate(`/brands/${accountId}/integrations`);
              }
              setChannelRequiredModal(null);
            }}
            title={
              channelRequiredModal === "amazon"
                ? "No Amazon Integration"
                : channelRequiredModal === "meta"
                  ? "Connect Meta"
                  : `Connect ${channelRequiredModal === "google" ? "Google" : "TikTok"}`
            }
            message={
              channelRequiredModal === "amazon"
                ? "This account does not have Amazon Integration."
                : channelRequiredModal === "meta"
                  ? "This brand does not have Meta integration. Want to connect?"
                  : `This brand does not have ${channelRequiredModal === "google" ? "Google" : "TikTok"} integration. Want to connect?`
            }
            confirmButtonLabel="Go to Integrations"
            cancelButtonLabel="Cancel"
            type="info"
          />,
          document.body,
        )}

      <SelectBrandRequiredModal
        isOpen={showBrandRequiredModal}
        returnUrl={brandRequiredReturnUrl}
        onClose={() => {
          setShowBrandRequiredModal(false);
          setBrandRequiredReturnUrl(undefined);
        }}
      />
    </div>
  );
};
