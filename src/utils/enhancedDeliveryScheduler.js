/**
 * Enhanced Delivery Scheduler
 * Client-side delivery date calculation with round-robin vehicle assignment
 * and virtual sub-order expansion for multi-count orders
 */

/**
 * Expand multi-count orders into virtual sub-orders
 * @param {Array} orders - Array of orders from DEF_ORDERS
 * @returns {Array} Array of virtual sub-orders
 */
export const expandMultiCountOrders = (orders) => {
  const virtualOrders = [];
  
  orders.forEach(order => {
    const orderCount = order.orderCount || 1;
    const productQuant = order.productQuant || 0;
    
    // Create virtual sub-orders for multi-count orders
    for (let i = 0; i < orderCount; i++) {
      virtualOrders.push({
        ...order,
        virtualOrderId: `${order.id}_${i}`,
        originalOrderId: order.id,
        subOrderIndex: i,
        productQuant: productQuant,
        isVirtual: true
      });
    }
  });
  
  return virtualOrders;
};

/**
 * Get day name from date (Thu = 0, Fri = 1, ..., Wed = 6)
 * @param {Date} date - Date object
 * @returns {string} Day name (Thu, Fri, Sat, Sun, Mon, Tue, Wed)
 */
export const getDayName = (date) => {
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  const dayIndex = (date.getDay() + 4) % 7; // Convert Sunday=0 to Thursday=0
  return days[dayIndex];
};

/**
 * Get next day from current date
 * @param {Date} date - Current date
 * @returns {Date} Next day
 */
export const getNextDay = (date) => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
};

/**
 * Find the next available delivery date for a vehicle
 * @param {Object} vehicle - Vehicle object with weeklyCapacity
 * @param {Date} startDate - Starting date (tomorrow)
 * @param {Object} vehicleSchedule - Current schedule for this vehicle
 * @param {number} requiredQuantity - Required quantity for the order
 * @returns {Object} { deliveryDate, dayName, remainingCapacity }
 */
export const findNextAvailableDate = (vehicle, startDate, vehicleSchedule, requiredQuantity) => {
  if (!vehicle.weeklyCapacity) {
    console.log('❌ No weekly capacity for vehicle:', vehicle.vehicleNo);
    return null;
  }

  // Only log for first few calls to reduce noise
  if (Math.random() < 0.1) { // 10% chance to log
    console.log('🔍 Finding available date for:', {
      vehicleNo: vehicle.vehicleNo,
      requiredQuantity,
      weeklyCapacity: vehicle.weeklyCapacity
    });
  }

  let currentDate = new Date(startDate);
  const maxDaysToCheck = 56; // Check up to 8 weeks ahead
  let daysChecked = 0;

  while (daysChecked < maxDaysToCheck) {
    const dayName = getDayName(currentDate);
    const dayCapacity = vehicle.weeklyCapacity[dayName] || 0;
    const usedCapacity = vehicleSchedule[dayName] || 0;
    const remainingCapacity = dayCapacity - usedCapacity;

    // FIXED: Compare order count (1) against daily capacity, not quantity against capacity
    const canFit = remainingCapacity >= 1; // Each order takes 1 slot regardless of quantity

    // Only log when we find a slot or when checking the first few days
    if (canFit || daysChecked < 3) {
      console.log(`Checking ${dayName} (${currentDate.toISOString().split('T')[0]}):`, {
        dayCapacity,
        usedCapacity,
        remainingCapacity,
        canFit: canFit
      });
    }

    if (canFit) {
      console.log(`✅ Found available slot on ${dayName}`);
      return {
        deliveryDate: new Date(currentDate),
        dayName: dayName,
        remainingCapacity: remainingCapacity - 1, // Reserve 1 slot for this order
        totalCapacity: dayCapacity,
        usedCapacity: usedCapacity + 1 // Mark 1 slot as used
      };
    }

    currentDate = getNextDay(currentDate);
    daysChecked++;
  }

  // If no capacity found, return a fallback date
  console.log('❌ No capacity found, using fallback date');
  const fallbackDate = new Date(startDate);
  fallbackDate.setDate(fallbackDate.getDate() + 30);
  return {
    deliveryDate: fallbackDate,
    dayName: getDayName(fallbackDate),
    remainingCapacity: 0,
    totalCapacity: 0,
    usedCapacity: 0
  };
};

