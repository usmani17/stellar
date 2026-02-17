import React, { useRef, useEffect, useState } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW } from "../../contexts/AssistantContext";
import { GripVertical } from "lucide-react";
import { AssistantPanel } from "../ai/AssistantPanel";


const DEFAULT_PANEL_WIDTH = 550;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 1400;
const ASSISTANT_PANEL_WIDTH_KEY = "stellar-assistant-panel-width";

function getStoredPanelWidth(): number {
  try {
    const stored = localStorage.getItem(ASSISTANT_PANEL_WIDTH_KEY);
    if (stored != null) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, n));
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANEL_WIDTH;
}

function setStoredPanelWidth(width: number): void {
  try {
    localStorage.setItem(ASSISTANT_PANEL_WIDTH_KEY, String(width));
  } catch {
    // ignore
  }
}

// Wrapper component that renders the Assistant panel with slide-up/slide-down animation
export const Assistant: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const { isOpen } = useAssistant();
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setStoredPanelWidth(panelWidth);
  }, [panelWidth]);

  const isFixed = ASSISTANT_PANEL_VIEW === "fixed";
  const widthCss = `${panelWidth}px`;

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    setIsResizing(true);
    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const delta = start.startX - ev.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, start.startWidth + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResizeDoubleClick = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    setStoredPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  return (
    <div className={`bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex ${isFixed ? "relative" : ""}`}>
      {/* Main Content */}
      <div
        style={isOpen && isFixed ? { marginRight: widthCss } : undefined}
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar`}
      >
        {children}
      </div>

      {/* Assistant Sidebar - show when open */}
      {isOpen && (
        <div
          className={`${isFixed ? "fixed" : "absolute"} right-0 top-0 bottom-0 z-[45] bg-[var(--color-semantic-background-primary)] transition-[width] duration-200 ease-out ${isFixed ? "border-l border-gray-200" : "rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
            }`}
          style={{ width: widthCss }}
        >
          {/* Resize handle - left edge, vertically centered; thin strip with grip */}
          <div
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResizeDoubleClick}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-2 h-16 flex items-center justify-center rounded-r cursor-col-resize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#136D6D] focus-visible:ring-offset-1 ${isResizing
                ? "bg-[#136D6D] text-white"
                : "bg-[#e0e0dc] hover:bg-[#136D6D]/80 text-[#072929] hover:text-white border border-r-0 border-[#d0d0cc]"
              }`}
            title="Drag to resize · Double-click to reset"
            aria-label="Resize assistant panel"
            tabIndex={0}
          >
            <GripVertical className="w-3 h-3 opacity-70" strokeWidth={2} />
          </div>
          <AssistantPanel className={`h-full ${isFixed ? "" : "rounded-l-2xl overflow-hidden"}`} />
        </div>
      )}
    </div>
  );
};


