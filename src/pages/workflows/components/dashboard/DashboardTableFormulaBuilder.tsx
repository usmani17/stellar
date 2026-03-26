import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../../lib/cn";
import {
  validateDashboardTableFormula,
  getFormulaDisplaySegments,
} from "../../utils/evaluateDashboardTableFormula";

interface DashboardTableFormulaBuilderProps {
  value: string;
  onChange: (formula: string) => void;
  availableColumnKeys: string[];
  isDark?: boolean;
  error?: string | null;
}

/** Contenteditable formula input with real tag spans (contenteditable=false) so cursor cannot land inside column names */
export const DashboardTableFormulaBuilder: React.FC<DashboardTableFormulaBuilderProps> = ({
  value,
  onChange,
  availableColumnKeys,
  isDark = false,
  error: externalError,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isInternalUpdateRef = useRef(false);
  const shouldRestoreFocusRef = useRef(false);

  const validationError = validateDashboardTableFormula(value, availableColumnKeys);
  const hasError = externalError || validationError;

  const filteredColumns = availableColumnKeys.filter((key) =>
    key.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const syncToParent = useCallback(
    (v: string) => {
      const normalized = v.replace(/\s+/g, " ").trim();
      if (normalized !== value) onChange(normalized);
    },
    [value, onChange]
  );

  const getFormulaFromDom = useCallback((): string => {
    const el = editableRef.current;
    if (!el) return "";
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (node.nodeType === Node.ELEMENT_NODE) {
        const e = node as HTMLElement;
        if (e.dataset.column) return e.dataset.column;
        return Array.from(node.childNodes).map(walk).join("");
      }
      return "";
    };
    return Array.from(el.childNodes).map(walk).join("");
  }, []);

  const getTextBeforeCursor = useCallback((): string => {
    const el = editableRef.current;
    if (!el) return "";
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return "";
    if (!el.contains(sel.anchorNode)) return "";
    try {
      const range = document.createRange();
      range.setStart(el, 0);
      range.setEnd(sel.anchorNode, sel.anchorOffset);
      return range.toString();
    } catch {
      return "";
    }
  }, []);

  const getCursorOffset = useCallback((): number => {
    const el = editableRef.current;
    if (!el) return 0;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return 0;
    if (!el.contains(sel.anchorNode)) return 0;
    try {
      const range = document.createRange();
      range.setStart(el, 0);
      range.setEnd(sel.anchorNode, sel.anchorOffset);
      return range.toString().length;
    } catch {
      return 0;
    }
  }, []);

  const setCursorToOffset = useCallback((offset: number) => {
    const el = editableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;
    const formulaLen = getFormulaFromDom().length;
    if (offset === 0) {
      const range = document.createRange();
      range.setStart(el, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      el.focus();
      return;
    }
    if (offset >= formulaLen && el.childNodes.length > 0) {
      const range = document.createRange();
      range.setStart(el, el.childNodes.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      el.focus();
      return;
    }
    let pos = 0;
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i]!;
      const len =
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent?.length ?? 0)
          : node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset?.column
            ? ((node as HTMLElement).textContent ?? "").length
            : 0;
      if (offset <= pos + len) {
        if (node.nodeType === Node.TEXT_NODE) {
          const range = document.createRange();
          range.setStart(node, Math.min(offset - pos, len));
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset?.column) {
          const range = document.createRange();
          range.setStart(node, offset <= pos ? 0 : 1);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
      pos += len;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [getFormulaFromDom]);

  const rebuildDomFromValue = useCallback(
    (formula: string, restoreOffset?: number) => {
      const el = editableRef.current;
      if (!el) return;
      const cursorOffset = restoreOffset ?? getCursorOffset();
      const segments = getFormulaDisplaySegments(formula, availableColumnKeys);
      el.innerHTML = "";
      segments.forEach((seg) => {
        if (seg.type === "tag") {
          const span = document.createElement("span");
          span.contentEditable = "false";
          span.dataset.column = seg.value;
          span.className = cn(
            "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[13px] font-medium align-middle mx-1",
            isDark
              ? "bg-[#2DD4BF]/22 text-[#2DD4BF] border border-[#2DD4BF]/40"
              : "bg-[#E6F2F2] text-[#136D6D] border border-[#B8E0E0]"
          );
          span.textContent = seg.value;
          el.appendChild(span);
        } else {
          el.appendChild(document.createTextNode(seg.value));
        }
      });
      el.focus();
      requestAnimationFrame(() => {
        const len = formula.replace(/\s+/g, " ").trim().length;
        setCursorToOffset(Math.min(cursorOffset, len));
        el.focus();
      });
    },
    [availableColumnKeys, isDark, getCursorOffset, setCursorToOffset]
  );

  const restoreFocus = useCallback(() => {
    editableRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isInternalUpdateRef.current) return;
    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      restoreFocus();
      setTimeout(restoreFocus, 0);
      setTimeout(restoreFocus, 100);
      return;
    }
    rebuildDomFromValue(localValue);
  }, [localValue, rebuildDomFromValue, restoreFocus]);

  const updateDropdownPosition = useCallback(() => {
    if (editableRef.current) {
      const rect = editableRef.current.getBoundingClientRect();
      setDropdownRect(rect);
    }
  }, []);

  useEffect(() => {
    if (showSuggestions) updateDropdownPosition();
    else setDropdownRect(null);
  }, [showSuggestions, filteredColumns.length, updateDropdownPosition]);

  const syncFromDom = useCallback(() => {
    const v = getFormulaFromDom();
    const normalized = v.replace(/\s+/g, " ").trim();
    if (normalized !== localValue) {
      isInternalUpdateRef.current = true;
      setLocalValue(normalized);
      syncToParent(normalized);
      restoreFocus();
      requestAnimationFrame(() => {
        restoreFocus();
        isInternalUpdateRef.current = false;
      });
    }
  }, [getFormulaFromDom, localValue, syncToParent, restoreFocus]);

  const handleInput = useCallback(() => {
    const before = getTextBeforeCursor();
    const atMatch = before.match(/@([a-zA-Z0-9_.]*)$/);
    if (atMatch) {
      setShowSuggestions(true);
      setQuery(atMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
    syncFromDom();
  }, [getTextBeforeCursor, syncFromDom]);

  const getNodeAtOffset = useCallback(
    (targetOffset: number): { node: Node; offset: number } => {
      const el = editableRef.current!;
      let pos = 0;
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i]!;
        const len =
          node.nodeType === Node.TEXT_NODE
            ? (node.textContent?.length ?? 0)
            : node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset?.column
              ? ((node as HTMLElement).textContent ?? "").length
              : 0;
        if (targetOffset <= pos + len) {
          if (node.nodeType === Node.TEXT_NODE) {
            return { node, offset: Math.min(targetOffset - pos, len) };
          }
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset?.column) {
            return { node, offset: targetOffset <= pos ? 0 : 1 };
          }
        }
        pos += len;
      }
      return { node: el, offset: el.childNodes.length };
    },
    []
  );

  const insertColumn = useCallback(
    (key: string) => {
      const el = editableRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const before = getTextBeforeCursor();
      const atMatch = before.match(/@[a-zA-Z0-9_.]*$/);
      if (atMatch) {
        const start = getNodeAtOffset(Math.max(0, before.length - atMatch[0].length));
        range.setStart(start.node, start.offset);
        range.deleteContents();
      }

      const textBeforeAt = before.slice(0, before.length - (atMatch?.[0]?.length ?? 0));
      const needsSpaceBefore = textBeforeAt.length > 0 && !/[\s(]$/.test(textBeforeAt);
      if (needsSpaceBefore) {
        range.insertNode(document.createTextNode(" "));
        range.collapse(false);
      }

      const span = document.createElement("span");
      span.contentEditable = "false";
      span.dataset.column = key;
      span.className = cn(
        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[13px] font-medium align-middle mx-1",
        isDark
          ? "bg-[#2DD4BF]/22 text-[#2DD4BF] border border-[#2DD4BF]/40"
          : "bg-[#E6F2F2] text-[#136D6D] border border-[#B8E0E0]"
      );
      span.textContent = key;
      range.insertNode(span);
      range.setStartAfter(span);
      range.collapse(true);
      const space = document.createTextNode(" ");
      range.insertNode(space);
      range.setStartAfter(space);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      const newVal = getFormulaFromDom();
      const normalized = newVal.replace(/\s+/g, " ").trim();
      shouldRestoreFocusRef.current = true;
      setShowSuggestions(false);
      setLocalValue(normalized);
      syncToParent(normalized);
      restoreFocus();
      setTimeout(restoreFocus, 100);
      setTimeout(restoreFocus, 300);
    },
    [getTextBeforeCursor, getNodeAtOffset, getFormulaFromDom, isDark, syncToParent, restoreFocus]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        (e.metaKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        e.preventDefault();
        const formula = getFormulaFromDom();
        const len = formula.length;
        const goStart = e.key === "ArrowLeft" || e.key === "Home";
        setCursorToOffset(goStart ? 0 : len);
        return;
      }

      if (showSuggestions && filteredColumns.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filteredColumns.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filteredColumns.length) % filteredColumns.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertColumn(filteredColumns[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          setShowSuggestions(false);
          return;
        }
      }

      if (e.key === "Backspace") {
        const el = editableRef.current;
        const sel = window.getSelection();
        if (!el || !sel || sel.rangeCount === 0 || !sel.anchorNode) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          const node = sel.anchorNode;
          const offset = sel.anchorOffset;
          let prev: Node | null = null;
          if (node === el) {
            prev = offset > 0 ? el.childNodes[offset - 1] ?? null : null;
          } else if (offset === 0) {
            prev = node.previousSibling;
          }
          if (prev && prev.nodeType === Node.ELEMENT_NODE) {
            const prevEl = prev as HTMLElement;
            if (prevEl.dataset?.column && prevEl.contentEditable === "false") {
              e.preventDefault();
              prevEl.remove();
              syncFromDom();
              return;
            }
          }
        }
      }
    },
    [showSuggestions, filteredColumns, selectedIndex, insertColumn, availableColumnKeys, syncFromDom, getTextBeforeCursor, getFormulaFromDom, setCursorToOffset]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      syncFromDom();
    },
    [syncFromDom]
  );

  useEffect(() => {
    if (showSuggestions && listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [showSuggestions, selectedIndex]);

  const containerClass = cn(
    "rounded border",
    isDark ? "bg-neutral-700 border-neutral-600" : "bg-sandstorm-s5 border-sandstorm-s40"
  );

  const dropdownPortal =
    showSuggestions &&
    filteredColumns.length > 0 &&
    dropdownRect &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "fixed max-h-40 overflow-y-auto rounded-lg border shadow-lg",
              isDark ? "bg-neutral-800 border-neutral-600" : "bg-white border-sandstorm-s40"
            )}
            style={{
              left: dropdownRect.left,
              bottom: window.innerHeight - dropdownRect.top + 4,
              width: dropdownRect.width,
              zIndex: 99999,
            }}
          >
            {filteredColumns.map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => insertColumn(key)}
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm font-mono",
                  i === selectedIndex
                    ? isDark
                      ? "bg-[#2DD4BF]/20 text-[#2DD4BF]"
                      : "bg-forest-f40/10 text-forest-f40"
                    : isDark
                      ? "text-neutral-200 hover:bg-neutral-700"
                      : "text-forest-f60 hover:bg-sandstorm-s20"
                )}
              >
                {key}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("relative", containerClass)}>
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          data-placeholder="Type formula (e.g. impressions * 3). Use @ to add a column."
          className={cn(
            "min-h-[42px] px-3 py-2 text-sm outline-none font-mono w-full overflow-x-auto",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-forest-f30",
            isDark
              ? "text-neutral-100 empty:before:text-neutral-500"
              : "text-forest-f60"
          )}
          style={{ caretColor: isDark ? "#2DD4BF" : "#136D6D" }}
          aria-label="Formula"
        />
      </div>
      {dropdownPortal}
      {availableColumnKeys.length > 0 && (
        <p className={cn("text-[11px]", isDark ? "text-neutral-400" : "text-forest-f30")}>
          Tip: Type{" "}
          <kbd
            className={cn(
              "inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded text-xs font-mono font-semibold",
              isDark ? "bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40" : "bg-[#E6F2F2] text-[#136D6D] border border-[#B8E0E0]"
            )}
          >
            @
          </kbd>{" "}
          to insert a column. Columns are tags — Backspace removes the whole column.
        </p>
      )}
      {hasError && (
        <p className={cn("text-xs", isDark ? "text-red-400" : "text-red-r30")}>
          {externalError || validationError}
        </p>
      )}
    </div>
  );
};
