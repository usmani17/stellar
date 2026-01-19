import { BrowserRouter as Router } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { GlobalStateProvider } from "./contexts/GlobalStateContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import AppRoutes from "./routes/Index";

function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <AccountsProvider>
          <GlobalStateProvider>
            <SidebarProvider>
              <Router>
                <AppRoutes />
              </Router>
              {import.meta.env.DEV && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </SidebarProvider>
          </GlobalStateProvider>
        </AccountsProvider>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;
