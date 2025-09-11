/**
 * Scheduling utilities for vehicle assignment and delivery date calculation
 * This module provides reusable functions for both frontend and backend
 */

/**
 * Calculate the next available delivery date based on weekly capacity
 * @param {Object} weeklyCapacity - Object with day names as keys and capacity as values
 * @param {Date} startDate - Date to start checking from (defaults to today)
 * @returns {Date} - Next available delivery date
 */
export function calculateNextDeliveryDate(weeklyCapacity, startDate = new Date()) {
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Find the current day of week (0 = Sunday, 1 = Monday, etc.)
  let currentDayIndex = startDate.getDay();
  
  // Convert to our week format (Thu = 0, Fri = 1, etc.)
  let weekDayIndex = (currentDayIndex + 4) % 7; // Thursday is day 0 in our system
  
  // Start checking from today
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) { // Check up to 4 weeks ahead
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDayIndex = (weekDayIndex + dayOffset) % 7;
      const dayName = days[checkDayIndex];
      const capacity = weeklyCapacity[dayName] || 0;
      
      if (capacity > 0) {
        // Calculate the actual date
        const targetDate = new Date(startDate);
        const daysToAdd = (weekOffset * 7) + dayOffset;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        
        return targetDate;
      }
    }
  }
  
  // If no capacity found, return a date 4 weeks from now
  const fallbackDate = new Date(startDate);
  fallbackDate.setDate(fallbackDate.getDate() + 28);
  return fallbackDate;
}

/**
 * Find the best vehicle for an order based on capacity and availability
 * @param {Array} vehicles - Array of vehicle objects
 * @param {number} requiredQuantity - Required quantity for the order
 * @param {string} strategy - Assignment strategy ('round-robin', 'random', 'least-loaded')
 * @returns {Object|null} - Best vehicle or null if none found
 */
export function findBestVehicle(vehicles, requiredQuantity, strategy = 'round-robin') {
  // Filter vehicles that can handle the quantity and are active
  const suitableVehicles = vehicles.filter(vehicle => 
    vehicle.status === 'Active' && 
    vehicle.vehicleQuantity >= requiredQuantity
  );
  
  if (suitableVehicles.length === 0) {
    return null;
  }
  
  switch (strategy) {
    case 'random':
      // Random selection from suitable vehicles
      const randomIndex = Math.floor(Math.random() * suitableVehicles.length);
      return suitableVehicles[randomIndex];
      
    case 'least-loaded':
      // Select vehicle with least current workload
      // This would require additional data about current assignments
      // For now, fall back to round-robin
      return suitableVehicles[0];
      
    case 'round-robin':
    default:
      // Simple round-robin: select first suitable vehicle
      // In a more sophisticated system, you might track last assigned vehicle
      return suitableVehicles[0];
  }
}

/**
 * Calculate vehicle utilization statistics
 * @param {Array} vehicles - Array of vehicle objects
 * @param {Array} pendingOrders - Array of pending order objects
 * @returns {Object} - Utilization statistics
 */
export function calculateVehicleUtilization(vehicles, pendingOrders) {
  const utilization = {};
  
  vehicles.forEach(vehicle => {
    const vehicleOrders = pendingOrders.filter(order => 
      order.assignedVehicle === vehicle.id
    );
    
    const totalQuantity = vehicleOrders.reduce((sum, order) => 
      sum + (order.productQuant || 0), 0
    );
    
    const totalCapacity = Object.values(vehicle.weeklyCapacity || {}).reduce(
      (sum, cap) => sum + cap, 0
    );
    
    utilization[vehicle.id] = {
      vehicleNo: vehicle.vehicleNo,
      vehicleType: vehicle.type,
      pendingOrders: vehicleOrders.length,
      totalQuantity,
      totalCapacity,
      utilizationPercentage: totalCapacity > 0 ? (totalQuantity / totalCapacity) * 100 : 0
    };
  });
  
  return utilization;
}

/**
 * Format weekly capacity for display
 * @param {Object} weeklyCapacity - Weekly capacity object
 * @returns {string} - Formatted string representation
 */
export function formatWeeklyCapacity(weeklyCapacity) {
  if (!weeklyCapacity) return "N/A";
  
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  return days.map(day => `${day}: ${weeklyCapacity[day] || 0}`).join(', ');
}

/**
 * Get capacity for a specific day
 * @param {Object} weeklyCapacity - Weekly capacity object
 * @param {string} dayName - Day name (Thu, Fri, etc.)
 * @returns {number} - Capacity for that day
 */
export function getDayCapacity(weeklyCapacity, dayName) {
  if (!weeklyCapacity || !dayName) return 0;
  return weeklyCapacity[dayName] || 0;
}

/**
 * Check if a vehicle is available for a specific date
 * @param {Object} vehicle - Vehicle object
 * @param {Date} date - Date to check
 * @returns {boolean} - True if vehicle is available
 */
