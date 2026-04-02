import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button, Loader } from "../../components/ui";
import { prismImportService, type ResolvePrismImportSheetTab } from "../../services/prismImport";

export const PrismImportFromSheet: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [sheetUrl, setSheetUrl] = useState("");
  const [headerRow, setHeaderRow] = useState(1);

  const [tabs, setTabs] = useState<ResolvePrismImportSheetTab[]>([]);
  const [selectedTabName, setSelectedTabName] = useState<string>("");

  const [loadingTabs, setLoadingTabs] = useState(false);
  const [startingImport, setStartingImport] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spreadsheetIdForDisplay = useMemo(() => {
    // We don't currently persist it in UI; keep hook for future improvements.
    return null;
  }, []);

  const loadTabs = async () => {
    setError(null);
    setJobId(null);
    setTabs([]);
    setSelectedTabName("");

    if (!sheetUrl.trim()) {
      setError("Please paste a Google Sheet URL.");
      return;
    }

    setLoadingTabs(true);
    try {
      const res = await prismImportService.resolveSheet({ sheet_url: sheetUrl.trim() });
      setTabs(res.tabs || []);
      setSelectedTabName(res.tabs?.[0]?.name ?? "");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || e?.message || "Failed to load sheet tabs.",
      );
    } finally {
      setLoadingTabs(false);
    }
  };

  const startImport = async () => {
    setError(null);
    setJobId(null);

    if (!sheetUrl.trim()) {
      setError("Please paste a Google Sheet URL.");
      return;
    }
    if (!selectedTabName) {
      setError("Please select a sheet tab.");
      return;
    }

    setStartingImport(true);
    try {
      const res = await prismImportService.startImport({
        sheet_url: sheetUrl.trim(),
        tab_name: selectedTabName,
        header_row: headerRow,
      });
      setJobId(res.job_id);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Failed to start import.",
      );
    } finally {
      setStartingImport(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="px-8 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8">
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-[24px] font-medium text-forest-f60">
                Prism Import (Hidden)
              </h1>
              <p className="text-[14px] text-forest-f30 mt-1">
                Paste the migration sheet URL, pick the tab, and start the Celery import job.
                The request returns immediately; row updates happen asynchronously.
              </p>
            </div>

            {error && (
              <div className="mb-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}

            <div className="space-y-3 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl p-6">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-forest-f60">
                  Sheet URL
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-2 border border-[#E8E8E3] rounded-lg focus:ring-2 focus:ring-[#072929] focus:border-[#072929] text-[14px] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-forest-f60">
                    Header row (1-based)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={headerRow}
                    onChange={(e) => setHeaderRow(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-[#E8E8E3] rounded-lg focus:ring-2 focus:ring-[#072929] focus:border-[#072929] text-[14px] outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={loadTabs}
                    disabled={loadingTabs || startingImport}
                    variant="outline"
                    size="sm"
                  >
                    {loadingTabs ? "Loading..." : "Load tabs"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-forest-f60">
                  Sheet tab
                </label>
                <select
                  value={selectedTabName}
                  onChange={(e) => setSelectedTabName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E8E8E3] rounded-lg focus:ring-2 focus:ring-[#072929] focus:border-[#072929] text-[14px] outline-none"
                  disabled={tabs.length === 0}
                >
                  {tabs.length === 0 ? (
                    <option value="">No tabs loaded</option>
                  ) : (
                    tabs.map((t) => (
                      <option key={String(t.gid)} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={startImport}
                  disabled={startingImport || loadingTabs || !selectedTabName}
                >
                  {startingImport ? "Starting..." : "Start import"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/super-admin/workspaces")}
                  disabled={startingImport}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {jobId && (
              <div className="bg-[#F5F5F5] border border-[#E8E8E3] rounded-2xl p-4">
                <div className="text-[13px] text-forest-f30">Job started</div>
                <div className="text-[14px] font-medium text-forest-f60 mt-1">
                  job_id: {jobId}
                </div>
              </div>
            )}

            {(loadingTabs || startingImport) && (
              <div className="flex items-center justify-center pt-2">
                <Loader size="sm" message={loadingTabs ? "Loading tabs..." : "Starting import..."} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

