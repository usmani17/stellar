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

  const activeLinkStyle = {
    width: "100%",
    height: "100%",
    padding: "8px",
    background: "#072929",
    borderRadius: "12px",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "4px",
    display: "inline-flex",
    flexWrap: "wrap",
    alignContent: "center",
    color: "white",
  };

  const defaultLinkStyle = {
    padding: "8px",
    color: "black",
  };

  return (
    <div
      className="w-[272px] border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto"
      style={{ backgroundColor: "#F5F5F0" }}
    >
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
              className={`flex items-center gap-2 rounded-xl transition-colors ${
                isActive("/accounts") ? "" : "hover:bg-transparent"
              }`}
              style={isActive("/accounts") ? activeLinkStyle : defaultLinkStyle}
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
              className={`flex items-center gap-2 rounded-xl transition-colors ${
                isActive("/dashboards") ? "" : "hover:bg-transparent"
              }`}
              style={
                isActive("/dashboards") ? activeLinkStyle : defaultLinkStyle
              }
            >
              <img
                src={InstacartIcon}
                alt=""
                className="w-5 h-5"
                style={{
                  filter: isActive("/dashboards")
                    ? "brightness(0) invert(1)"
                    : "none",
                }}
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
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={CreateCampaignIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Create Campaign
              </span>
            </Link>
            <Link
              to="/accounts"
              className={`flex items-center gap-2 rounded-xl transition-colors ${
                isActive("/campaigns") ? "" : "hover:bg-transparent"
              }`}
              style={
                isActive("/campaigns") ? activeLinkStyle : defaultLinkStyle
              }
            >
              <img
                src={CreateCampaignIcon}
                alt=""
                className="w-5 h-5"
                style={{
                  filter: isActive("/campaigns")
                    ? "brightness(0) invert(1)"
                    : "none",
                }}
              />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Campaigns
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={AdGroupIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Ad Groups
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Product Target
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={GoogleIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Analytics
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Blueprints
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
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
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Google
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Meta
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Walmart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Instacart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
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
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Trend Chart
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                KPI Cards
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={InstacartIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Top Keywords
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
            >
              <img src={TopKeywordsIcon} alt="" className="w-5 h-5" />
              <span className="text-[11.2px] font-normal leading-[16px]">
                Top Products
              </span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 rounded-xl transition-colors hover:bg-transparent"
              style={defaultLinkStyle}
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