/**
 * Assign orders to vehicles using round-robin algorithm
 * @param {Array} virtualOrders - Array of virtual sub-orders
 * @param {Array} vehicles - Array of active vehicles
 * @param {Date} startDate - Starting date (tomorrow)
 * @returns {Array} Orders with assigned vehicles and delivery dates
 */
export const assignOrdersToVehicles = (virtualOrders, vehicles, startDate) => {
  if (!vehicles || vehicles.length === 0) {
    return virtualOrders.map(order => ({
      ...order,
      assignedVehicle: null,
      vehicleNo: null,
      vehicleType: null,
      estimatedDeliveryDate: null,
      dayName: null
    }));
  }

  // Filter vehicles that can handle orders
  const suitableVehicles = vehicles.filter(vehicle => {
    const hasQuantity = vehicle.vehicleQuantity && parseInt(vehicle.vehicleQuantity) > 0;
    const hasCapacity = vehicle.weeklyCapacity && Object.values(vehicle.weeklyCapacity).some(cap => cap > 0);
    console.log('Vehicle check:', {
      vehicleNo: vehicle.vehicleNo,
      vehicleQuantity: vehicle.vehicleQuantity,
      hasQuantity,
      hasCapacity,
      weeklyCapacity: vehicle.weeklyCapacity
    });
    return hasQuantity && hasCapacity;
  });

  console.log('Suitable vehicles found:', suitableVehicles.length);

  if (suitableVehicles.length === 0) {
    console.log('No suitable vehicles found, returning unassigned orders');
    return virtualOrders.map(order => ({
      ...order,
      assignedVehicle: null,
      vehicleNo: null,
      vehicleType: null,
      estimatedDeliveryDate: null,
      dayName: null
    }));
  }

  // Initialize vehicle schedules - each vehicle gets a deep copy of its weekly capacity
  const vehicleSchedules = {};
  suitableVehicles.forEach(vehicle => {
    vehicleSchedules[vehicle.id] = {
      Thu: 0, Fri: 0, Sat: 0, Sun: 0, Mon: 0, Tue: 0, Wed: 0,
      // Track daily assignments for better scheduling
      dailyAssignments: {}
    };
  });

  // Round-robin vehicle assignment
  let vehicleIndex = 0;
  const assignedOrders = [];

  virtualOrders.forEach((order, orderIndex) => {
    const productQuant = order.productQuant || 0;
    let assigned = false;
    let attempts = 0;
    const maxAttempts = suitableVehicles.length;

    // Only log every 10th order to reduce noise
    if (orderIndex % 10 === 0 || orderIndex < 5) {
      console.log(`Processing order ${orderIndex + 1}/${virtualOrders.length}:`, {
        productQuant,
        clientName: order.clientName,
        vehicleIndex
      });
    }

    while (!assigned && attempts < maxAttempts) {
      const vehicle = suitableVehicles[vehicleIndex];
      const vehicleSchedule = vehicleSchedules[vehicle.id];
      
      // Only log vehicle attempts for first few orders or when debugging
      if (orderIndex < 3 || attempts === 0) {
        console.log(`Trying vehicle ${vehicleIndex}:`, {
          vehicleNo: vehicle.vehicleNo,
          vehicleQuantity: parseInt(vehicle.vehicleQuantity),
          productQuant,
          canHandle: parseInt(vehicle.vehicleQuantity) >= productQuant
        });
      }
      
      // Check if vehicle can handle this quantity
      if (parseInt(vehicle.vehicleQuantity) >= productQuant) {
        const availableSlot = findNextAvailableDate(vehicle, startDate, vehicleSchedule, productQuant);
        
        console.log('Available slot found:', availableSlot);
        
        if (availableSlot && availableSlot.remainingCapacity >= 0) {
          // Assign order to vehicle
          const assignedOrder = {
            ...order,
            assignedVehicle: vehicle.id,
            vehicleNo: vehicle.vehicleNo,
            vehicleType: vehicle.type,
            estimatedDeliveryDate: availableSlot.deliveryDate,
            dayName: availableSlot.dayName,
            remainingCapacity: availableSlot.remainingCapacity,
            totalCapacity: availableSlot.totalCapacity,
            usedCapacity: availableSlot.usedCapacity
          };
          
          // Update vehicle schedule for this specific day (increment by 1 order, not quantity)
          vehicleSchedule[availableSlot.dayName] = (vehicleSchedule[availableSlot.dayName] || 0) + 1;
          
          // Track daily assignments for debugging
          const dateKey = availableSlot.deliveryDate.toISOString().split('T')[0];
          if (!vehicleSchedule.dailyAssignments[dateKey]) {
            vehicleSchedule.dailyAssignments[dateKey] = [];
          }
          vehicleSchedule.dailyAssignments[dateKey].push({
            orderId: order.virtualOrderId || order.id,
            quantity: productQuant,
            dayName: availableSlot.dayName,
            orderCount: 1 // Each virtual order counts as 1 order slot
          });
          
          assignedOrders.push(assignedOrder);
          assigned = true;
          console.log(`✅ Order assigned to ${vehicle.vehicleNo} for ${availableSlot.deliveryDate.toISOString().split('T')[0]}`);
        } else {
          console.log(`❌ No capacity available for ${vehicle.vehicleNo}`);
        }
      } else {
        console.log(`❌ Vehicle ${vehicle.vehicleNo} cannot handle quantity ${productQuant}`);
      }
      
      // Move to next vehicle (round-robin)
      vehicleIndex = (vehicleIndex + 1) % suitableVehicles.length;
      attempts++;
    }

    // If no vehicle could handle this order, assign with null values
    if (!assigned) {
      console.log(`❌ No vehicle could handle order ${orderIndex + 1}`);
      assignedOrders.push({
        ...order,
        assignedVehicle: null,
        vehicleNo: null,
        vehicleType: null,
        estimatedDeliveryDate: null,
        dayName: null
      });
    }
  });

  return assignedOrders;
};

