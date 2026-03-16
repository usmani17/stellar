import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import { Button, Loader, Banner } from "../../../components/ui";
import {
  getGoogleSheetsIntegration,
  getColumnMapping,
  saveColumnMapping,
  triggerManualSync,
  previewSheet,
  type ColumnMapping,
} from "./api";
import { ColumnMapper } from "./ColumnMapper";
import { SheetPreview } from "./SheetPreview";

export const GoogleSheetsIntegrationPage: React.FC = () => {
  const { accountId, integration_id } = useParams<{
    accountId: string;
    integration_id: string;
  }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const integrationIdNum = integration_id
    ? parseInt(integration_id, 10)
    : NaN;
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<any | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    rows_processed: number;
    rows_inserted: number;
    rows_updated: number;
  } | null>(null);

  useEffect(() => {
    if (!accountIdNum || !integrationIdNum) {
      navigate("/brands");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [integrationData, mappingData] = await Promise.all([
          getGoogleSheetsIntegration(accountIdNum, integrationIdNum),
          getColumnMapping(integrationIdNum),
        ]);
        setIntegration(integrationData);
        setMapping(mappingData);
        const previewData = await previewSheet(accountIdNum, {
          ...(integrationData.connection?.id != null && {
            connection_id: integrationData.connection.id,
          }),
          spreadsheet_id: integrationData.spreadsheet_id,
          sheet_name: integrationData.sheet_name,
          range: integrationData.range,
          header_row: integrationData.header_row,
        });
        setPreview(previewData);
      } catch (e: any) {
        setError(
          e?.response?.data?.detail ||
            "Failed to load integration details.",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountIdNum, integrationIdNum, navigate]);

  const handleSaveMapping = async (nextMapping: ColumnMapping[]) => {
    setSavingMapping(true);
    setError(null);
    try {
      const saved = await saveColumnMapping(integrationIdNum, nextMapping);
      setMapping(saved);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to save column mapping.",
      );
    } finally {
      setSavingMapping(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const result = await triggerManualSync(integrationIdNum);
      setSyncResult(result);
      const updated = await getGoogleSheetsIntegration(
        accountIdNum,
        integrationIdNum,
      );
      setIntegration(updated);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to sync Google Sheet.",
      );
    } finally {
      setSyncing(false);
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
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-[24px] font-medium text-forest-f60">
                    {integration.name}
                  </h1>
                  <p className="text-[14px] text-forest-f30 mt-1">
                    {integration.spreadsheet_name} · {integration.sheet_name} ·{" "}
                    {integration.range}
                  </p>
                  <p className="text-[13px] text-forest-f30 mt-0.5">
                    Last synced:{" "}
                    {integration.last_synced_at
                      ? new Date(
                          integration.last_synced_at,
                        ).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/brands/${accountId}/google-sheets/integrations`)
                    }
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <Button onClick={handleSync} disabled={syncing}>
                    {syncing ? "Syncing..." : "Manual Sync"}
                  </Button>
                </div>
              </div>

              {syncResult && (
                <Banner
                  type="success"
                  message={`Synced ${syncResult.rows_processed} rows · Inserted ${syncResult.rows_inserted}, Updated ${syncResult.rows_updated}`}
                  dismissable
                  onDismiss={() => setSyncResult(null)}
                  className="mb-4"
                />
              )}

              {integration.instructions && (
                <div className="mb-6 p-4 bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px]">
                  <h2 className="text-[16px] font-medium text-forest-f60 mb-2">
                    Instructions (how to use this sheet)
                  </h2>
                  <p className="text-[14px] text-forest-f60 whitespace-pre-wrap">
                    {integration.instructions}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] p-4">
                  <h2 className="text-[16px] font-medium text-forest-f60 mb-3">
                    Column Mapping
                  </h2>
                  <ColumnMapper
                    mapping={mapping}
                    onChange={handleSaveMapping}
                    loading={savingMapping}
                    previewColumns={preview?.columns ?? []}
                  />
                </div>
                <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] p-4">
                  <h2 className="text-[16px] font-medium text-forest-f60 mb-3">
                    Sheet Preview
                  </h2>
                  <SheetPreview columns={preview?.columns ?? []} rows={preview?.rows ?? []} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationPage;

