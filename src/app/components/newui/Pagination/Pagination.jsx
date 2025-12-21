import React from 'react';
import styles from './Pagination.module.scss';

const Pagination = ({ 
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  size = 'mid',
  rootClass = '',
  showFirstLast = true,
  showPrevNext = true,
  siblingCount = 1,
  disabled = false
}) => {
  const handlePageChange = (page) => {
    if (page === currentPage || page < 1 || page > totalPages || disabled) return;
    onPageChange?.(page);
  };

  const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );

  const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );

  const ChevronsLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7"></polyline>
      <polyline points="18 17 13 12 18 7"></polyline>
    </svg>
  );

  const ChevronsRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7"></polyline>
      <polyline points="6 17 11 12 6 7"></polyline>
    </svg>
  );

  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];

    const pages = [];
    
    // Calculate range
    const leftSibling = Math.max(currentPage - siblingCount, 2);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages - 1);

    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    // First page always visible
    pages.push(1);

    if (totalPages === 2) {
      pages.push(2);
      return pages;
    }

    // Left dots or page 2
    if (showLeftDots) {
      pages.push('left-dots');
    } else {
      // Fill gap between 1 and leftSibling
      for (let i = 2; i < leftSibling; i++) {
        pages.push(i);
      }
    }

    // Middle pages
    for (let i = leftSibling; i <= rightSibling; i++) {
      pages.push(i);
    }

    // Right dots or second-to-last page
    if (showRightDots) {
      pages.push('right-dots');
    } else {
      // Fill gap between rightSibling and last page
      for (let i = rightSibling + 1; i < totalPages; i++) {
        pages.push(i);
      }
    }

    // Last page always visible
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`${styles.pagination} ${styles[size]} ${disabled ? styles.disabled : ''} ${rootClass}`}>
      {/* First Page Button */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1 || disabled}
          className={`${styles.button} ${styles.navButton}`}
          aria-label="First page"
        >
          <ChevronsLeft />
        </button>
      )}

      {/* Previous Button */}
      {showPrevNext && (
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          className={`${styles.button} ${styles.navButton}`}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>
      )}

      {/* Page Numbers */}
      <div className={styles.pages}>
        {pageNumbers.map((page, index) => {
          if (page === 'left-dots' || page === 'right-dots') {
            return (
              <span key={`dots-${index}`} className={styles.dots}>
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              onClick={() => handlePageChange(page)}
              disabled={disabled}
              className={`${styles.button} ${styles.pageButton} ${
                currentPage === page ? styles.active : ''
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      {showPrevNext && (
        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
          className={`${styles.button} ${styles.navButton}`}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      )}

      {/* Last Page Button */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || disabled}
          className={`${styles.button} ${styles.navButton}`}
          aria-label="Last page"
        >
          <ChevronsRight />
        </button>
      )}
    </div>
  );
};

export default Pagination;