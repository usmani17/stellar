import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { SuperAdminRoute } from "../components/auth/SuperAdminRoute";
import { Layout } from "../components/layout/Layout";
import { SuperAdminWorkspaces } from "../pages/super-admin/SuperAdminWorkspaces";
import { PrismImportFromSheet } from "../pages/super-admin/PrismImportFromSheet";

function SuperAdminRoutes() {
  return (
    <>
      <Route
        path="/super-admin/workspaces"
        element={
          <ProtectedRoute>
            <SuperAdminRoute>
              <Layout>
                <SuperAdminWorkspaces />
              </Layout>
            </SuperAdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/import_from_prism"
        element={
          <ProtectedRoute>
            <SuperAdminRoute>
              <Layout>
                <PrismImportFromSheet />
              </Layout>
            </SuperAdminRoute>
          </ProtectedRoute>
        }
      />
    </>
  );
}

export default SuperAdminRoutes;

