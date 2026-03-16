import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import { Button, Loader, Banner } from "../../../components/ui";
import {
  getGoogleSheetsIntegration,
  resolveSheetUrl,
  updateGoogleSheetsIntegration,
} from "./api";
import type { GoogleSheetsIntegration, GoogleSheetTab } from "./api";

const DEFAULT_SHEET_URL_PLACEHOLDER =
  "https://docs.google.com/spreadsheets/d/.../edit";

export const GoogleSheetsIntegrationEditPage: React.FC = () => {
  const { accountId, integration_id } = useParams<{
    accountId: string;
    integration_id: string;
  }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const integrationIdNum = integration_id ? parseInt(integration_id, 10) : NaN;
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [integration, setIntegration] = useState<GoogleSheetsIntegration | null>(null);
  const [name, setName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [instructions, setInstructions] = useState("");

  const INSTRUCTIONS_MAX_LENGTH = 10000;

  useEffect(() => {
    if (!accountIdNum || !integrationIdNum) {
      navigate("/brands");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const integrationData = await getGoogleSheetsIntegration(
          accountIdNum,
          integrationIdNum,
        );
        setIntegration(integrationData);
        setName(integrationData.name);
        setSpreadsheetId(integrationData.spreadsheet_id);
        setSpreadsheetName(integrationData.spreadsheet_name);
        setSheetName(integrationData.sheet_name);
        setInstructions(integrationData.instructions ?? "");

        const url = `https://docs.google.com/spreadsheets/d/${integrationData.spreadsheet_id}/edit`;
        setSheetUrl(url);

        const resolved = await resolveSheetUrl(accountIdNum, url);
        setTabs(resolved.tabs || []);
      } catch (e: any) {
        setError(
          e?.response?.data?.detail ||
            "Failed to load integration for editing.",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountIdNum, integrationIdNum, navigate]);

  const handleResolveUrl = async () => {
    const url = sheetUrl.trim();
    if (!url || !accountIdNum) return;
    setResolving(true);
    setError(null);
    setSpreadsheetId("");
    setSpreadsheetName("");
    setTabs([]);
    setSheetName("");
    try {
      const data = await resolveSheetUrl(accountIdNum, url);
      setSpreadsheetId(data.spreadsheet_id);
      setSpreadsheetName(data.spreadsheet_name);
      setTabs(data.tabs || []);
      if (data.tabs?.length === 1) {
        setSheetName(data.tabs[0].name);
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(
        detail ||
          "Could not load sheet. Share it with the service account and try again.",
      );
    } finally {
      setResolving(false);
    }
  };

  const handleSave = async () => {
    if (!accountIdNum || !integrationIdNum || !integration) return;
    if (!name.trim() || !spreadsheetId || !sheetName.trim()) {
      setError("Please provide a name, load a sheet URL, and select a sheet tab.");
      return;
    }

    setSaving(true);
    setError(null);
    const selectedTab = tabs.find((t) => t.name === sheetName);
    try {
      await updateGoogleSheetsIntegration(
        accountIdNum,
        integrationIdNum,
        {
          name: name.trim(),
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: spreadsheetName,
          sheet_name: sheetName,
          sheet_gid: selectedTab?.gid?.toString() ?? "",
          range: integration.range || "A:Z",
          header_row: integration.header_row ?? 1,
          instructions: instructions.trim(),
        },
      );
      navigate(`/brands/${accountId}/google-sheets/view/${integrationIdNum}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to save Google Sheets integration.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/brands/${accountId}/google-sheets/integrations`);
  };

  if (loading || !integration) {
    return (
      <div className="min-h-screen bg-sandstorm-s0 flex">
        <Sidebar />
        <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
          <DashboardHeader />
          <div className="flex items-center justify-center py-16">
            <Loader size="md" message="Loading integration..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sandstorm-s0 flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8">
          {error && (
            <Banner
              type="error"
              message={error}
              dismissable
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}

          <div className="max-w-xl space-y-5">
            <h1 className="text-[24px] font-medium text-forest-f60">
              Edit Google Sheets Integration
            </h1>

            <div className="space-y-1">
              <label className="text-[13px] text-forest-f30">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[13px] text-forest-f30">
                Google Sheet URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder={DEFAULT_SHEET_URL_PLACEHOLDER}
                  className="flex-1 rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                />
                <Button
                  type="button"
                  onClick={handleResolveUrl}
                  disabled={resolving || !sheetUrl.trim()}
                >
                  {resolving ? "Loading..." : "Load sheet"}
                </Button>
              </div>
              <p className="text-[12px] text-forest-f30 mt-1">
                Paste the Google Sheet link. Share the sheet with the service account if you change it.
              </p>
            </div>

            {spreadsheetId && tabs.length > 0 && (
              <>
                {spreadsheetName && (
                  <p className="text-[14px] text-forest-f30">
                    Spreadsheet:{" "}
                    <span className="font-medium text-forest-f60">
                      {spreadsheetName}
                    </span>
                  </p>
                )}

                <div className="space-y-1">
                  <label className="text-[13px] text-forest-f30">
                    Sheet tab
                  </label>
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                  >
                    <option value="">Select sheet tab</option>
                    {tabs.map((t) => (
                      <option key={t.gid} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[13px] text-forest-f30">
                Instructions (brand or account guidelines, constraints, or how to use this sheet)
              </label>
              <textarea
                value={instructions}
                onChange={(e) =>
                  setInstructions(e.target.value.slice(0, INSTRUCTIONS_MAX_LENGTH))
                }
                placeholder="e.g. Use this sheet for TOF metrics. CPQ = Spends / engaged session."
                rows={5}
                className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 resize-y min-h-[100px]"
              />
              <div className="text-right text-[12px] text-forest-f30">
                {instructions.length}/{INSTRUCTIONS_MAX_LENGTH}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationEditPage;
