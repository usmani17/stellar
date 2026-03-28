import React, { useState } from "react";
import { ChevronDown, Circle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { TodoItem, TodoStatus } from "../../services/ai/pixisChat";

interface TodoPanelProps {
  todos: TodoItem[];
  defaultExpanded?: boolean;
}

const STATUS_ICON: Record<TodoStatus, React.ReactNode> = {
  TODO_STATUS_PENDING: <Circle className="w-3 h-3 text-forest-f30/50 shrink-0" />,
  TODO_STATUS_IN_PROGRESS: <Loader2 className="w-3 h-3 text-forest-f40 animate-spin shrink-0" />,
  TODO_STATUS_COMPLETE: <CheckCircle2 className="w-3 h-3 text-forest-f40 shrink-0" />,
  TODO_STATUS_COMPLETED: <CheckCircle2 className="w-3 h-3 text-forest-f40 shrink-0" />,
  TODO_STATUS_CANCELLED: <XCircle className="w-3 h-3 text-red-r30/60 shrink-0" />,
};

function isComplete(s: TodoStatus): boolean {
  return s === "TODO_STATUS_COMPLETE" || s === "TODO_STATUS_COMPLETED";
}

function isCancelled(s: TodoStatus): boolean {
  return s === "TODO_STATUS_CANCELLED";
}

export const TodoPanel: React.FC<TodoPanelProps> = ({
  todos,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completedCount = todos.filter((t) => isComplete(t.status)).length;

  if (todos.length === 0) return null;

  return (
    <div className="activity-card">
      <button
        type="button"
        className="todo-panel-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="todo-panel-title">
          To-dos
          <span className="todo-panel-count">
            {completedCount}/{todos.length}
          </span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-forest-f30 transition-transform duration-200 ${
            expanded ? "" : "-rotate-90"
          }`}
        />
      </button>
      {expanded && (
        <div className="todo-panel-list">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`todo-row ${
                isComplete(todo.status) || isCancelled(todo.status)
                  ? "todo-row-done"
                  : todo.status === "TODO_STATUS_IN_PROGRESS"
                  ? "todo-row-active"
                  : ""
              }`}
            >
              {STATUS_ICON[todo.status]}
              <span className="todo-row-text">{todo.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
