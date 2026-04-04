"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import styles from "./GeoFields.module.scss";

/* ─────────────────────────────────────────────────────────────
   API
───────────────────────────────────────────────────────────── */
const GEO_API = "/api/admin_ops/shared/locations";

async function fetchGeo(type, params = {}) {
  const qs = new URLSearchParams({ type, ...params });
  const res = await fetch(`${GEO_API}?${qs.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json?.error?.message || "Failed");
  return json.data; // [{ name, isoCode }]
}

// Module-level cache — survives dialog re-opens, never re-fetches same list
const geoCache = {};

function cacheKey(type, country_code, state_code) {
  return [type, country_code, state_code].filter(Boolean).join(":");
}

/* ─────────────────────────────────────────────────────────────
   SEARCHABLE DROPDOWN
───────────────────────────────────────────────────────────── */
function GeoDropdown({
  label,
  required,
  placeholder,
  value,
  displayValue,
  options,
  loading,
  disabled,
  onChange,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  // Focus search input when panel opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    listRef.current.children[focusedIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  const select = useCallback(
    (opt) => {
      onChange(opt.isoCode, opt.name);
      setOpen(false);
    },
    [onChange],
  );

  const clear = (e) => {
    e.stopPropagation();
    onChange("", "");
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[focusedIdx]) {
      e.preventDefault();
      select(filtered[focusedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={styles.field} ref={rootRef}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        className={[
          styles.trigger,
          open ? styles.triggerOpen : "",
          error ? styles.triggerError : "",
          disabled ? styles.triggerDisabled : "",
        ].join(" ")}
        onClick={() => !disabled && !loading && setOpen((o) => !o)}
        disabled={disabled || loading}
      >
        <span
          className={`${styles.triggerText} ${!displayValue ? styles.triggerPlaceholder : ""}`}
        >
          {loading ? "Loading…" : displayValue || placeholder}
        </span>
        {loading ? (
          <Loader2 size={14} className={styles.spinnerIcon} />
        ) : displayValue ? (
          <X size={13} className={styles.clearIcon} onClick={clear} />
        ) : (
          <ChevronDown
            size={14}
            className={`${styles.chevronIcon} ${open ? styles.chevronOpen : ""}`}
          />
        )}
      </button>

      {error && <span className={styles.fieldError}>{error}</span>}

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.searchRow}>
            <Search size={13} className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.searchInput}
              type="text"
              placeholder={`Search ${(label || "").toLowerCase()}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(0);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {query && (
              <button
                className={styles.queryClear}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <ul className={styles.list} ref={listRef}>
            {options.length === 0 && loading ? (
              <li className={styles.listState}>
                <Loader2 size={16} className={styles.spinnerIcon} /> Loading…
              </li>
            ) : filtered.length === 0 ? (
              <li className={styles.listState}>
                {query ? `No results for "${query}"` : "No options available"}
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.isoCode}
                  className={[
                    styles.listItem,
                    opt.isoCode === value ? styles.listItemSelected : "",
                    i === focusedIdx ? styles.listItemFocused : "",
                  ].join(" ")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(opt)}
                  onMouseEnter={() => setFocusedIdx(i)}
                >
                  <span className={styles.listItemName}>{opt.name}</span>
                  {opt.isoCode !== opt.name && (
                    <span className={styles.listItemCode}>{opt.isoCode}</span>
                  )}
                </li>
              ))
            )}
          </ul>

          {filtered.length > 0 && (
            <div className={styles.panelFooter}>
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
              {query && ` for "${query}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GeoFields
───────────────────────────────────────────────────────────── */
export default function GeoFields({
  value = {},
  onChange,
  errors = {},
  className,
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Generic load — cache prevents duplicate network calls so no ref guards needed
  const load = useCallback(async (type, params, setter, setLoading) => {
    const key = cacheKey(type, params.country_code, params.state_code);
    if (geoCache[key]) {
      setter(geoCache[key]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchGeo(type, params);
      geoCache[key] = data;
      setter(data);
    } catch (e) {
      console.error("GeoFields:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Countries — once on mount
  useEffect(() => {
    load("country", {}, setCountries, setLoadingCountries);
  }, [load]);

  // States — whenever country_code changes (cache makes it free to re-run)
  useEffect(() => {
    if (!value.country_code) {
      setStates([]);
      setCities([]);
      return;
    }
    load(
      "state",
      { country_code: value.country_code },
      setStates,
      setLoadingStates,
    );
  }, [value.country_code, load]);

  // Cities — whenever state_code changes
  useEffect(() => {
    if (!value.country_code || !value.state_code) {
      setCities([]);
      return;
    }
    load(
      "city",
      { country_code: value.country_code, state_code: value.state_code },
      setCities,
      setLoadingCities,
    );
  }, [value.state_code, value.country_code, load]);

  const handleCountryChange = (isoCode, name) => {
    onChange({
      country_code: isoCode,
      country_name: name,
      state_code: "",
      state_name: "",
      city: "",
    });
  };
  const handleStateChange = (isoCode, name) => {
    onChange({ state_code: isoCode, state_name: name, city: "" });
  };
  const handleCityChange = (_iso, name) => onChange({ city: name });
  const handleText = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className={`${styles.root} ${className || ""}`}>
      {/* Address lines */}
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>Address Line 1</label>
          <input
            className={`${styles.input} ${errors.address_line1 ? styles.inputError : ""}`}
            type="text"
            placeholder="Street, building, flat no."
            value={value.address_line1 || ""}
            onChange={handleText("address_line1")}
            maxLength={200}
          />
          {errors.address_line1 && (
            <span className={styles.fieldError}>{errors.address_line1}</span>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Address Line 2</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Area, landmark (optional)"
            value={value.address_line2 || ""}
            onChange={handleText("address_line2")}
            maxLength={200}
          />
        </div>
      </div>

      {/* Country / State / City */}
      <div className={styles.grid2}>
        <GeoDropdown
          label="Country"
          placeholder="Select country"
          value={value.country_code || ""}
          displayValue={value.country_name || ""}
          options={countries}
          loading={loadingCountries}
          disabled={false}
          onChange={handleCountryChange}
          error={errors.country_code}
        />
        <GeoDropdown
          label="State / Province"
          placeholder={
            value.country_code ? "Select state" : "Pick country first"
          }
          value={value.state_code || ""}
          displayValue={value.state_name || ""}
          options={states}
          loading={loadingStates}
          disabled={!value.country_code}
          onChange={handleStateChange}
          error={errors.state_code}
        />
       
      </div>
      <div className={styles.grid2}>
        <GeoDropdown
          label="City"
          placeholder={value.state_code ? "Select city" : "Pick state first"}
          value={value.city || ""}
          displayValue={value.city || ""}
          options={cities}
          loading={loadingCities}
          disabled={!value.state_code}
          onChange={handleCityChange}
          error={errors.city}
        />
        <div className={styles.fieldHalf}>
          <label className={styles.label}>Pincode</label>
          <input
            className={`${styles.input} ${errors.pincode ? styles.inputError : ""}`}
            type="text"
            placeholder="110001"
            value={value.pincode || ""}
            onChange={handleText("pincode")}
            maxLength={15}
          />
          {errors.pincode && (
            <span className={styles.fieldError}>{errors.pincode}</span>
          )}
        </div>
      </div>
      {/* Pincode */}
    </div>
  );
}
