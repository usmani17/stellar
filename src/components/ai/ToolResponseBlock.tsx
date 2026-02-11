

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ThreadMessage } from "../../services/ai/threads";
import { isStringContent } from "../../utils/ai-formatter";

// Component to render tool response - skipped for now
// @ts-ignore
const ToolResponseBlock: React.FC<{ message: ThreadMessage }> = ({ message }) => {
  const isError = message.status === "error";

  return (
    <div className={`border-l-4 pl-3 py-2 my-2 ${isError ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}`}>
      <div className="flex items-center gap-2 mb-2">
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-600" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        )}
        <span className={`text-sm font-medium ${isError ? "text-red-900" : "text-green-900"}`}>
          Tool Response: {message.tool_call_id}
        </span>
      </div>
      <div className={`text-sm ${isError ? "text-red-800" : "text-green-800"}`}>
        {isStringContent(message.content) ? (
          message.content
        ) : (
          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
            {JSON.stringify(message.content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ToolResponseBlock;