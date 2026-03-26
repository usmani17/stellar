import React, { useEffect } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { ChatHistorySidebar } from "../components/ai/ChatHistorySidebar";
import { AssistantPanel } from "../components/ai/AssistantPanel";
import { useSidebar } from "../contexts/SidebarContext";
import { ChatHistorySidebarProvider } from "../contexts/ChatHistorySidebarContext";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";

export const AssistantPage: React.FC = () => {
  const { sidebarWidth } = useSidebar();

  useEffect(() => {
    setPageTitle("Chat");
    return () => {
      resetPageTitle();
    };
  }, []);

  return (
    <ChatHistorySidebarProvider>
      <div className="h-screen min-h-0 bg-white flex overflow-hidden">
        <Sidebar />

        <div
          className="flex-1 flex overflow-hidden min-h-0"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <ChatHistorySidebar />

          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-sandstorm-s0 overflow-hidden">
            <AssistantPanel
              className="flex-1 rounded-none shadow-none"
              variant="page"
            />
          </main>
        </div>
      </div>
    </ChatHistorySidebarProvider>
  );
};
