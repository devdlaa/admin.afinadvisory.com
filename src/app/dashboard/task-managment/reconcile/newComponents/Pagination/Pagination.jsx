import React from 'react';
import styles from './Pagination.module.scss';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationLeft}>
        <span className={styles.itemsInfo}>
          Showing {startItem} to {endItem} of {totalItems} items
        </span>
      </div>

      <div className={styles.paginationCenter}>
        <button 
          className={styles.pageButton}
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <div className={styles.pageNumbers}>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <button 
          className={styles.pageButton}
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.paginationRight}>
        <label className={styles.itemsPerPageLabel}>Items per page:</label>
        <select 
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className={styles.itemsPerPageSelect}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
};

export default Pagination;