import React from "react";
import { Calendar } from "lucide-react";
import type { ScheduleConfig } from "../../../services/workflows";
import { computeNextRuns } from "../utils/scheduleUtils";

interface NextRunsPreviewProps {
  schedule: ScheduleConfig;
}

export const NextRunsPreview: React.FC<NextRunsPreviewProps> = ({
  schedule,
}) => {
  const runs = computeNextRuns(schedule, 5);

  return (
    <div>
      <label className="block text-[13px] font-medium text-forest-f60 mb-1">
        Upcoming Runs
      </label>
      {runs.length === 0 ? (
        <div className="flex items-center gap-2 text-forest-f30 text-[13px] py-2 px-3 bg-sandstorm-s5 rounded-lg border border-sandstorm-s40">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Configure a schedule to see upcoming runs</span>
        </div>
      ) : (
        <ul className="space-y-1">
          {runs.map((run, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-[13px] text-forest-f60 py-1 px-2.5 rounded-lg bg-sandstorm-s5 border border-sandstorm-s40"
            >
              <span className="w-4 h-4 rounded-full bg-forest-f40 text-white text-[9px] font-medium flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span>{run.formatted}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
