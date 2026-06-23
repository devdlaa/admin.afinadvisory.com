import React, { useEffect, useRef, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Search,
  X,
  Users,
  Mail,
  Phone,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

import { SORT_OPTIONS } from "../../page";
import styles from "./InfluencersTable.module.scss";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfluencerRow({ influencer, onEdit, onDeleteRequest }) {
  return (
    <tr className={styles.tr} onClick={() => onEdit(influencer.id)}>
      <td className={styles.td}>
        <div className={styles.nameCell}>
          <div className={styles.rowAvatar}>{getInitials(influencer.name)}</div>
          <div className={styles.nameInfo}>
            <p className={styles.rowName}>{influencer.name}</p>
            <p className={styles.rowMeta}>
              {influencer.reference_count ?? 0} references Linked
              {(influencer.reference_count ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </td>
      <td className={styles.td}>
        <div className={styles.iconCell}>
          <Mail size={15} className={styles.cellIcon} />
          <span className={styles.cellText}>{influencer.email || "—"}</span>
        </div>
      </td>
      <td className={styles.td}>
        <div className={styles.iconCell}>
          <Phone size={15} className={styles.cellIcon} />
          <span className={styles.cellText}>{influencer.phone || "—"}</span>
        </div>
      </td>
      <td className={styles.td}>
        <div className={styles.byCell}>
          <span className={styles.byName}>
            {influencer.creator?.name || "—"}
          </span>
          <span className={styles.byDate}>
            {formatDate(influencer.created_at)}
          </span>
        </div>
      </td>
      <td className={styles.td}>
        <div className={styles.byCell}>
          <span className={styles.byName}>
            {influencer.updater?.name || "—"}
          </span>
          <span className={styles.byDate}>
            {formatDate(influencer.updated_at)}
          </span>
        </div>
      </td>
      <td className={styles.tdActions} onClick={(e) => e.stopPropagation()}>
        <div className={styles.rowActions}>
          <button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(influencer.id);
            }}
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(influencer);
            }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function InfluencersTable({
  influencers,
  loading,
  pagination,
  search,
  sortIdx,
  onSearchChange,
  onClearSearch,
  onSortChange,
  onLoadMore,
  onEdit,
  onDeleteRequest,
  onCreateClick,
}) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const currentSort = SORT_OPTIONS[sortIdx];

  useEffect(() => {
    setSortMenuOpen(false);
  }, [sortIdx]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const h = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target))
        setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [sortMenuOpen]);

  const isEmpty = !loading && influencers.length === 0;
  const isSearching = search.trim().length > 0;

  return (
    <div className={styles.card}>
      {/* ── Card header ── */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h2 className={styles.cardTitle}>Influencers</h2>
          {!loading && (
            <span className={styles.countBadge}>
              {influencers.length}
              {pagination.has_more ? "+" : ""}
            </span>
          )}
        </div>

        <div className={styles.cardHeaderRight}>
          <div className={styles.searchWrap}>
            <Search size={13} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={onClearSearch}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className={styles.sortWrap} ref={sortMenuRef}>
            <button
              className={styles.sortBtn}
              onClick={() => setSortMenuOpen((v) => !v)}
            >
              <ArrowUpDown size={12} />
              {currentSort.label}
              <ChevronDown
                size={11}
                style={{
                  transform: sortMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.18s",
                }}
              />
            </button>
            {sortMenuOpen && (
              <div className={styles.sortMenu}>
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    className={`${styles.sortMenuItem} ${i === sortIdx ? styles.sortMenuItemActive : ""}`}
                    onClick={() => {
                      onSortChange(i);
                      setSortMenuOpen(false);
                    }}
                  >
                    {i === sortIdx ? (
                      currentSort.sort_order === "desc" ? (
                        <ArrowDown size={12} />
                      ) : (
                        <ArrowUp size={12} />
                      )
                    ) : (
                      <ArrowUpDown size={12} />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className={styles.addBtn} onClick={onCreateClick}>
            <Plus size={14} />
            New Influencer
          </button>
        </div>
      </div>

      {/* ── Fixed-height scrollable table area ── */}
      <div className={styles.tableOuter}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: "22%" }}>
                Influencer
              </th>
              <th className={styles.th} style={{ width: "22%" }}>
                Email
              </th>
              <th className={styles.th} style={{ width: "14%" }}>
                Phone
              </th>
              <th className={styles.th} style={{ width: "18%" }}>
                Created by
              </th>
              <th className={styles.th} style={{ width: "18%" }}>
                Updated by
              </th>
              <th
                className={`${styles.th} ${styles.thActions}`}
                style={{ width: "6%" }}
              ></th>
            </tr>
          </thead>
          <tbody>
            {influencers.map((inf) => (
              <InfluencerRow
                key={inf.id}
                influencer={inf}
                onEdit={onEdit}
                onDeleteRequest={onDeleteRequest}
              />
            ))}

            {loading &&
              influencers.length === 0 &&
              [...Array(7)].map((_, i) => (
                <tr
                  key={`sh-${i}`}
                  className={styles.shimmerTr}
                  style={{ "--i": i }}
                >
                  <td className={styles.td}>
                    <div className={styles.nameCell}>
                      <div className={styles.shimmerAvatar} />
                      <div className={styles.shimmerLines}>
                        <div
                          className={styles.shimmerLine}
                          style={{ width: "55%" }}
                        />
                        <div
                          className={styles.shimmerLine}
                          style={{ width: "30%" }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div
                      className={styles.shimmerLine}
                      style={{ width: "70%" }}
                    />
                  </td>
                  <td className={styles.td}>
                    <div
                      className={styles.shimmerLine}
                      style={{ width: "55%" }}
                    />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.shimmerLines}>
                      <div
                        className={styles.shimmerLine}
                        style={{ width: "60%" }}
                      />
                      <div
                        className={styles.shimmerLine}
                        style={{ width: "36%" }}
                      />
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.shimmerLines}>
                      <div
                        className={styles.shimmerLine}
                        style={{ width: "60%" }}
                      />
                      <div
                        className={styles.shimmerLine}
                        style={{ width: "36%" }}
                      />
                    </div>
                  </td>
                  <td className={styles.tdActions} />
                </tr>
              ))}
          </tbody>
        </table>

        {isEmpty && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <Users size={26} />
            </div>
            <p className={styles.emptyTitle}>
              {isSearching
                ? `No results for "${search}"`
                : "No influencers yet"}
            </p>
            <p className={styles.emptySub}>
              {isSearching
                ? "Try different keywords"
                : "Add your first influencer to track referrals"}
            </p>
            {isSearching ? (
              <button className={styles.emptyAction} onClick={onClearSearch}>
                Clear search
              </button>
            ) : (
              <button className={styles.emptyAction} onClick={onCreateClick}>
                <Plus size={13} /> Add influencer
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className={styles.tableFooter}>
        <span className={styles.footerCount}>
          {loading && influencers.length > 0
            ? "Loading…"
            : `${influencers.length} influencer${influencers.length !== 1 ? "s" : ""}`}
        </span>
        {pagination.has_more && (
          <button
            className={styles.loadMoreBtn}
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={11} thickness={5} />
            ) : (
              <ChevronDown size={12} />
            )}
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
