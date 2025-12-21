"use client";
import { useState } from "react";
import { Plus, List, PieChart } from "lucide-react";
import ChargeCard from "./ChargeCard";
import ChargesSummary from "./ChargesSummary";
import ActionButton from "./ActionButton";
import styles from "./ChargesManager.module.scss";

const ChargesManager = () => {
  const [view, setView] = useState("items"); // 'items' or 'summary'
  const [charges, setCharges] = useState([
    {
      id: 1,
      chargeTitle: "Digital signature bought for DSC renewal",
      chargeType: "external",
      chargeAmount: "25859",
      whoIsBearer: "client",
      paymentStatus: "not-paid",
      remarks:
        "Customer has bought a new DSC for this firm and he paid directly via his own credit card",
      createdBy: {
        name: "Sania Kakkar",
        date: "15 July 2025",
        avatar: "/avatars/sania.jpg",
      },
      lastUpdatedBy: {
        name: "Sahil Joshi",
        date: "20 July 2025",
        avatar: "/avatars/sahil.jpg",
      },
    },
    {
      id: 2,
      chargeTitle: "Court Filing Fees",
      chargeType: "external",
      chargeAmount: "15000",
      whoIsBearer: "client",
      paymentStatus: "paid",
      remarks: "Payment received via bank transfer",
      createdBy: {
        name: "Rahul Sharma",
        date: "10 July 2025",
        avatar: "/avatars/rahul.jpg",
      },
      lastUpdatedBy: {
        name: "Rahul Sharma",
        date: "10 July 2025",
        avatar: "/avatars/rahul.jpg",
      },
    },
    {
      id: 3,
      chargeTitle: "Legal Consultation Service",
      chargeType: "internal",
      chargeAmount: "50000",
      whoIsBearer: "client",
      paymentStatus: "paid",
      remarks: "3 hours consultation provided",
      createdBy: {
        name: "Priya Mehta",
        date: "05 July 2025",
        avatar: "/avatars/priya.jpg",
      },
      lastUpdatedBy: {
        name: "Priya Mehta",
        date: "05 July 2025",
        avatar: "/avatars/priya.jpg",
      },
    },
  ]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newChargeId, setNewChargeId] = useState(null);

  const handleAddCharge = () => {
    const newId = Date.now(); // Using timestamp as unique ID
    const newCharge = {
      id: newId,
      chargeTitle: "",
      chargeType: "external",
      chargeAmount: "",
      whoIsBearer: "client",
      paymentStatus: "not-paid",
      remarks: "",
      createdBy: {
        name: "Current User",
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        avatar: "/avatars/default.jpg",
      },
      lastUpdatedBy: {
        name: "Current User",
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        avatar: "/avatars/default.jpg",
      },
      isNew: true, // Flag to indicate this is a new unsaved charge
    };

    setCharges([newCharge, ...charges]);
    setIsAddingNew(true);
    setNewChargeId(newId);
    setView("items"); // Switch to items view when adding new charge
  };

  const handleSaveNewCharge = (id, chargeData) => {
    setCharges(
      charges.map((charge) =>
        charge.id === id
          ? {
              ...charge,
              ...chargeData,
              isNew: false,
            }
          : charge
      )
    );
    setIsAddingNew(false);
    setNewChargeId(null);
  };

  const handleCancelNewCharge = (id) => {
    setCharges(charges.filter((charge) => charge.id !== id));
    setIsAddingNew(false);
    setNewChargeId(null);
  };

  const handleUpdateCharge = (id, updatedData) => {
    setCharges(
      charges.map((charge) =>
        charge.id === id
          ? {
              ...charge,
              ...updatedData,
              lastUpdatedBy: {
                name: "Current User",
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
                avatar: "/avatars/default.jpg",
              },
            }
          : charge
      )
    );
  };

  const handleDeleteCharge = (id) => {
    setCharges(charges.filter((charge) => charge.id !== id));
  };

  // Calculate summary data
  const calculateSummary = () => {
    // Only include saved charges (not new unsaved ones)
    const savedCharges = charges.filter((charge) => !charge.isNew);

    let totalBilled = 0;
    let writtenOff = 0;
    let prepaidByClient = 0;
    let firmsFee = 0;
    let externalExpenses = 0;

    savedCharges.forEach((charge) => {
      const amount = parseFloat(charge.chargeAmount) || 0;

      // Total billed includes all charges
      totalBilled += amount;

      // Calculate based on payment status
      if (charge.paymentStatus === "written-off") {
        writtenOff += amount;
      } else if (charge.paymentStatus === "paid") {
        prepaidByClient += amount;
      }

      // Calculate based on charge type
      if (charge.chargeType === "internal") {
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

  const savedChargesCount = charges.filter((charge) => !charge.isNew).length;

  return (
    <div className={styles.chargesManager}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ActionButton
            text="Add New Charge"
            icon={Plus}
            onClick={handleAddCharge}
            variant="primary"
            size="medium"
            disabled={isAddingNew}
          />
          {
            savedChargesCount > 0 ? <div className={styles.itemCount}>
            <span className={styles.count}>{savedChargesCount}</span>
            <span className={styles.countLabel}>Items</span>
          </div> : null
          }
        </div>

        <div className={styles.viewToggleContainer}>
          <button
            className={`${styles.viewToggle} ${
              view === "items" ? styles.activeItems : ""
            }`}
            onClick={() => setView("items")}
          >
            <List size={18} />
            <span>Items View</span>
          </button>

          <button
            className={`${styles.viewToggle} ${
              view === "summary" ? styles.activeSummary : ""
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
      <div className={styles.content}>
        {view === "items" ? (
          <div className={styles.chargesList}>
            {charges.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No charges added yet. Click "Add New Charge" to begin.</p>
              </div>
            ) : (
              charges.map((charge) => (
                <ChargeCard
                  key={charge.id}
                  charge={charge}
                  onUpdate={(updatedData) => {
                    if (charge.isNew) {
                      handleSaveNewCharge(charge.id, updatedData);
                    } else {
                      handleUpdateCharge(charge.id, updatedData);
                    }
                  }}
                  onCancel={() => {
                    if (charge.isNew) {
                      handleCancelNewCharge(charge.id);
                    }
                  }}
                  onDelete={() => handleDeleteCharge(charge.id)}
                  isNewCharge={charge.isNew}
                />
              ))
            )}
          </div>
        ) : (
          <ChargesSummary summary={calculateSummary()} />
        )}
      </div>
    </div>
  );
};

export default ChargesManager;
