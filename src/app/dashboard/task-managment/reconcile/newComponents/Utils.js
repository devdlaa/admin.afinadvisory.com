/**
 * Utility functions for BillingTable component
 */

/**
 * Calculate total recoverable amount and count from charges
 * @param {Array} tasks - Array of task objects with charges
 * @param {Function} calculationFn - Function to determine if charge is recoverable
 * @returns {Object} { total, count }
 */
export const calculateRecoverable = (tasks, calculationFn) => {
  let total = 0;
  let count = 0;

  tasks.forEach(task => {
    if (task.charges && task.charges.length > 0) {
      task.charges.forEach(charge => {
        if (calculationFn(charge)) {
          total += parseFloat(charge.amount || 0);
          count++;
        }
      });
    }
  });

  return { total, count };
};

/**
 * Format currency for Indian Rupees
 * @param {Number} amount - Amount to format
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format date in DD Month YYYY format
 * @param {String|Date} date - Date to format
 * @returns {String} Formatted date string
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Check if a task is a system task
 * @param {Object} taskData - Task data object
 * @returns {Boolean}
 */
export const isSystemTask = (taskData) => {
  return taskData.type === 'ADHOC' || taskData.task.is_system;
};

/**
 * Get charge type label
 * @param {String} chargeType - Charge type code
 * @returns {String} Human-readable label
 */
export const getChargeTypeLabel = (chargeType) => {
  const labels = {
    'SERVICE_FEE': 'Service Fee',
    'EXTERNAL_CHARGE': 'External Charge',
    'CONSULTATION': 'Consultation',
  };
  return labels[chargeType] || chargeType;
};

/**
 * Get payment status label
 * @param {String} status - Payment status code
 * @returns {String} Human-readable label
 */
export const getPaymentStatusLabel = (status) => {
  const labels = {
    'PAID': 'Paid',
    'NOT_PAID': 'Not Paid Yet',
    'PARTIALLY_PAID': 'Partially Paid',
  };
  return labels[status] || status;
};

/**
 * Get bearer label
 * @param {String} bearer - Bearer code
 * @returns {String} Human-readable label
 */
export const getBearerLabel = (bearer) => {
  const labels = {
    'CLIENT_WILL_PAY': 'Client Will Pay',
    'COMPANY_WILL_PAY': 'Company Will Pay',
  };
  return labels[bearer] || bearer;
};

/**
 * Validate charge data
 * @param {Object} charge - Charge object to validate
 * @returns {Object} { isValid, errors }
 */
export const validateCharge = (charge) => {
  const errors = [];

  if (!charge.title || charge.title.trim() === '') {
    errors.push('Charge title is required');
  }

  if (!charge.amount || parseFloat(charge.amount) <= 0) {
    errors.push('Valid charge amount is required');
  }

  if (!charge.charge_type) {
    errors.push('Charge type is required');
  }

  if (!charge.who_is_bearer) {
    errors.push('Bearer selection is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Group tasks by entity
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Grouped tasks by entity ID
 */
export const groupTasksByEntity = (tasks) => {
  return tasks.reduce((acc, task) => {
    const entityId = task.task.entity?.id;
    if (!acc[entityId]) {
      acc[entityId] = {
        entity: task.task.entity,
        tasks: []
      };
    }
    acc[entityId].tasks.push(task);
    return acc;
  }, {});
};

/**
 * Calculate summary statistics for tasks
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Summary statistics
 */
export const calculateSummary = (tasks) => {
  let totalTasks = tasks.length;
  let totalCharges = 0;
  let totalAmount = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  let systemTasks = 0;

  tasks.forEach(task => {
    if (isSystemTask(task)) {
      systemTasks++;
    }

    if (task.charges && task.charges.length > 0) {
      totalCharges += task.charges.length;

      task.charges.forEach(charge => {
        const amount = parseFloat(charge.amount || 0);
        totalAmount += amount;

        if (charge.status === 'PAID') {
          paidAmount += amount;
        } else {
          unpaidAmount += amount;
        }
      });
    }
  });

  return {
    totalTasks,
    systemTasks,
    regularTasks: totalTasks - systemTasks,
    totalCharges,
    totalAmount,
    paidAmount,
    unpaidAmount,
    averageChargesPerTask: totalTasks > 0 ? (totalCharges / totalTasks).toFixed(2) : 0
  };
};

/**
 * Filter tasks based on search query
 * @param {Array} tasks - Array of task objects
 * @param {String} query - Search query
 * @returns {Array} Filtered tasks
 */
export const filterTasks = (tasks, query) => {
  if (!query || query.trim() === '') {
    return tasks;
  }

  const searchTerm = query.toLowerCase();

  return tasks.filter(task => {
    // Search in task title
    if (task.task.title.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in entity name
    if (task.task.entity?.name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in charge titles
    if (task.charges && task.charges.length > 0) {
      return task.charges.some(charge =>
        charge.title.toLowerCase().includes(searchTerm)
      );
    }

    return false;
  });
};

/**
 * Sort tasks by different criteria
 * @param {Array} tasks - Array of task objects
 * @param {String} sortBy - Sort criteria
 * @param {String} order - 'asc' or 'desc'
 * @returns {Array} Sorted tasks
 */
export const sortTasks = (tasks, sortBy, order = 'asc') => {
  const sortedTasks = [...tasks];

  sortedTasks.sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'title':
        compareA = a.task.title.toLowerCase();
        compareB = b.task.title.toLowerCase();
        break;
      case 'created_at':
        compareA = new Date(a.task.created_at);
        compareB = new Date(b.task.created_at);
        break;
      case 'entity':
        compareA = a.task.entity?.name.toLowerCase() || '';
        compareB = b.task.entity?.name.toLowerCase() || '';
        break;
      case 'amount':
        compareA = calculateRecoverable([a], (charge) => true).total;
        compareB = calculateRecoverable([b], (charge) => true).total;
        break;
      default:
        return 0;
    }

    if (compareA < compareB) return order === 'asc' ? -1 : 1;
    if (compareA > compareB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sortedTasks;
};

export default {
  calculateRecoverable,
  formatCurrency,
  formatDate,
  isSystemTask,
  getChargeTypeLabel,
  getPaymentStatusLabel,
  getBearerLabel,
  validateCharge,
  groupTasksByEntity,
  calculateSummary,
  filterTasks,
  sortTasks
};