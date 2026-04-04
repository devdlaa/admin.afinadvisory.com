import React, { useState } from "react";

import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2,
  Search,
  User2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";
import styles from "./OutstandingTable.module.scss";
import { formatCurrency } from "@/utils/client/cutils";

const OutstandingTableRow = ({ item }) => {
  return (
    <tr className={styles.outstandingTable__row}>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__entityInfo}>
          <div className={styles.outstandingTable__entityIcon}>
            <User2 size={20} />
          </div>
          <div className={styles.outstandingTable__entityDetails}>
            <div className={styles.outstandingTable__entityName}>
              {item.entity.name}
            </div>
            <div className={styles.outstandingTable__entityEmail}>
              {item.entity.email}
            </div>
          </div>
        </div>
      </td>

      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__amount}>
          {formatCurrency(item.money.service_fee)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__amount}>
          {formatCurrency(item.money.government_fee)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__amount}>
          {formatCurrency(item.money.external_charge)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div
          className={`${styles.outstandingTable__amount} ${styles.outstandingTable__amountTotal}`}
        >
          {formatCurrency(item.money.total_outstanding)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__badge}>
          {item.money.pending_charges_count} charge
          {item.money.pending_charges_count !== 1 ? "s" : ""}
        </div>
      </td>
    </tr>
  );
};

const OutstandingTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, index) => (
        <tr key={index} className={styles.outstandingTable__skeletonRow}>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonEntity}>
              <div className={styles.outstandingTable__skeletonIcon} />
              <div className={styles.outstandingTable__skeletonText}>
                <div className={styles.outstandingTable__skeletonName} />
                <div className={styles.outstandingTable__skeletonEmail} />
              </div>
            </div>
          </td>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonAmount} />
          </td>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonAmount} />
          </td>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonAmount} />
          </td>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonAmount} />
          </td>
          <td className={styles.outstandingTable__cell}>
            <div className={styles.outstandingTable__skeletonBadge} />
          </td>
        </tr>
      ))}
    </>
  );
};

const OutstandingTable = ({
  items = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRefresh,
  selectedEntityId = null,
  onEntitySelect,
  entityOptions = [],
  onEntitySearch,
  isEntitySearching = false,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [isPrevLoading, setIsPrevLoading] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);

  const handlePrevPage = async () => {
    if (currentPage > 1 && !loading && !isPrevLoading && !isNextLoading) {
      setIsPrevLoading(true);
      await onPageChange(currentPage - 1);
      setTimeout(() => setIsPrevLoading(false), 300);
    }
  };

  const handleNextPage = async () => {
    if (
      currentPage < totalPages &&
      !loading &&
      !isPrevLoading &&
      !isNextLoading
    ) {
      setIsNextLoading(true);
      await onPageChange(currentPage + 1);
      setTimeout(() => setIsNextLoading(false), 300);
    }
  };

  const renderSortArrow = (column) => {
    if (sortBy !== column) return null;

    return sortOrder === "asc" ? (
      <ArrowUp size={14} style={{ marginLeft: 6 }} />
    ) : (
      <ArrowDown size={14} style={{ marginLeft: 6 }} />
    );
  };

  return (
    <div className={styles.outstandingTable}>
      {/* Action Bar */}
      <div className={styles.outstandingTable__actionBar}>
        <div className={styles.outstandingTable__title}>
          <h2>Outstanding From Clients</h2>
          <span className={styles.outstandingTable__subtitle}>
            Keep track of accounts receivable.
          </span>
        </div>

        <div className={styles.outstandingTable__actions}>
          <FilterDropdown
            label="Client"
            placeholder="Search for Client"
            icon={Search}
            options={entityOptions}
            selectedValue={selectedEntityId}
            onSelect={(option) => onEntitySelect(option.value)}
            onSearchChange={onEntitySearch}
            isSearching={isEntitySearching}
            emptyStateMessage="No clients found"
            hintMessage="Type to search for clients"
            enableLocalSearch={false}
            className={styles.outstandingTable__filter}
          />

          <Button
            variant="secondary"
            size="md"
            icon={RotateCw}
            onClick={onRefresh}
            loading={loading}
          >
            Refresh
          </Button>

          <div className={styles.outstandingTable__pagination}>
            <button
              className={`${styles.outstandingTable__paginationBtn} ${
                currentPage === 1 || isPrevLoading || isNextLoading
                  ? styles.outstandingTable__paginationBtn__disabled
                  : ""
              }`}
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isPrevLoading || isNextLoading}
            >
              {isPrevLoading ? (
                <Loader2
                  size={16}
                  className={styles.outstandingTable__spinner}
                />
              ) : (
                <ChevronLeft size={16} />
              )}
              <span>Prev</span>
            </button>

            <div className={styles.outstandingTable__paginationInfo}>
              <span className={styles.outstandingTable__paginationCurrent}>
                {currentPage}
              </span>
              <span className={styles.outstandingTable__paginationSeparator}>
                /
              </span>
              <span className={styles.outstandingTable__paginationTotal}>
                {totalPages}
              </span>
            </div>

            <button
              className={`${styles.outstandingTable__paginationBtn} ${styles.outstandingTable__paginationBtn__next} ${
                currentPage === totalPages || isPrevLoading || isNextLoading
                  ? styles.outstandingTable__paginationBtn__disabled
                  : ""
              }`}
              onClick={handleNextPage}
              disabled={
                currentPage === totalPages || isPrevLoading || isNextLoading
              }
            >
              <span>Next</span>
              {isNextLoading ? (
                <Loader2
                  size={16}
                  className={styles.outstandingTable__spinner}
                />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.outstandingTable__container}>
        <table className={styles.outstandingTable__table}>
          <thead className={styles.outstandingTable__header}>
            <tr>
              <th className={styles.outstandingTable__headerCell}>
                Client Details
              </th>

              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("service_fee")}
              >
                Service Fee{renderSortArrow("service_fee")}
              </th>
              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("government_fee")}
              >
                Government Fee{renderSortArrow("government_fee")}
              </th>
              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("external_charge")}
              >
                External Charges{renderSortArrow("external_charge")}
              </th>
              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("total_outstanding")}
              >
                Total Outstanding{renderSortArrow("total_outstanding")}
              </th>
              <th className={styles.outstandingTable__headerCell}>
                Pending Charges
              </th>
            </tr>
          </thead>
          <tbody className={styles.outstandingTable__body}>
            {loading ? (
              <OutstandingTableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.outstandingTable__emptyState}>
                  <div className={styles.outstandingTable__emptyContent}>
                    <Building2 size={48} />
                    <p>No outstanding records found</p>
                    <span>Try adjusting your filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <OutstandingTableRow key={item.entity.id} item={item} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OutstandingTable;
