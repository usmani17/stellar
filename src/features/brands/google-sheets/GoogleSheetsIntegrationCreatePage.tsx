import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import { Button, Loader, Banner } from "../../../components/ui";
import {
  resolveSheetUrl,
  createGoogleSheetsIntegration,
} from "./api";
import type { GoogleSheetTab } from "./api";

const DEFAULT_SHEET_URL_PLACEHOLDER =
  "https://docs.google.com/spreadsheets/d/.../edit";

export const GoogleSheetsIntegrationCreatePage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();

  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([]);

  const [name, setName] = useState("");
  const [sheetName, setSheetName] = useState("");

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
    }
  }, [accountIdNum, navigate]);

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
      setName(data.spreadsheet_name || "");
      if (data.tabs?.length === 1) {
        setSheetName(data.tabs[0].name);
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(detail || "Could not load sheet. Share it with the service account and try again.");
    } finally {
      setResolving(false);
    }
  };

  const handleCreate = async () => {
    if (!spreadsheetId || !sheetName.trim()) {
      setError("Load a sheet URL and select a tab before creating.");
      return;
    }
    setSaving(true);
    setError(null);
    const selectedTab = tabs.find((t) => t.name === sheetName);
    const integrationName = name.trim() || spreadsheetName || "Google Sheet";
    try {
      const created = await createGoogleSheetsIntegration(accountIdNum, {
        name: integrationName,
        connection_id: null,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: spreadsheetName,
        sheet_name: sheetName,
        sheet_gid: selectedTab?.gid?.toString() ?? "",
        range: "A:Z",
        header_row: 1,
      });
      navigate(`/brands/${accountId}/google-sheets/view/${created.id}`);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create integration.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resolved = Boolean(spreadsheetId && tabs.length > 0);

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
              Add Google Sheet
            </h1>
            <p className="text-[14px] text-forest-f30">
              Paste the Google Sheet link. Share the sheet with the service account first.
              Data will sync with the first row as headers.
            </p>

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
                  onClick={handleResolveUrl}
                  disabled={resolving || !sheetUrl.trim()}
                >
                  {resolving ? "Loading..." : "Load sheet"}
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/brands/${accountId}/google-sheets/integrations`)
                  }
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>

            {resolved && (
              <>
                {spreadsheetName && (
                  <p className="text-[14px] text-forest-f30">
                    Spreadsheet: <span className="font-medium text-forest-f60">{spreadsheetName}</span>
                  </p>
                )}

                <div className="space-y-1">
                  <label className="text-[13px] text-forest-f30">Integration name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={spreadsheetName || "My integration"}
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] text-forest-f30">Sheet tab</label>
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

                <div className="pt-2 flex gap-2">
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? "Creating..." : "Create integration"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationCreatePage;
