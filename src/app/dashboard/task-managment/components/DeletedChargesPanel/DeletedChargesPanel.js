"use client";
import { X, Trash2, AlertTriangle } from "lucide-react";
import ChargeCard from "../ChargeCard/ChargeCard";
import "./DeletedChargesPanel.scss";

const DeletedChargesPanel = ({
  deletedCharges = [],
  onRestore,
  onHardDelete,
  chargeOperations = {},
  onClose,
}) => {
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

    // Include deletion metadata
    deleted_by: charge.deleted_by,
    deleted_at: charge.deleted_at,
  });

  return (
    <div className="deleted-charges-panel">
      <div className="deleted-charges-panel__header">
        <div className="deleted-charges-panel__header-left">
          <Trash2 size={20} />
          <h3>Deleted Charges</h3>
          <span className="deleted-charges-panel__count">
            {deletedCharges.length}
          </span>
        </div>
        <button
          className="deleted-charges-panel__close"
          onClick={onClose}
          aria-label="Close deleted charges panel"
        >
          <X size={20} />
        </button>
      </div>

      <div className="deleted-charges-panel__info">
        <AlertTriangle size={16} />
        <p>
          Deleted charges can be restored or permanently deleted. Permanent
          deletion cannot be undone.
        </p>
      </div>

      <div className="deleted-charges-panel__list">
        {deletedCharges.length === 0 ? (
          <div className="deleted-charges-panel__empty">
            <p>No deleted charges</p>
          </div>
        ) : (
          deletedCharges.map((charge) => {
            const chargeOperation = chargeOperations[charge.id];
            const isChargeLoading =
              chargeOperation === "restoring" ||
              chargeOperation === "hard-deleting";

            return (
              <ChargeCard
                key={charge.id}
                charge={transformChargeForCard(charge)}
                onRestore={() => onRestore(charge.id)}
                onHardDelete={() => onHardDelete(charge.id)}
                isLoading={isChargeLoading}
                operationType={chargeOperation}
                mode="deleted"
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeletedChargesPanel;
