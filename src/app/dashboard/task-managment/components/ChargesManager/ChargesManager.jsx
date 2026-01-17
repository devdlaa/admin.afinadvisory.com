"use client";
import { useState, useEffect } from "react";
import { Plus, List, PieChart, Trash2 } from "lucide-react";

import ChargesSummary from "../ChargesSummary/ChargesSummary";
import ChargeCard from "../ChargeCard/ChargeCard";

import ActionButton from "@/app/components/shared/TinyLib/ActionButton";

import "./ChargesManager.scss";
import CircularLoader from "@/app/components/shared/newui/Loader/CircularLoader";
import { CircularProgress } from "@mui/material";

const ChargesManager = ({
  initialCharges = [],
  deletedCharges = [],
  onAddCharge,
  onUpdateCharge,
  onDeleteCharge,
  onRestoreCharge,
  onHardDeleteCharge,
  onSaveInvoiceDetails,
  onFetchDeletedCharges, // NEW: Callback to fetch deleted charges on demand

  isSavingInvoiceDetails = false,
  isLoadingDeletedCharges = false,
  invoiceNumber = "",
  practiceFirm = null,
  chargeOperations = {},
}) => {
  const [view, setView] = useState("items"); // 'items' | 'summary' | 'deleted'
  const [draftCharge, setDraftCharge] = useState(null);
  const [hasLoadedDeletedCharges, setHasLoadedDeletedCharges] = useState(false);

  const chargesArray = Array.isArray(initialCharges) ? initialCharges : [];
  const deletedChargesArray = Array.isArray(deletedCharges)
    ? deletedCharges
    : [];

  // Fetch deleted charges when switching to deleted tab
  useEffect(() => {
    if (
      view === "deleted" &&
      !hasLoadedDeletedCharges &&
      onFetchDeletedCharges
    ) {
      onFetchDeletedCharges();
      setHasLoadedDeletedCharges(true);
    }
  }, [view, hasLoadedDeletedCharges, onFetchDeletedCharges]);

  const handleAddCharge = () => {
    setDraftCharge({
      id: "draft",
      title: "",
      charge_type: "EXTERNAL_CHARGE",
      amount: "",
      bearer: "CLIENT",
      status: "NOT_PAID",
      remark: "",
      isNew: true,
    });
    setView("items"); // Switch to items view when adding
  };

  const handleSaveNewCharge = async (chargeData) => {
    const chargePayload = {
      title: chargeData.chargeTitle,
      amount: parseFloat(chargeData.chargeAmount) || 0,
      charge_type: chargeData.chargeType,
      bearer: chargeData.whoIsBearer,
      status: chargeData.paymentStatus,
      remark: chargeData.remarks || null,
    };

    if (onAddCharge) {
      const success = await onAddCharge(chargePayload);
      if (success) {
        setDraftCharge(null);
      }
    }
  };

  const handleCancelNewCharge = () => {
    setDraftCharge(null);
  };

  const handleUpdateExistingCharge = async (id, updatedData) => {
    const chargePayload = {
      title: updatedData.chargeTitle,
      amount: parseFloat(updatedData.chargeAmount) || 0,
      charge_type: updatedData.chargeType.toUpperCase().replace("-", "_"),
      bearer: updatedData.whoIsBearer.toUpperCase(),
      status: updatedData.paymentStatus.toUpperCase().replace("-", "_"),
      remark: updatedData.remarks || null,
    };

    if (onUpdateCharge) {
      await onUpdateCharge(id, chargePayload);
    }
  };

  const handleDeleteExistingCharge = async (id) => {
    if (onDeleteCharge) {
      await onDeleteCharge(id);
      // Invalidate deleted charges cache so it refetches
      setHasLoadedDeletedCharges(false);
    }
  };

  const handleRestoreCharge = async (id) => {
    if (onRestoreCharge) {
      await onRestoreCharge(id);
    }
  };

  const handleHardDeleteCharge = async (id) => {
    if (onHardDeleteCharge) {
      await onHardDeleteCharge(id);
    }
  };

  const calculateSummary = () => {
    const savedCharges = chargesArray;

    let totalBilled = 0;
    let writtenOff = 0;
    let prepaidByClient = 0;
    let firmsFee = 0;
    let externalExpenses = 0;

    savedCharges.forEach((charge) => {
      const amount = parseFloat(charge.amount) || 0;

      totalBilled += amount;

      if (charge.status === "WRITTEN_OFF") writtenOff += amount;
      else if (charge.status === "PAID") prepaidByClient += amount;

      if (charge.charge_type === "SERVICE_FEE") firmsFee += amount;
      else externalExpenses += amount;
    });

    const totalRecoverable = totalBilled - writtenOff - prepaidByClient;

    return {
      totalBilled,
      writtenOff,
      prepaidByClient,
      totalRecoverable,
      breakdown: {
        firmsFee,
        firmsFeePercentage:
          totalBilled > 0 ? Math.round((firmsFee / totalBilled) * 100) : 0,
        externalExpenses,
        externalExpensesPercentage:
          totalBilled > 0
            ? Math.round((externalExpenses / totalBilled) * 100)
            : 0,
        writtenOff,
        writtenOffPercentage:
          totalBilled > 0 ? Math.round((writtenOff / totalBilled) * 100) : 0,
      },
    };
  };

  const transformChargeForCard = (charge) => ({
    ...charge,
    chargeTitle: charge.title,
    chargeType: charge.charge_type,
    chargeAmount: charge.amount?.toString(),
    whoIsBearer: charge.bearer,
    paymentStatus: charge.status,
    remarks: charge.remark,

    createdBy: {
      name: charge?.creator?.name || "User",
      email: charge?.creator?.email || null,
      date: charge.created_at
        ? new Date(charge.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "N/A",
      created_by_uid: charge?.creator?.id || null,
    },

    updatedBy: charge.updater
      ? {
          name: charge.updater.name,
          email: charge.updater.email,
          date: charge.updated_at
            ? new Date(charge.updated_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "N/A",
          updated_by_uid: charge.updater.id,
        }
      : null,

    deletedBy: charge.deleted_by
      ? {
          name: charge.deleted_by.name,
          email: charge.deleted_by.email,
          date: charge.deleted_at
            ? new Date(charge.deleted_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "N/A",
          deleted_by_uid: charge.deleted_by.id,
        }
      : null,

    restoredBy: charge.restored_by
      ? {
          name: charge.restored_by.name,
          email: charge.restored_by.email,
          date: charge.restored_at
            ? new Date(charge.restored_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "N/A",
          restored_by_uid: charge.restored_by.id,
        }
      : null,
  });

  const savedChargesCount = chargesArray.length;
  const deletedChargesCount = deletedChargesArray.length;

  return (
    <div className="charges-manager">
      <div className="charges-manager__header">
        <div className="charges-manager__header-left">
          <ActionButton
            text="Add Charge"
            icon={Plus}
            onClick={handleAddCharge}
            variant="primary"
            size="medium"
            disabled={!!draftCharge || chargeOperations["new"] === "adding"}
            isLoading={chargeOperations["new"] === "adding"}
          />
        </div>

        <div className="charges-manager__view-toggle-container">
          <button
            className={`charges-manager__view-toggle ${
              view === "items" ? "charges-manager__active-items" : ""
            }`}
            onClick={() => setView("items")}
          >
            <List size={18} />
            <span>Items View</span>
            {savedChargesCount > 0 && (
              <span style={{
                background : "blue"
              }} className="charges-manager__tab-badge">
                {savedChargesCount}
              </span>
            )}{" "}
          </button>

          <button
            className={`charges-manager__view-toggle ${
              view === "summary" ? "charges-manager__active-summary" : ""
            }`}
            onClick={() => setView("summary")}
            disabled={!!draftCharge}
          >
            <PieChart size={18} />
            <span>Summary</span>
          </button>

          <button
            className={`charges-manager__view-toggle ${
              view === "deleted" ? "charges-manager__active-deleted" : ""
            }`}
            onClick={() => setView("deleted")}
            disabled={!!draftCharge}
          >
            <Trash2 size={18} />
            <span>Deleted Charges</span>
            {deletedChargesCount > 0 && (
              <span className="charges-manager__tab-badge">
                {deletedChargesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="charges-manager__content">
        {view === "items" && (
          <div className="charges-manager__charges-list">
            {chargesArray.length === 0 && !draftCharge ? (
              <div className="charges-manager__empty-state">
                <p>No charges added yet. Click "Add New Charge" to begin.</p>
              </div>
            ) : (
              <>
                {draftCharge && (
                  <ChargeCard
                    key="draft"
                    charge={transformChargeForCard(draftCharge)}
                    isNewCharge
                    isLoading={chargeOperations["new"] === "adding"}
                    onUpdate={(data) => handleSaveNewCharge(data)}
                    onCancel={handleCancelNewCharge}
                    mode="active"
                  />
                )}

                {chargesArray.map((charge) => {
                  const chargeOperation = chargeOperations[charge.id];
                  const isChargeLoading =
                    chargeOperation === "updating" ||
                    chargeOperation === "deleting";

                  return (
                    <ChargeCard
                      key={charge.id}
                      charge={transformChargeForCard(charge)}
                      onUpdate={(data) =>
                        handleUpdateExistingCharge(charge.id, data)
                      }
                      onDelete={() => handleDeleteExistingCharge(charge.id)}
                      isLoading={isChargeLoading}
                      operationType={chargeOperation}
                      mode="active"
                    />
                  );
                })}
              </>
            )}
          </div>
        )}

        {view === "summary" && (
          <ChargesSummary
            summary={calculateSummary()}
            initialInvoiceNumber={invoiceNumber}
            initialPracticeFirm={practiceFirm}
            onSaveInvoiceDetails={onSaveInvoiceDetails}
            isSavingInvoiceDetails={isSavingInvoiceDetails}
          />
        )}

        {view === "deleted" && (
          <div className="charges-manager__charges-list charges-manager__charges-list--deleted">
            {isLoadingDeletedCharges ? (
              <div className="charges-manager__loading-state">
                <div className="charges-manager__spinner" />
                <CircularProgress color="grey" size={18} />
                <p>Loading deleted charges...</p>
              </div>
            ) : deletedChargesArray.length === 0 ? (
              <div className="charges-manager__empty-state">
                <Trash2 size={48} className="charges-manager__empty-icon" />
                <p>No deleted charges</p>
                <span className="charges-manager__empty-hint">
                  Deleted charges will appear here and can be restored or
                  permanently deleted.
                </span>
              </div>
            ) : (
              <>
                {deletedChargesArray.map((charge) => {
                  const chargeOperation = chargeOperations[charge.id];
                  const isChargeLoading =
                    chargeOperation === "restoring" ||
                    chargeOperation === "hard-deleting";

                  return (
                    <ChargeCard
                      key={charge.id}
                      charge={transformChargeForCard(charge)}
                      onRestore={() => handleRestoreCharge(charge.id)}
                      onHardDelete={() => handleHardDeleteCharge(charge.id)}
                      isLoading={isChargeLoading}
                      operationType={chargeOperation}
                      mode="deleted"
                    />
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChargesManager;
