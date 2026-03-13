import React from "react";
import { GoogleSpreadsheet } from "./api";

interface Props {
  spreadsheets: GoogleSpreadsheet[];
  value: string;
  onChange: (id: string) => void;
}

export const SpreadsheetSelector: React.FC<Props> = ({
  spreadsheets,
  value,
  onChange,
}) => {
  return (
    <div className="space-y-1">
      <label className="text-[13px] text-forest-f30">Spreadsheet</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-2 py-1 text-[12px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
      >
        <option value="">Select spreadsheet</option>
        {spreadsheets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SpreadsheetSelector;