export function isVehicleAvailableOnDate(vehicle, date) {
  if (!vehicle.weeklyCapacity || !date) return false;
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getDay()];
  
  // Convert to our week format
  const dayMap = {
    'Thursday': 'Thu',
    'Friday': 'Fri', 
    'Saturday': 'Sat',
    'Sunday': 'Sun',
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed'
  };
  
  const weekDay = dayMap[dayName];
  return getDayCapacity(vehicle.weeklyCapacity, weekDay) > 0;
}

/**
 * Generate a summary of vehicle schedules
 * @param {Array} vehicles - Array of vehicle objects
 * @returns {Object} - Schedule summary
 */
export function generateScheduleSummary(vehicles) {
  const summary = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'Active').length,
    totalWeeklyCapacity: 0,
    averageDailyCapacity: 0,
    capacityByDay: {}
  };
  
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  
  // Initialize capacity by day
  days.forEach(day => {
    summary.capacityByDay[day] = 0;
  });
  
  // Calculate totals
  vehicles.forEach(vehicle => {
    if (vehicle.status === 'Active' && vehicle.weeklyCapacity) {
      days.forEach(day => {
        const dayCapacity = vehicle.weeklyCapacity[day] || 0;
        summary.capacityByDay[day] += dayCapacity;
        summary.totalWeeklyCapacity += dayCapacity;
      });
    }
  });
  
  // Calculate average daily capacity
  summary.averageDailyCapacity = summary.totalWeeklyCapacity / 7;
  
  return summary;
}

/**
 * Calculate estimated delivery times by quantity thresholds
 * @param {Array} orders - Array of order objects with productQuant
 * @param {Array} vehicles - Array of vehicle objects with weeklyCapacity
 * @param {Array} thresholds - Array of quantity thresholds (default: [1500, 2500, 3000, 4000])
 * @returns {Array} - Array of delivery time estimates by threshold
 */
export function calculateEstimatedDeliveryTimes(orders, vehicles, thresholds = [1500, 2500, 3000, 4000]) {
  // Calculate total weekly capacity from active vehicles
  const totalWeeklyCapacity = vehicles.reduce((total, vehicle) => {
    if (vehicle.status !== 'Active' || !vehicle.weeklyCapacity) return total;
    const weeklyCap = Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
    return total + weeklyCap;
  }, 0);

  if (totalWeeklyCapacity === 0) {
    return thresholds.map((threshold, index) => ({
      range: index === 0 ? `≤${threshold}` : 
             index === thresholds.length - 1 ? `>${thresholds[thresholds.length - 1]}` :
             `≤${threshold}`,
      totalQuantity: 0,
      estimatedDays: 0,
      color: "gray"
    }));
  }

  return thresholds.map((threshold, index) => {
    let totalQuantity = 0;
    
    // Calculate total quantity for this threshold range
    orders.forEach(order => {
      const quantity = order.productQuant || 0;
      const isInRange = index === 0 ? quantity <= threshold :
                       index === thresholds.length - 1 ? quantity > thresholds[thresholds.length - 1] :
                       quantity <= threshold && quantity > thresholds[index - 1];
      
      if (isInRange) {
        totalQuantity += quantity;
      }
    });

    // Calculate estimated days
    const estimatedDays = totalQuantity > 0 ? Math.ceil(totalQuantity / totalWeeklyCapacity) : 0;
    
    // Determine color based on estimated days
    let color = "gray";
    if (estimatedDays > 0) {
      if (estimatedDays < 3) color = "green";
      else if (estimatedDays <= 7) color = "orange";
      else color = "red";
    }

    return {
      range: index === 0 ? `≤${threshold}` : 
             index === thresholds.length - 1 ? `>${thresholds[thresholds.length - 1]}` :
             `≤${threshold}`,
      totalQuantity,
      estimatedDays,
      color,
      totalWeeklyCapacity
    };
  });
}

/**
 * Calculate ETA for a specific order quantity
 * @param {number} quantity - Order quantity
 * @param {Array} vehicles - Array of vehicle objects with weeklyCapacity
 * @returns {Object} - ETA calculation result
 */
export function calculateOrderETA(quantity, vehicles) {
  const totalWeeklyCapacity = vehicles.reduce((total, vehicle) => {
    if (vehicle.status !== 'Active' || !vehicle.weeklyCapacity) return total;
    const weeklyCap = Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
    return total + weeklyCap;
  }, 0);

  if (totalWeeklyCapacity === 0) {
    return {
      estimatedDays: 0,
      canFulfill: false,
      message: "No active vehicles available"
    };
  }

  const estimatedDays = Math.ceil(quantity / totalWeeklyCapacity);
  
  return {
    estimatedDays,
    canFulfill: true,
    totalWeeklyCapacity,
    message: `Estimated delivery: ${estimatedDays} day${estimatedDays === 1 ? '' : 's'}`
  };
}
