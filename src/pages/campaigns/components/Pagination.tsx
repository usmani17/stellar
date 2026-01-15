import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}) => {
  if (loading || totalPages === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-end mt-4">
      <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                currentPage === pageNum
                  ? "bg-white text-[#136D6D] font-semibold"
                  : "text-black hover:bg-gray-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        {totalPages > 5 && currentPage < totalPages - 2 && (
          <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
            ...
          </span>
        )}
        {totalPages > 5 && (
          <button
            onClick={() => onPageChange(totalPages)}
            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
              currentPage === totalPages
                ? "bg-white text-[#136D6D] font-semibold"
                : "text-black hover:bg-gray-50"
            }`}
          >
            {totalPages}
          </button>
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
};