/**
 * Calculate quantity threshold statistics
 * @param {Array} assignedOrders - Orders with assigned vehicles
 * @param {Array} vehicles - Array of active vehicles
 * @param {Array} thresholds - Quantity thresholds [1000, 1500, 2000, 2500, 3000, 4000]
 * @param {Date} startDate - Starting date (tomorrow)
 * @returns {Array} Threshold statistics
 */
export const calculateQuantityThresholdStats = (assignedOrders, vehicles, thresholds = [1000, 1500, 2000, 2500, 3000, 4000], startDate = new Date()) => {
  // Calculate total weekly capacity
  const totalWeeklyCapacity = vehicles.reduce((total, vehicle) => {
    if (!vehicle.weeklyCapacity) return total;
    return total + Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
  }, 0);


  if (totalWeeklyCapacity === 0) {
    return thresholds.map(threshold => ({
      range: `≤${threshold.toLocaleString()}`,
      totalQuantity: 0,
      estimatedDays: 0,
      color: 'gray',
      threshold,
      orderCount: 0
    }));
  }

  // Group orders by quantity thresholds
  const thresholdGroups = {};
  thresholds.forEach(threshold => {
    thresholdGroups[threshold] = {
      orders: [],
      totalQuantity: 0
    };
  });

  // No overflow group needed since max order is 4000 bricks

  // Categorize orders
  assignedOrders.forEach(order => {
    const quantity = order.productQuant || 0;
    
    if (quantity <= 0) return;

    // Find appropriate threshold
    let assigned = false;
    for (const threshold of thresholds) {
      if (quantity <= threshold) {
        thresholdGroups[threshold].orders.push(order);
        thresholdGroups[threshold].totalQuantity += quantity;
        assigned = true;
        break;
      }
    }

    // If no threshold matched, skip the order (shouldn't happen since max is 4000)
    if (!assigned) {
      // Order exceeds maximum threshold 4000
    }
  });

  // Calculate ETA for each threshold
  const results = [];
  
  // Process regular thresholds
  thresholds.forEach(threshold => {
    const group = thresholdGroups[threshold];
    const totalQuantity = group.totalQuantity;
    const orderCount = group.orders.length;
    
    // Calculate suitable vehicles for this threshold
    const suitableVehicles = vehicles.filter(vehicle => {
      const vehicleQuantity = parseInt(vehicle.vehicleQuantity) || 0;
      return vehicleQuantity === threshold;
    });
    
    // Calculate total daily capacity of all suitable vehicles
    const totalDailyCapacity = suitableVehicles.reduce((total, vehicle) => {
      if (!vehicle.weeklyCapacity) return total;
      // Use maximum daily capacity instead of average for more realistic ETA
      const maxDailyCapacity = Math.max(...Object.values(vehicle.weeklyCapacity));
      return total + maxDailyCapacity;
    }, 0);
    
    // ETA = X ÷ Total Daily Capacity
    // X = orderCount (number of orders)
    // Total Daily Capacity = sum of all vehicles' maximum daily capacity
    const estimatedDays = orderCount > 0 && totalDailyCapacity > 0 
      ? Math.ceil(orderCount / totalDailyCapacity) 
      : 0;
    
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


    results.push({
      range: `≤${threshold.toLocaleString()}`,
      totalQuantity,
      estimatedDays,
      color,
      threshold,
      orderCount: group.orders.length
    });
  });

  // No overflow group processing needed since max order is 4000 bricks

  return results;
};

