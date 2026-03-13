import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Button,
  Loader,
  Banner,
} from "../../../components/ui";
import { Sidebar } from "../../../components/layout/Sidebar";
import { DashboardHeader } from "../../../components/layout/DashboardHeader";
import { useSidebar } from "../../../contexts/SidebarContext";
import {
  getGoogleSheetsConnectUrl,
  listGoogleSheetsIntegrations,
} from "./api";
import type { GoogleSheetsIntegration } from "./api";

export const GoogleSheetsIntegrationsPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : NaN;
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [integrations, setIntegrations] = useState<GoogleSheetsIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listGoogleSheetsIntegrations(accountIdNum);
        setIntegrations(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.detail ||
            "Failed to load Google Sheets integrations.",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountIdNum, navigate]);

  const handleConnectGoogle = async () => {
    if (!accountIdNum) return;
    setError(null);
    setLoading(true);
    try {
      const url = await getGoogleSheetsConnectUrl(accountIdNum);
      window.location.href = url;
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to start Google Sheets connection.",
      );
      setLoading(false);
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
              {loading ? "Adding..." : "Add integration"}
            </Button>
          </div>

          <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-hidden">
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Name</th>
                      <th className="table-header">Spreadsheet</th>
                      <th className="table-header">Sheet</th>
                      <th className="table-header">Range</th>
                      <th className="table-header">Created</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrations.map((integration) => (
                      <tr key={integration.id} className="table-row">
                        <td className="table-cell">
                          <Link
                            to={`/brands/${accountId}/google-sheets/${integration.id}`}
                            className="table-edit-link"
                          >
                            {integration.name}
                          </Link>
                        </td>
                        <td className="table-cell">
                          <span className="table-text">
                            {integration.spreadsheet_name}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="table-text">
                            {integration.sheet_name}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="table-text">
                            {integration.range}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="table-text whitespace-nowrap">
                            {new Date(
                              integration.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="table-cell">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate(
                                `/brands/${accountId}/google-sheets/${integration.id}`,
                              )
                            }
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegrationsPage;

