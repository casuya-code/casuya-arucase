/**
 * Pre-Form One Pagination
 * Numbered pagination style: Previous 1 2 3 ... Next
 * Used across all Pre-Form One pages for a consistent look.
 */
import React from 'react';

const PreFormOnePagination = ({ currentPage, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="pagination-controls">
      <button
        type="button"
        className="excel-btn secondary small"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <i className="fas fa-chevron-left" aria-hidden="true"></i> Previous
      </button>
      <div className="pagination-pages">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`excel-btn small ${page === currentPage ? 'primary' : 'secondary'}`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="excel-btn secondary small"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        Next <i className="fas fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  );
};

export default PreFormOnePagination;