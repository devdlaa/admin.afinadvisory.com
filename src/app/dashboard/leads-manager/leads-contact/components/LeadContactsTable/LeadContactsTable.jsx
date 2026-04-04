"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";

import styles from "./LeadContactsTable.module.scss";
import { ENTITY_TYPE_OPTIONS, INDUSTRY_OPTIONS } from "../constants";

function formatEntityType(val) {
  const found = ENTITY_TYPE_OPTIONS.find((o) => o.value === val);
  return found ? found.label : val;
}

function formatIndustry(val) {
  const found = INDUSTRY_OPTIONS.find((o) => o.value === val);
  return found ? found.label : val;
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LeadContactsTable({
  contacts,
  loading,
  pagination,
  filters,
  isSearchActive,
  isFilterActive,
  onPageChange,
  onFilterChange,
  onResetFilters,
  onRefresh,
  onEdit,
  onDelete,
  onCreateClick, // NEW — triggers the add dialog
  detailCacheRef,
}) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localEntityType, setLocalEntityType] = useState(
    filters.entity_type || "",
  );
  const [localIndustry, setLocalIndustry] = useState(filters.industry || "");
  const [refreshing, setRefreshing] = useState(false);

  const internalCacheRef = useRef({});
  const cache = detailCacheRef ?? internalCacheRef;
  const searchTimer = useRef(null);
  const filtersPanelRef = useRef(null);

  useEffect(() => {
    setSearchValue(filters.search || "");
    setLocalEntityType(filters.entity_type || "");
    setLocalIndustry(filters.industry || "");
  }, [filters.search, filters.entity_type, filters.industry]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      onFilterChange({ search: val || undefined });
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    clearTimeout(searchTimer.current);
    onFilterChange({ search: undefined });
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        filtersPanelRef.current &&
        !filtersPanelRef.current.contains(e.target)
      )
        setFiltersOpen(false);
    };
    if (filtersOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  const applyFilters = () => {
    onFilterChange({
      entity_type: localEntityType || undefined,
      industry: localIndustry || undefined,
    });
    setFiltersOpen(false);
  };

  const clearAllFilters = () => {
    setLocalEntityType("");
    setLocalIndustry("");
    onResetFilters();
    setFiltersOpen(false);
  };

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    cache.current = {};
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditClick = (contact) => onEdit(contact.id, cache);

  const hasActiveFilters = isSearchActive || isFilterActive;
  const { page, total_pages, has_more, total_items, page_size } = pagination;
  const canPrev = page > 1;
  const canNext = has_more;
  const startItem = total_items === 0 ? 0 : (page - 1) * page_size + 1;
  const endItem = Math.min(page * page_size, total_items);

  return (
    <div className={styles.wrapper}>
      {/* ── Card header: title left, controls right ── */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h2 className={styles.cardTitle}>Lead Contacts</h2>
          {!loading && total_items > 0 && (
            <span className={styles.countBadge}>{total_items}</span>
          )}
        </div>

        <div className={styles.cardHeaderRight}>
          {/* Search */}
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search name, email, phone, company…"
              value={searchValue}
              onChange={handleSearchChange}
            />
            {searchValue && (
              <button
                className={styles.searchClear}
                onClick={handleClearSearch}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Active filter tags */}
          {isSearchActive && (
            <button
              className={styles.clearSearchBtn}
              onClick={handleClearSearch}
            >
              <X size={13} /> Clear search
            </button>
          )}
          {isFilterActive && (
            <button className={styles.resetBtn} onClick={clearAllFilters}>
              <X size={13} /> Clear filters
            </button>
          )}

          {/* Filter dropdown */}
          <div className={styles.filterWrap} ref={filtersPanelRef}>
            <button
              className={`${styles.filterBtn} ${isFilterActive ? styles.filterBtnActive : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={13} />
              Filters
              {isFilterActive && <span className={styles.filterDot} />}
              <ChevronDown
                size={12}
                className={`${styles.filterChevron} ${filtersOpen ? styles.filterChevronOpen : ""}`}
              />
            </button>

            {filtersOpen && (
              <div className={styles.filterPanel}>
                <div className={styles.filterPanelTitle}>Filter Contacts</div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Entity Type</label>
                  <select
                    className={styles.filterSelect}
                    value={localEntityType}
                    onChange={(e) => setLocalEntityType(e.target.value)}
                  >
                    {ENTITY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterField}>
                  <label className={styles.filterLabel}>Industry</label>
                  <select
                    className={styles.filterSelect}
                    value={localIndustry}
                    onChange={(e) => setLocalIndustry(e.target.value)}
                  >
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterActions}>
                  <button
                    className={styles.filterClearBtn}
                    onClick={() => {
                      setLocalEntityType("");
                      setLocalIndustry("");
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className={styles.filterApplyBtn}
                    onClick={applyFilters}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={refreshing ? styles.refreshSpinning : ""}
            />
          </button>

          {/* Add contact */}
          <button className={styles.addBtn} onClick={onCreateClick}>
            <Plus size={14} />
            New Contact
          </button>
        </div>
      </div>

      {/* ── Active filter chips (below header) ── */}
      {isFilterActive && (
        <div className={styles.filterChips}>
          {filters.entity_type && (
            <span className={styles.chip}>
              {formatEntityType(filters.entity_type)}
              <button
                className={styles.chipRemove}
                onClick={() => onFilterChange({ entity_type: undefined })}
              >
                <X size={11} />
              </button>
            </span>
          )}
          {filters.industry && (
            <span className={styles.chip}>
              {formatIndustry(filters.industry)}
              <button
                className={styles.chipRemove}
                onClick={() => onFilterChange({ industry: undefined })}
              >
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Scrollable table area ── */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <th className={styles.th} style={{ minWidth: 200 }}>
                <span className={styles.thInner}>
                  <User size={13} />
                  Contact
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 120 }}>
                <span className={styles.thInner}>Designation</span>
              </th>
              <th className={styles.th} style={{ minWidth: 140 }}>
                <span className={styles.thInner}>Entity Type</span>
              </th>
              <th className={styles.th} style={{ minWidth: 180 }}>
                <span className={styles.thInner}>
                  <Building2 size={13} />
                  Company
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 140 }}>
                <span className={styles.thInner}>Industry</span>
              </th>
              <th className={styles.th} style={{ minWidth: 200 }}>
                <span className={styles.thInner}>
                  <Mail size={13} />
                  Primary Email
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 200 }}>
                <span className={styles.thInner}>
                  <Mail size={13} />
                  Secondary Email
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 160 }}>
                <span className={styles.thInner}>
                  <Phone size={13} />
                  Primary Phone
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 160 }}>
                <span className={styles.thInner}>
                  <Phone size={13} />
                  Secondary Phone
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 120 }}>
                <span className={styles.thInner}>PAN</span>
              </th>
              <th className={styles.th} style={{ minWidth: 170 }}>
                <span className={styles.thInner}>GST</span>
              </th>
              <th className={styles.th} style={{ minWidth: 180 }}>
                <span className={styles.thInner}>
                  <MapPin size={13} />
                  Location
                </span>
              </th>
              <th className={styles.th} style={{ minWidth: 140 }}>
                <span className={styles.thInner}>Created By</span>
              </th>
              <th className={styles.th} style={{ minWidth: 140 }}>
                <span className={styles.thInner}>Last Updated</span>
              </th>
              <th className={`${styles.th} ${styles.thSticky}`}>
                <span className={styles.thInner}>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && contacts.length === 0 ? (
              <tr>
                <td colSpan={15} className={styles.stateCell}>
                  <div className={styles.loadingState}>
                    <Loader2 size={22} className={styles.spinner} />
                    <span>Loading contacts…</span>
                  </div>
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={15} className={styles.stateCell}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <User size={26} />
                    </div>
                    <p className={styles.emptyTitle}>No contacts found</p>
                    <p className={styles.emptyDesc}>
                      {hasActiveFilters
                        ? "Try adjusting your search or filters."
                        : "Get started by adding your first lead contact."}
                    </p>
                    {!hasActiveFilters && (
                      <button
                        className={styles.emptyAddBtn}
                        onClick={onCreateClick}
                      >
                        <Plus size={13} /> Add Contact
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className={`${styles.tr} ${loading ? styles.trLoading : ""}`}
                >
                  <td className={styles.td}>
                    <div className={styles.contactCell}>
                      <span className={styles.contactName}>
                        {contact.contact_person}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    {contact.designation ? (
                      <span className={styles.cellText}>
                        {contact.designation}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={styles.entityTypeBadge}>
                      {formatEntityType(contact.entity_type)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {contact.company_name ? (
                      <span className={styles.companyName}>
                        {contact.company_name}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.industry ? (
                      <span className={styles.industryBadge}>
                        {formatIndustry(contact.industry)}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.primary_email ? (
                      <a
                        href={`mailto:${contact.primary_email}`}
                        className={styles.emailLink}
                      >
                        {contact.primary_email}
                      </a>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.secondary_email ? (
                      <a
                        href={`mailto:${contact.secondary_email}`}
                        className={`${styles.emailLink} ${styles.emailSecondary}`}
                      >
                        {contact.secondary_email}
                      </a>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.primary_phone ? (
                      <span className={styles.phoneCell}>
                        {contact.primary_phone}
                        {contact.primary_whatsapp && (
                          <span className={styles.waBadge}>WA</span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.secondary_phone ? (
                      <span
                        className={`${styles.phoneCell} ${styles.phoneSecondary}`}
                      >
                        {contact.secondary_phone}
                        {contact.secondary_whatsapp && (
                          <span className={styles.waBadge}>WA</span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.pan ? (
                      <span className={styles.idCode}>{contact.pan}</span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {contact.gst_number ? (
                      <span className={styles.idCode}>
                        {contact.gst_number}
                      </span>
                    ) : (
                      <span className={styles.naText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.locationCell}>
                      {(contact.city || contact.state_name) && (
                        <span className={styles.locationPrimary}>
                          {[contact.city, contact.state_name]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                      {contact.country_name && (
                        <span className={styles.locationSecondary}>
                          {contact.country_name}
                          {contact.pincode ? ` – ${contact.pincode}` : ""}
                        </span>
                      )}
                      {!contact.city &&
                        !contact.state_name &&
                        !contact.country_name && (
                          <span className={styles.naText}>—</span>
                        )}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.auditCell}>
                      <span className={styles.auditName}>
                        {contact.creator?.name || "—"}
                      </span>
                      <span className={styles.auditDate}>
                        {formatDateTime(contact.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.auditCell}>
                      <span className={styles.auditName}>
                        {contact.updater?.name || "—"}
                      </span>
                      <span className={styles.auditDate}>
                        {formatDateTime(contact.updated_at)}
                      </span>
                    </div>
                  </td>
                  <td className={`${styles.td} ${styles.tdSticky}`}>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEditClick(contact)}
                        title="Edit contact"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => onDelete(contact.id)}
                        title="Delete contact"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {total_items > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {startItem}–{endItem} of {total_items} contacts
          </span>
          <div className={styles.paginationControls}>
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(1)}
              disabled={!canPrev || loading}
              title="First page"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev || loading}
              title="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className={styles.pageIndicator}>
              Page <strong>{page}</strong> of{" "}
              <strong>{total_pages || 1}</strong>
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext || loading}
              title="Next page"
            >
              <ChevronRight size={15} />
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(total_pages)}
              disabled={!canNext || loading}
              title="Last page"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
