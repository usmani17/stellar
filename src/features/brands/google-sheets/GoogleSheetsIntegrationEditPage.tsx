import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import { Button, Loader, Banner } from "../../../components/ui";
import {
  getGoogleSheetsConnectUrl,
  createGoogleSheetsIntegration,
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
    integration_id?: string;
  }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const integrationIdNum = integration_id ? parseInt(integration_id, 10) : NaN;
  const isEditMode = Boolean(integration_id);
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
  const [addingConnection, setAddingConnection] = useState(false);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isEditMode) {
          if (!integrationIdNum) {
            navigate("/brands");
            return;
          }
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
          // Prefer the nested connection if present, otherwise fall back to 0 (forces user to re-select)
          const initialConnectionId =
            (integrationData as any).connection?.id ??
            (integrationData as any).connection_id ??
            "";
          setConnectionId(initialConnectionId);

          if (initialConnectionId) {
            const [sheets, sheetTabs] = await Promise.all([
              listSpreadsheets(accountIdNum, initialConnectionId as number),
              integrationData.spreadsheet_id
                ? listSheetTabs(
                    accountIdNum,
                    integrationData.spreadsheet_id,
                    initialConnectionId as number,
                  )
                : Promise.resolve([]),
            ]);
            setSpreadsheets(sheets);
            setTabs(sheetTabs as GoogleSheetTab[]);
          }
        } else {
          const connectionsData = await listGoogleConnections(accountIdNum);
          setConnections(connectionsData);
        }
      } catch (e: any) {
        setError(
          e?.response?.data?.detail ||
            (isEditMode
              ? "Failed to load integration for editing."
              : "Failed to load Google connections for this brand."),
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountIdNum, integrationIdNum, isEditMode, navigate]);

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
      setLoadingSpreadsheets(false);
      return;
    }
    const id = Number(value);
    setConnectionId(id);
    setSpreadsheetId("");
    setSheetName("");
    setTabs([]);
    setLoadingSpreadsheets(true);
    setError(null);
    try {
      const sheets = await listSpreadsheets(accountIdNum, id);
      setSpreadsheets(sheets);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to load spreadsheets for selected connection.",
      );
      setSpreadsheets([]);
    } finally {
      setLoadingSpreadsheets(false);
    }
  };

  const handleSpreadsheetChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setSpreadsheetId(value);
    setSheetName("");
    setTabs([]);
    if (!value || !connectionId || typeof connectionId !== "number") {
      setLoadingTabs(false);
      return;
    }
    setLoadingTabs(true);
    setError(null);
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
      setTabs([]);
    } finally {
      setLoadingTabs(false);
    }
  };

  const handleAddConnection = async () => {
    if (!accountIdNum || addingConnection) return;
    setAddingConnection(true);
    setError(null);
    try {
      const url = await getGoogleSheetsConnectUrl(accountIdNum);
      window.location.href = url;
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to start Google connection authorization.",
      );
      setAddingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }

    if (!name || !connectionId || !spreadsheetId || !sheetName) {
      setError(
        "Please provide a name, select a connection, spreadsheet and sheet tab before saving.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    const selectedSpreadsheet = spreadsheets.find((s) => s.id === spreadsheetId);
    const selectedTab = tabs.find((t) => t.name === sheetName);
    try {
      if (isEditMode && integrationIdNum && integration) {
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
      } else {
        const created = await createGoogleSheetsIntegration(accountIdNum, {
          name,
          connection_id: connectionId as number,
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: selectedSpreadsheet?.name ?? "",
          sheet_name: sheetName,
          sheet_gid: selectedTab?.gid?.toString() ?? "",
          range,
          header_row: headerRow,
        });
        navigate(`/brands/${accountId}/google-sheets/view/${created.id}`);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          (isEditMode
            ? "Failed to save Google Sheets integration."
            : "Failed to create Google Sheets integration."),
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

          {loading || (isEditMode && !integration) ? (
            <div className="flex items-center justify-center py-16">
              <Loader
                size="md"
                message={isEditMode ? "Loading integration..." : "Loading Google connections..."}
              />
            </div>
          ) : (
            <div className="max-w-xl space-y-5">
              <h1 className="text-[24px] font-medium text-forest-f60">
                {isEditMode
                  ? "Edit Google Sheets Integration"
                  : "Create Google Sheets Integration"}
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
                <div className="flex gap-2">
                  <select
                    value={connectionId ?? ""}
                    onChange={handleConnectionChange}
                    disabled={loadingSpreadsheets}
                    className="flex-1 rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 disabled:opacity-60"
                  >
                    <option value="">Select connection</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.email || c.google_user_id}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="whitespace-nowrap"
                    onClick={handleAddConnection}
                    disabled={addingConnection}
                  >
                    {addingConnection ? "Opening..." : "Add new connection"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-forest-f30">
                  Spreadsheet
                </label>
                <div className="relative">
                  <select
                    value={spreadsheetId}
                    onChange={handleSpreadsheetChange}
                    disabled={
                      !connectionId ||
                      loadingSpreadsheets ||
                      (spreadsheets.length === 0 && !loadingSpreadsheets)
                    }
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 disabled:opacity-60"
                  >
                    <option value="">
                      {loadingSpreadsheets
                        ? "Loading spreadsheets..."
                        : "Select spreadsheet"}
                    </option>
                    {spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {loadingSpreadsheets && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden
                    >
                      <Loader size="sm" />
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-forest-f30">Sheet tab</label>
                <div className="relative">
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    disabled={
                      !spreadsheetId ||
                      loadingTabs ||
                      (tabs.length === 0 && !loadingTabs)
                    }
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 disabled:opacity-60"
                  >
                    <option value="">
                      {loadingTabs
                        ? "Loading sheet tabs..."
                        : "Select sheet tab"}
                    </option>
                    {tabs.map((t) => (
                      <option key={t.gid} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {loadingTabs && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden
                    >
                      <Loader size="sm" />
                    </span>
                  )}
                </div>
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
                  {saving
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                    ? "Save integration"
                    : "Create integration"}
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

