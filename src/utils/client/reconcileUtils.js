export const formatIndianCurrency = (amount, includeSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? "₹0" : "0";
  }

  const numAmount = parseFloat(amount);
  const formatted = numAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `₹${formatted}` : formatted;
};

export const validateDateRange = (fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return { valid: true, error: null };
  }

  if (!fromDate || !toDate) {
    return {
      valid: false,
      error: "Please select both start and end dates",
    };
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return {
      valid: false,
      error: "Invalid date format",
    };
  }

  // Check if from date is after to date
  if (from > to) {
    return {
      valid: false,
      error: "Start date cannot be after end date",
    };
  }

  const daysDiff = Math.floor((to - from) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    return {
      valid: false,
      error: "Date range cannot exceed 1 year",
    };
  }

  return { valid: true, error: null };
};

export function calculateRecoverables(charges = []) {
  const result = {
    totalRecoverable: 0,
    totalCount: 0,

    serviceFee: { amount: 0, count: 0 },
    governmentFee: { amount: 0, count: 0 },
    externalCharge: { amount: 0, count: 0 },
  };

  for (const charge of charges) {
    if (charge.bearer !== "CLIENT" || charge.status !== "NOT_PAID") {
      continue;
    }

    const amount = Number(charge.amount) || 0;

    result.totalRecoverable += amount;
    result.totalCount += 1;

    switch (charge.charge_type) {
      case "SERVICE_FEE":
        result.serviceFee.amount += amount;
        result.serviceFee.count += 1;
        break;

      case "GOVERNMENT_FEE":
        result.governmentFee.amount += amount;
        result.governmentFee.count += 1;
        break;

      case "EXTERNAL_CHARGE":
        result.externalCharge.amount += amount;
        result.externalCharge.count += 1;
        break;

      default:
        break;
    }
  }

  return result;
}
