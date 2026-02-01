import React, { useState } from "react";

import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2,
  Search,
  User2,
  Banknote,
  Landmark,
  Wallet,
  CirclePercent,
  Info,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import FilterDropdown from "@/app/components/pages/FilterDropdown/FilterDropdown";
import Button from "@/app/components/shared/Button/Button";
import styles from "./OutstandingTable.module.scss";
import { formatCurrency } from "@/utils/client/cutils";

const OutstandingTableRow = ({ item, onClick }) => {
  return (
    <tr className={styles.outstandingTable__row} onClick={onClick}>
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
          {formatCurrency(item.money.service_fee.outstanding)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__amount}>
          {formatCurrency(item.money.government_fee.outstanding)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__amount}>
          {formatCurrency(item.money.external_charge.outstanding)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div
          className={`${styles.outstandingTable__amount} ${styles.outstandingTable__amountTotal}`}
        >
          {formatCurrency(item.money.client_total_outstanding)}
        </div>
      </td>
      <td className={styles.outstandingTable__cell}>
        <div className={styles.outstandingTable__badge}>
          {item.money.pending_charges_count} charges
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
  chargeType,
  onChargeTypeChange,
  onEntitySearch,
  isEntitySearching = false,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [isPrevLoading, setIsPrevLoading] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const chargeTypeOptions = [
    {
      value: undefined,
      label: "All Charges",
      icon: <Wallet size={18} color="#64748b" />,
    },
    {
      value: "SERVICE_FEE",
      label: "Service Fees",
      icon: <CirclePercent size={18} color="#64748b" />,
    },
    {
      value: "GOVERNMENT_FEE",
      label: "Government Fees",
      icon: <Landmark size={18} color="#64748b" />,
    },
    {
      value: "EXTERNAL_CHARGE",
      label: "External Charges",
      icon: <Info size={18} color="#64748b" />,
    },
  ];

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
            label="Charge Type"
            placeholder="All Charges"
            icon={Banknote}
            options={chargeTypeOptions}
            selectedValue={chargeType}
            onSelect={(option) => onChargeTypeChange(option.value)}
            className={styles.charges_type}
          />
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
                onClick={() => onSortChange("service_fee_outstanding")}
              >
                Service Fee{renderSortArrow("service_fee_outstanding")}
              </th>
              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("government_fee_outstanding")}
              >
                Government Fee{renderSortArrow("government_fee_outstanding")}
              </th>
              <th
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("external_charge_outstanding")}
              >
                External Charges{renderSortArrow("external_charge_outstanding")}
              </th>
              <th
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
                className={styles.outstandingTable__headerCell}
                onClick={() => onSortChange("client_total_outstanding")}
              >
                Total Outstanding{renderSortArrow("client_total_outstanding")}
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
                <OutstandingTableRow
                  key={item.entity.id}
                  item={item}
                  onClick={null}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OutstandingTable;
