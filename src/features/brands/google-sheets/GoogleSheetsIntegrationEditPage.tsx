import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import { Button, Loader, Banner } from "../../../components/ui";
import {
  getGoogleSheetsIntegration,
  listGoogleConnections,
  listSpreadsheets,
  listSheetTabs,
  updateGoogleSheetsIntegration,
} from "./api";
import type {
  GoogleSheetsIntegration,
  GoogleConnection,
  GoogleSpreadsheet,
  GoogleSheetTab,
} from "./api";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [integration, setIntegration] = useState<GoogleSheetsIntegration | null>(null);
  const [connections, setConnections] = useState<GoogleConnection[]>([]);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheet[]>([]);
  const [tabs, setTabs] = useState<GoogleSheetTab[]>([]);

  const [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState<number | "">("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [range, setRange] = useState("A1:Z1000");
  const [headerRow, setHeaderRow] = useState(1);

  useEffect(() => {
    if (!accountIdNum || !integrationIdNum) {
      navigate("/brands");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [integrationData, connectionsData] = await Promise.all([
          getGoogleSheetsIntegration(accountIdNum, integrationIdNum),
          listGoogleConnections(accountIdNum),
        ]);
        setIntegration(integrationData);
        setConnections(connectionsData);
        setName(integrationData.name);
        setRange(integrationData.range || "A1:Z1000");
        setHeaderRow(integrationData.header_row || 1);
        setSpreadsheetId(integrationData.spreadsheet_id);
        setSheetName(integrationData.sheet_name);
        setConnectionId(integrationData.connection?.id ?? "");

        if (integrationData.connection?.id) {
          const [sheets, sheetTabs] = await Promise.all([
            listSpreadsheets(accountIdNum, integrationData.connection.id),
            integrationData.spreadsheet_id
              ? listSheetTabs(
                  accountIdNum,
                  integrationData.spreadsheet_id,
                  integrationData.connection.id,
                )
              : Promise.resolve([]),
          ]);
          setSpreadsheets(sheets);
          setTabs(sheetTabs as GoogleSheetTab[]);
        }
      } catch (e: any) {
        setError(
          e?.response?.data?.detail || "Failed to load integration for editing.",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountIdNum, integrationIdNum, navigate]);

  const handleConnectionChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    if (!value) {
      setConnectionId("");
      setSpreadsheets([]);
      setTabs([]);
      setSpreadsheetId("");
      setSheetName("");
      return;
    }
    const id = Number(value);
    setConnectionId(id);
    setSpreadsheetId("");
    setSheetName("");
    setTabs([]);

    try {
      const sheets = await listSpreadsheets(accountIdNum, id);
      setSpreadsheets(sheets);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to load spreadsheets for selected connection.",
      );
    }
  };

  const handleSpreadsheetChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setSpreadsheetId(value);
    setSheetName("");
    setTabs([]);
    if (!value || !connectionId || typeof connectionId !== "number") return;
    try {
      const sheetTabs = await listSheetTabs(
        accountIdNum,
        value,
        connectionId,
      );
      setTabs(sheetTabs);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to load sheet tabs for selected spreadsheet.",
      );
    }
  };

  const handleSave = async () => {
    if (!integration || !connectionId || !spreadsheetId || !sheetName) {
      setError("Please select connection, spreadsheet and sheet tab before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    const selectedSpreadsheet = spreadsheets.find((s) => s.id === spreadsheetId);
    const selectedTab = tabs.find((t) => t.name === sheetName);
    try {
      const updated = await updateGoogleSheetsIntegration(
        accountIdNum,
        integrationIdNum,
        {
          name,
          connection_id: connectionId,
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: selectedSpreadsheet?.name ?? "",
          sheet_name: sheetName,
          sheet_gid: selectedTab?.gid?.toString() ?? "",
          range,
          header_row: headerRow,
        },
      );
      setIntegration(updated);
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

          {loading || !integration ? (
            <div className="flex items-center justify-center py-16">
              <Loader size="md" message="Loading integration..." />
            </div>
          ) : (
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
                  Google connection
                </label>
                <select
                  value={connectionId ?? ""}
                  onChange={handleConnectionChange}
                  className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                >
                  <option value="">Select connection</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.email || c.google_user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-forest-f30">
                  Spreadsheet
                </label>
                <select
                  value={spreadsheetId}
                  onChange={handleSpreadsheetChange}
                  disabled={!connectionId || spreadsheets.length === 0}
                  className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 disabled:opacity-60"
                >
                  <option value="">Select spreadsheet</option>
                  {spreadsheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-forest-f30">Sheet tab</label>
                <select
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  disabled={!spreadsheetId || tabs.length === 0}
                  className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 disabled:opacity-60"
                >
                  <option value="">Select sheet tab</option>
                  {tabs.map((t) => (
                    <option key={t.gid} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[13px] text-forest-f30">Range</label>
                  <input
                    type="text"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    placeholder="A1:Z1000"
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[13px] text-forest-f30">
                    Header row
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={headerRow}
                    onChange={(e) => setHeaderRow(Number(e.target.value) || 1)}
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save integration"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationEditPage;

