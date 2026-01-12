import React from "react";
import { X, Search, Loader2, CircleCheckBig, AlertCircle } from "lucide-react";

const ClientSelectionDialog = ({
  isOpen,
  selectedEntityData,
  tempSelectedEntity,
  searchQuery,
  entitySearchResults,
  isSearchingEntities,
  isUpdating,
  hasEntityChanged,
  onClose,
  onSearchChange,
  onSelectEntity,
  onClearSelection,
  onConfirmSelection,
}) => {
  if (!isOpen) return null;

  // Check if we're removing the client
  const isRemovingClient = tempSelectedEntity?.__cleared === true;

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="client-dialog-overlay" onClick={handleOverlayClick}>
      <div className="client-dialog-simple">
        <div className="client-dialog__header">
          <h3>Select Client</h3>
          <button onClick={onClose} type="button" aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div className="client-dialog__body">
          {/* Search Input */}
          <div className="client-dialog__search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email, phone, PAN..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Current Selection */}
          {selectedEntityData && (
            <div className="client-dialog__current">
              <div className="client-dialog__current-label">
                Currently Assigned Client:
              </div>
              <div className="client-dialog__current-card client-dialog__current-card--with-clear">
                <div className="client-dialog__current-info">
                  <div className="client-dialog__current-name">
                    {selectedEntityData.name}
                  </div>
                  <div className="client-dialog__current-meta">
                    {selectedEntityData.entity_type?.replaceAll("_", " ")}
                    {selectedEntityData.email &&
                      ` • ${selectedEntityData.email}`}
                  </div>
                </div>

                <div className="client-dialog__current-actions">
                  <span
                    className={`client-dialog__status-badge ${
                      selectedEntityData.status === "ACTIVE" ? "active" : ""
                    }`}
                  >
                    {selectedEntityData.status}
                  </span>

                  <button
                    className="client-dialog__clear-btn"
                    title="Remove client"
                    onClick={onClearSelection}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Removal Warning */}
          {isRemovingClient && (
            <div className="client-dialog__removal-warning">
              <AlertCircle size={16} />
              <span>Client will be removed from this task</span>
            </div>
          )}

          {/* New Selection */}
          {tempSelectedEntity && !isRemovingClient && (
            <div className="client-dialog__current">
              <div className="client-dialog__current-label">New Selection:</div>
              <div
                className="client-dialog__current-card client-dialog__current-card--new"
              >
                <div className="client-dialog__current-info">
                  <div className="client-dialog__current-name">
                    {tempSelectedEntity.name}
                  </div>
                  <div className="client-dialog__current-meta">
                    {tempSelectedEntity.entity_type?.replaceAll("_", " ")}
                    {tempSelectedEntity.email && ` • ${tempSelectedEntity.email}`}
                  </div>
                </div>
                <span
                  className={`client-dialog__status-badge ${
                    tempSelectedEntity.status === "ACTIVE" ? "active" : ""
                  }`}
                >
                  {tempSelectedEntity.status}
                </span>
              </div>
            </div>
          )}

          {/* Search Results - Only show if not removing */}
          {!isRemovingClient && (
            <div className="client-dialog__results">
              {isSearchingEntities ? (
                <div className="client-dialog__loading">
                  <Loader2 size={24} className="spinner" />
                  <span>Searching clients...</span>
                </div>
              ) : entitySearchResults.length > 0 ? (
                <div className="client-dialog__result-list">
                  {entitySearchResults.map((entity) => (
                    <div
                      key={entity.id}
                      className={`client-dialog__result-item ${
                        tempSelectedEntity?.id === entity.id ? "selected" : ""
                      }`}
                      onClick={() => onSelectEntity(entity)}
                    >
                      <div className="client-dialog__result-main">
                        <div className="client-dialog__result-name">
                          {entity.name}
                        </div>
                        <div className="client-dialog__result-meta">
                          {entity.entity_type?.replaceAll("_", " ")}
                          {entity.email && ` • ${entity.email}`}
                          {entity.primary_phone && ` • ${entity.primary_phone}`}
                        </div>
                      </div>
                      {tempSelectedEntity?.id === entity.id && (
                        <div className="client-dialog__selected-check">
                          <CircleCheckBig size={20} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="client-dialog__empty">
                  <Search size={48} />
                  <p>No clients found</p>
                  <span>Try searching with different keywords</span>
                </div>
              ) : (
                <div className="client-dialog__empty">
                  <Search size={48} />
                  <p>Start typing to search</p>
                  <span>Search by name, email, phone, or PAN</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="client-dialog__actions">
            <button
              className="client-dialog__btn client-dialog__btn--secondary"
              onClick={onClose}
              type="button"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              className="client-dialog__btn client-dialog__btn--primary"
              onClick={onConfirmSelection}
              disabled={!hasEntityChanged || isUpdating}
              type="button"
            >
              {isUpdating ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Updating...
                </>
              ) : isRemovingClient ? (
                "Remove Client"
              ) : (
                "Confirm Selection"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSelectionDialog;