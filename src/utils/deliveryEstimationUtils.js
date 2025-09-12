/**
 * Delivery Estimation Utilities
 * Calculates estimated delivery times based on product quantity thresholds and vehicle capacity
 */

/**
 * Calculate estimated delivery times by quantity thresholds
 * @param {Array} orders - Array of orders from DEF_ORDERS collection
 * @param {Array} vehicles - Array of active vehicles from VEHICLES collection
 * @param {Array} thresholds - Array of quantity thresholds [1500, 2500, 3000, 4000]
 * @returns {Array} Array of threshold objects with ETA calculations
 */
export const calculateEstimatedDeliveryTimes = (orders, vehicles, thresholds = [1500, 2500, 3000, 4000]) => {
  if (!orders || !vehicles || orders.length === 0 || vehicles.length === 0) {
    return thresholds.map(threshold => ({
      range: `≤${threshold.toLocaleString()}`,
      totalQuantity: 0,
      estimatedDays: 0,
      color: 'gray'
    }));
  }

  // Calculate total weekly capacity from active vehicles
  const totalWeeklyCapacity = vehicles.reduce((total, vehicle) => {
    if (!vehicle.weeklyCapacity) return total;
    const weeklyCap = Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
    return total + weeklyCap;
  }, 0);

  if (totalWeeklyCapacity === 0) {
    return thresholds.map(threshold => ({
      range: `≤${threshold.toLocaleString()}`,
      totalQuantity: 0,
      estimatedDays: 0,
      color: 'gray'
    }));
  }

  // Process orders and split by orderCount if > 1
  const processedOrders = [];
  orders.forEach(order => {
    const orderCount = order.orderCount || 1;
    const productQuant = order.productQuant || 0;
    
    // Split into sub-orders if orderCount > 1
    for (let i = 0; i < orderCount; i++) {
      processedOrders.push({
        ...order,
        productQuant: productQuant,
        originalOrderCount: orderCount
      });
    }
  });

  // Calculate results for each threshold
  return thresholds.map(threshold => {
    // Filter orders within this threshold
    const ordersInThreshold = processedOrders.filter(order => 
      order.productQuant <= threshold
    );

    // Calculate total pending quantity
    const totalQuantity = ordersInThreshold.reduce((sum, order) => 
      sum + (order.productQuant || 0), 0
    );

    // Calculate estimated days
    const estimatedDays = totalQuantity > 0 ? Math.ceil(totalQuantity / totalWeeklyCapacity) : 0;

    // Determine color based on ETA
    let color = 'gray';
    if (estimatedDays > 0) {
      if (estimatedDays < 3) {
        color = 'green';
      } else if (estimatedDays <= 7) {
        color = 'orange';
      } else {
        color = 'red';
      }
    }

    return {
      range: `≤${threshold.toLocaleString()}`,
      totalQuantity,
      estimatedDays,
      color,
      threshold
    };
  });
};

/**
 * Get color classes for UI components based on ETA color
 * @param {string} color - Color identifier ('green', 'orange', 'red', 'gray')
 * @returns {Object} Object with background, border, and text color classes
 */
export const getColorClasses = (color) => {
  const colorMap = {
    green: {
      background: "rgba(34,197,94,0.1)",
      borderColor: "rgba(34,197,94,0.3)",
      textColor: "#22c55e",
      lightTextColor: "#86efac"
    },
    orange: {
      background: "rgba(251,191,36,0.1)",
      borderColor: "rgba(251,191,36,0.3)",
      textColor: "#fbbf24",
      lightTextColor: "#fde68a"
    },
    red: {
      background: "rgba(239,68,68,0.1)",
      borderColor: "rgba(239,68,68,0.3)",
      textColor: "#ef4444",
      lightTextColor: "#fca5a5"
    },
    gray: {
      background: "rgba(107,114,128,0.1)",
      borderColor: "rgba(107,114,128,0.3)",
      textColor: "#9ca3af",
      lightTextColor: "#d1d5db"
    }
  };

  return colorMap[color] || colorMap.gray;
};

/**
 * Format estimated delivery time for display
 * @param {number} days - Number of days
 * @returns {string} Formatted string
 */
export const formatEstimatedTime = (days) => {
  if (days === 0) return 'N/A';
  if (days === 1) return '1 day';
  return `${days} days`;
};