/**
 * Main scheduling function
 * @param {Array} orders - Orders from DEF_ORDERS
 * @param {Array} vehicles - Vehicles from VEHICLE collection
 * @param {Date} startDate - Starting date (default: tomorrow)
 * @returns {Object} { assignedOrders, thresholdStats, totalWeeklyCapacity }
 */
export const scheduleDeliveries = (orders, vehicles, startDate = null) => {
  // Default start date to tomorrow
  const tomorrow = startDate || (() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  })();

  console.log('🚀 Starting delivery scheduling...', {
    ordersCount: orders.length,
    vehiclesCount: vehicles.length,
    startDate: tomorrow.toISOString().split('T')[0]
  });

  // Step 1: Expand multi-count orders into virtual sub-orders
  const virtualOrders = expandMultiCountOrders(orders);
  console.log('📦 Virtual orders created:', virtualOrders.length);

  // Step 2: Assign orders to vehicles using round-robin
  const assignedOrders = assignOrdersToVehicles(virtualOrders, vehicles, tomorrow);
  
  // Debug: Log delivery date distribution
  const deliveryDates = assignedOrders
    .filter(order => order.estimatedDeliveryDate)
    .map(order => order.estimatedDeliveryDate.toISOString().split('T')[0])
    .reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
  
  console.log('📅 Delivery date distribution:', deliveryDates);

  // Step 3: Calculate quantity threshold statistics
  const thresholdStats = calculateQuantityThresholdStats(assignedOrders, vehicles, [1000, 1500, 2000, 2500, 3000, 4000], tomorrow);

  // Step 4: Calculate total weekly capacity
  const totalWeeklyCapacity = vehicles.reduce((total, vehicle) => {
    if (!vehicle.weeklyCapacity) return total;
    return total + Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
  }, 0);

  console.log('✅ Scheduling complete:', {
    assignedOrders: assignedOrders.length,
    totalWeeklyCapacity,
    thresholdStats: thresholdStats.length
  });

  return {
    assignedOrders,
    thresholdStats,
    totalWeeklyCapacity,
    startDate: tomorrow
  };
};

/**
 * Format delivery date for display
 * @param {Date} date - Delivery date
 * @returns {string} Formatted date string
 */
export const formatDeliveryDate = (date) => {
  if (!date) return "N/A";
  
  try {
    if (date instanceof Date) {
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return "Invalid Date";
  } catch (error) {
    return "Invalid Date";
  }
};

/**
 * Calculate days until delivery
 * @param {Date} deliveryDate - Delivery date
 * @param {Date} currentDate - Current date
 * @returns {number} Days until delivery
 */
export const calculateDaysUntilDelivery = (deliveryDate, currentDate = new Date()) => {
  if (!deliveryDate) return null;
  
  try {
    const delivery = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate);
    const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
    
    const diffTime = delivery.getTime() - current.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    return null;
  }
};

/**
 * Get delivery status based on days until delivery
 * @param {number} daysUntilDelivery - Days until delivery
 * @returns {Object} Status information
 */
export const getDeliveryStatus = (daysUntilDelivery) => {
  if (daysUntilDelivery === null || daysUntilDelivery === undefined) {
    return {
      status: 'unknown',
      color: 'gray',
      text: 'Unknown'
    };
  }
  
  if (daysUntilDelivery <= 0) {
    return {
      status: 'overdue',
      color: 'red',
      text: 'Overdue'
    };
  } else if (daysUntilDelivery <= 1) {
    return {
      status: 'urgent',
      color: 'orange',
      text: 'Tomorrow'
    };
  } else if (daysUntilDelivery <= 3) {
    return {
      status: 'soon',
      color: 'yellow',
      text: 'Soon'
    };
  } else if (daysUntilDelivery <= 7) {
    return {
      status: 'normal',
      color: 'green',
      text: 'This Week'
    };
  } else {
    return {
      status: 'future',
      color: 'blue',
      text: 'Future'
    };
  }
};

/**
 * Get color classes for UI components
 * @param {string} color - Color identifier
 * @returns {Object} Color classes
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
