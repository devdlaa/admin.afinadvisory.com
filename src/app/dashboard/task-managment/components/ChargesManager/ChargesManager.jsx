"use client";
import { useState } from "react";
import { Plus, List, PieChart } from "lucide-react";

import ChargesSummary from "../ChargesSummary/ChargesSummary";
import ChargeCard from "../ChargeCard/ChargeCard";

import ActionButton from "@/app/components/shared/TinyLib/ActionButton";

import "./ChargesManager.scss";

const ChargesManager = ({
  initialCharges = [],
  onAddCharge,
  onUpdateCharge,
  onDeleteCharge,
  onSaveInvoiceDetails,

  isSavingInvoiceDetails = false,
  invoiceNumber = "",
  practiceFirm = null,
  chargeOperations = {},
}) => {
  const [view, setView] = useState("items");
  const [draftCharge, setDraftCharge] = useState(null);

  const chargesArray = Array.isArray(initialCharges) ? initialCharges : [];

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
    setView("items");
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
      date: charge.created_at
        ? new Date(charge.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "N/A",
      created_by_uid: charge?.creator?.id || null,
    },
  });

  const savedChargesCount = chargesArray.length;

  return (
    <div className="charges-manager">
      <div className="charges-manager__header">
        <div className="charges-manager__header-left">
          <ActionButton
            text="Add New Charge"
            icon={Plus}
            onClick={handleAddCharge}
            variant="primary"
            size="medium"
            disabled={!!draftCharge || chargeOperations["new"] === "adding"}
            isLoading={chargeOperations["new"] === "adding"}
          />

          {savedChargesCount > 0 && (
            <div className="charges-manager__item-count">
              <span className="charges-manager__count">
                {savedChargesCount}
              </span>
              <span className="charges-manager__count-label">Items</span>
            </div>
          )}
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
        </div>
      </div>

      <div className="charges-manager__content">
        {view === "items" ? (
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
                    />
                  );
                })}
              </>
            )}
          </div>
        ) : (
          <ChargesSummary
            summary={calculateSummary()}
            initialInvoiceNumber={invoiceNumber}
            initialPracticeFirm={practiceFirm}
            onSaveInvoiceDetails={onSaveInvoiceDetails}
            isSavingInvoiceDetails={isSavingInvoiceDetails}
          />
        )}
      </div>
    </div>
  );
};

export default ChargesManager;
