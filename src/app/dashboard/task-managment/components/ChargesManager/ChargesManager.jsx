"use client";
import { useState, useEffect } from "react";
import { Plus, List, PieChart } from "lucide-react";

import ChargesSummary from "../ChargesSummary/ChargesSummary";
import ChargeCard from "../ChargeCard/ChargeCard";
import ActionButton from "@/app/components/TinyLib/ActionButton";

import "./ChargesManager.scss";

/**
 * ChargesManager Component
 * Pure presentation component with local state
 * Parent handles saving to Redux
 */
const ChargesManager = ({
  initialCharges = [],
  onAddCharge,
  onUpdateCharge,
  onDeleteCharge,
  onSaveInvoiceDetails, // New prop for saving invoice details
  isLoading = false,
  isSavingInvoiceDetails = false, // New prop for invoice details loading state
  invoiceNumber = "", // New prop for initial invoice number
  practiceFirm = null, // New prop for initial practice firm
}) => {
  const [view, setView] = useState("items"); // 'items' or 'summary'
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [localCharges, setLocalCharges] = useState([]);

  // Sync initial charges to local state
  useEffect(() => {
    setLocalCharges(initialCharges || []);
  }, [initialCharges]);

  const handleAddCharge = () => {
    const newId = `new-${Date.now()}`;
    const newCharge = {
      id: newId,
      title: "",
      charge_type: "EXTERNAL_CHARGE",
      amount: "",
      bearer: "CLIENT",
      status: "NOT_PAID",
      remark: "",
      isNew: true,
    };

    setLocalCharges([newCharge, ...localCharges]);
    setIsAddingNew(true);
    setView("items");
  };

  const handleSaveNewCharge = async (id, chargeData) => {
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
        setIsAddingNew(false);
      }
    }
  };

  const handleCancelNewCharge = (id) => {
    setLocalCharges(localCharges.filter((charge) => charge.id !== id));
    setIsAddingNew(false);
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
    if (window.confirm("Are you sure you want to delete this charge?")) {
      if (onDeleteCharge) {
        await onDeleteCharge(id);
      }
    }
  };

  const handleSaveInvoiceDetails = async (invoiceData) => {
    if (onSaveInvoiceDetails) {
      const success = await onSaveInvoiceDetails(invoiceData);
      return success;
    }
    return false;
  };

  // Calculate summary
  const calculateSummary = () => {
    const savedCharges = localCharges.filter((charge) => !charge.isNew);

    let totalBilled = 0;
    let writtenOff = 0;
    let prepaidByClient = 0;
    let firmsFee = 0;
    let externalExpenses = 0;

    savedCharges.forEach((charge) => {
      const amount = parseFloat(charge.amount) || 0;

      totalBilled += amount;

      if (charge.status === "WRITTEN_OFF") {
        writtenOff += amount;
      } else if (charge.status === "PAID") {
        prepaidByClient += amount;
      }

      if (charge.charge_type === "SERVICE_FEE") {
        firmsFee += amount;
      } else {
        externalExpenses += amount;
      }
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

  // Transform charge data for ChargeCard component
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

  const savedChargesCount = localCharges.filter((c) => !c.isNew).length;

  return (
    <div className="charges-manager">
      {/* Header */}
      <div className="charges-manager__header">
        <div className="charges-manager__header-left">
          <ActionButton
            text="Add New Charge"
            icon={Plus}
            onClick={handleAddCharge}
            variant="primary"
            size="medium"
            disabled={isAddingNew || isLoading}
            isLoading={isLoading}
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
            disabled={isAddingNew}
          >
            <PieChart size={18} />
            <span>Summary</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="charges-manager__content">
        {view === "items" ? (
          <div className="charges-manager__charges-list">
            {localCharges.length === 0 ? (
              <div className="charges-manager__empty-state">
                <p>No charges added yet. Click "Add New Charge" to begin.</p>
              </div>
            ) : (
              localCharges.map((charge) => (
                <ChargeCard
                  key={charge.id}
                  charge={transformChargeForCard(charge)}
                  onUpdate={(updatedData) => {
                    if (charge.isNew) {
                      handleSaveNewCharge(charge.id, updatedData);
                    } else {
                      handleUpdateExistingCharge(charge.id, updatedData);
                    }
                  }}
                  onCancel={() => {
                    if (charge.isNew) {
                      handleCancelNewCharge(charge.id);
                    }
                  }}
                  onDelete={() => handleDeleteExistingCharge(charge.id)}
                  isNewCharge={charge.isNew}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>
        ) : (
          <ChargesSummary
            summary={calculateSummary()}
            initialInvoiceNumber={invoiceNumber}
            initialPracticeFirm={practiceFirm}
            onSaveInvoiceDetails={handleSaveInvoiceDetails}
            isSavingInvoiceDetails={isSavingInvoiceDetails}
          />
        )}
      </div>
    </div>
  );
};

export default ChargesManager;