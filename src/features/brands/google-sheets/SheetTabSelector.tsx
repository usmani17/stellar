import React from "react";
import { GoogleSheetTab } from "./api";

interface Props {
  tabs: GoogleSheetTab[];
  value: string;
  onChange: (name: string) => void;
}

export const SheetTabSelector: React.FC<Props> = ({ tabs, value, onChange }) => {
  return (
    <div className="space-y-1">
      <label className="text-[13px] text-forest-f30">Sheet tab</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-2 py-1 text-[12px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
      >
        <option value="">Select sheet tab</option>
        {tabs.map((t) => (
          <option key={t.gid} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SheetTabSelector;

