import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Button,
  Loader,
  Banner,
  ConfirmationModal,
} from "../../../components/ui";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import {
  listGoogleSheetsIntegrations,
  deleteGoogleSheetsIntegration,
  triggerManualSync,
} from "./api";
import type { GoogleSheetsIntegration } from "./api";

const PAGE_SIZE = 10;

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

export const GoogleSheetsIntegrationsPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [integrations, setIntegrations] = useState<GoogleSheetsIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<GoogleSheetsIntegration | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState<number | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!accountIdNum) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listGoogleSheetsIntegrations(accountIdNum);
      setIntegrations(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(
        err?.response?.data?.detail ||
        "Failed to load Google Sheets integrations.",
      );
    } finally {
      setLoading(false);
    }
  }, [accountIdNum]);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }
    loadIntegrations();
  }, [accountIdNum, navigate, loadIntegrations]);

  const handleConnectGoogle = () => {
    if (!accountIdNum) return;
    navigate(`/brands/${accountId}/google-sheets/create`);
  };

  const handleDeleteClick = (integration: GoogleSheetsIntegration) => {
    setDeleteTarget(integration);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !accountIdNum) return;
    setDeleteLoading(true);
    try {
      await deleteGoogleSheetsIntegration(accountIdNum, deleteTarget.id);
      setDeleteTarget(null);
      await loadIntegrations();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to delete integration.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSyncClick = async (integration: GoogleSheetsIntegration) => {
    setSyncingIntegrationId(integration.id);
    setError(null);
    try {
      await triggerManualSync(integration.id);
      await loadIntegrations();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to sync.");
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(integrations.length / PAGE_SIZE));
  const paginatedIntegrations = integrations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[24px] font-medium text-forest-f60">
                Google Sheets Integrations
              </h1>
              <p className="text-[14px] text-forest-f30 mt-1">
                Connect Google Sheets and configure sheet imports for this brand.
              </p>
            </div>
            <Button
              className="create-entity-button"
              onClick={handleConnectGoogle}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Google Sheet"}
            </Button>
          </div>

          <div className="">
            {loading && integrations.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader size="md" message="Loading integrations..." />
              </div>
            ) : integrations.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-[14px] text-forest-f30 mb-3">
                  No Google Sheets integrations yet.
                </p>
                <p className="text-[13px] text-forest-f30 mb-4">
                  Connect Google Sheets to create your first integration.
                </p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[900px] w-full">
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          <th className="table-header text-left py-3 px-4 min-w-[160px]">
                            Name
                          </th>
                          <th className="table-header text-left py-3 px-4 min-w-[180px]">
                            Spreadsheet
                          </th>
                          <th className="table-header text-left py-3 px-4 min-w-[120px]">
                            Sheet
                          </th>
                          <th className="table-header text-left py-3 px-4 min-w-[120px]">
                            Last Synced
                          </th>
                          <th className="table-header text-left py-3 px-4 min-w-[100px]">
                            Created
                          </th>
                          <th className="table-header text-left py-3 px-4 min-w-[140px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedIntegrations.map((integration) => (
                          <tr
                            key={integration.id}
                            className="table-row border-b border-[#e8e8e3]"
                          >
                            <td className="table-cell py-3 px-4">
                              <Link
                                to={`/brands/${accountId}/google-sheets/view/${integration.id}`}
                                className="table-edit-link"
                              >
                                {integration.name}
                              </Link>
                            </td>
                            <td className="table-cell py-3 px-4">
                              <span className="table-text">
                                {integration.spreadsheet_name}
                              </span>
                            </td>
                            <td className="table-cell py-3 px-4">
                              <span className="table-text">
                                {integration.sheet_name}
                              </span>
                            </td>
                            <td className="table-cell py-3 px-4">
                              <span className="table-text whitespace-nowrap">
                                {integration.last_synced_at
                                  ? new Date(
                                    integration.last_synced_at,
                                  ).toLocaleString()
                                  : "—"}
                              </span>
                            </td>
                            <td className="table-cell py-3 px-4">
                              <span className="table-text whitespace-nowrap">
                                {new Date(
                                  integration.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="table-cell py-3 px-4">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/brands/${accountId}/google-sheets/edit/${integration.id}`,
                                    )
                                  }
                                  className="table-edit-icon"
                                  title="Edit"
                                  aria-label="Edit"
                                >
                                  <svg
                                    className="w-4 h-4 text-[#556179]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSyncClick(integration)}
                                  disabled={syncingIntegrationId === integration.id}
                                >
                                  {syncingIntegrationId === integration.id
                                    ? "Syncing..."
                                    : "Sync"}
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(integration)}
                                  disabled={deleteLoading}
                                  className="p-2 rounded-lg text-[#556179] hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete"
                                  aria-label="Delete"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination - same as Google campaign page */}
                {(totalPages > 1 || integrations.length > 0) && (
                  <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          pageNum = Math.max(
                            1,
                            Math.min(pageNum, totalPages),
                          );
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                          ...
                        </span>
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
                            ? "bg-white text-[#136D6D] font-semibold"
                            : "text-black hover:bg-gray-50"
                            }`}
                        >
                          {totalPages}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <ConfirmationModal
            isOpen={!!deleteTarget}
            onClose={() => !deleteLoading && setDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
            title="Delete integration"
            message={
              deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"?`
                : ""
            }
            confirmButtonLabel="Delete"
            cancelButtonLabel="Cancel"
            type="danger"
            isLoading={deleteLoading}
            loadingLabel="Deleting..."
          />
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationsPage;

