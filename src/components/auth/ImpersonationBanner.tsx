import React, { useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const ImpersonationBanner: React.FC = () => {
  const { user, isImpersonating, stopImpersonating } = useAuth();

  useEffect(() => {
    if (isImpersonating) {
      document.documentElement.classList.add("is-impersonating");
    } else {
      document.documentElement.classList.remove("is-impersonating");
    }
    return () => document.documentElement.classList.remove("is-impersonating");
  }, [isImpersonating]);

  if (!isImpersonating) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-yellow-y10 px-4 py-2 text-sm font-medium text-white shadow-sm h-9">
        <span>
          Viewing as{" "}
          <strong>
            {user?.first_name} {user?.last_name} ({user?.email})
          </strong>
        </span>
        <button
          onClick={stopImpersonating}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          aria-label="Stop impersonating"
        >
          <LogOut className="w-3.5 h-3.5" />
          Stop Impersonating
        </button>
      </div>
      <div className="h-9" />
    </>
  );
};
