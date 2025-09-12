/**
 * Delivery Date Calculator
 * Calculates estimated delivery dates for orders based on vehicle capacity and current workload
 */

/**
 * Calculate the next available delivery date for a vehicle
 * @param {Object} vehicle - Vehicle object with weeklyCapacity
 * @param {Date} currentDate - Starting date for calculation
 * @param {number} requiredCapacity - Required capacity for the order
 * @returns {Object} { deliveryDate, vehicleNo, vehicleType }
 */
export const calculateNextDeliveryDate = (vehicle, currentDate = new Date(), requiredCapacity = 1) => {
  if (!vehicle.weeklyCapacity) {
    return null;
  }

  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Find the current day of week (0 = Sunday, 1 = Monday, etc.)
  let currentDayIndex = currentDate.getDay();
  
  // Convert to our week format (Thu = 0, Fri = 1, etc.)
  let weekDayIndex = (currentDayIndex + 4) % 7; // Thursday is day 0 in our system
  
  // Start checking from today
  for (let weekOffset = 0; weekOffset < 8; weekOffset++) { // Check up to 8 weeks ahead
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDayIndex = (weekDayIndex + dayOffset) % 7;
      const dayName = days[checkDayIndex];
      const capacity = vehicle.weeklyCapacity[dayName] || 0;
      
      if (capacity >= requiredCapacity) {
        // Calculate the actual date
        const targetDate = new Date(currentDate);
        const daysToAdd = (weekOffset * 7) + dayOffset;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        
        return {
          deliveryDate: targetDate,
          vehicleNo: vehicle.vehicleNo,
          vehicleType: vehicle.type,
          availableCapacity: capacity,
          dayOfWeek: dayNames[checkDayIndex]
        };
      }
    }
  }
  
  // If no capacity found, return a date 8 weeks from now
  const fallbackDate = new Date(currentDate);
  fallbackDate.setDate(fallbackDate.getDate() + 56);
  return {
    deliveryDate: fallbackDate,
    vehicleNo: vehicle.vehicleNo,
    vehicleType: vehicle.type,
    availableCapacity: 0,
    dayOfWeek: 'Unknown'
  };
};

/**
 * Find the best vehicle for an order based on capacity and current workload
 * @param {number} productQuant - Required quantity for the order
 * @param {Array} vehicles - Array of active vehicles
 * @param {Array} existingOrders - Array of existing orders with estimated delivery dates
 * @returns {Object} Best vehicle for the order
 */
export const findBestVehicle = (productQuant, vehicles, existingOrders = []) => {
  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  // Filter vehicles that can handle the quantity
  const suitableVehicles = vehicles.filter(vehicle => 
    vehicle.vehicleQuantity && parseInt(vehicle.vehicleQuantity) >= productQuant
  );
  
  if (suitableVehicles.length === 0) {
    // If no vehicle can handle the quantity, use the largest capacity vehicle
    const sortedVehicles = vehicles.sort((a, b) => 
      (parseInt(b.vehicleQuantity) || 0) - (parseInt(a.vehicleQuantity) || 0)
    );
    return sortedVehicles[0] || vehicles[0];
  }

  // Calculate workload for each suitable vehicle
  const vehicleWorkload = {};
  suitableVehicles.forEach(vehicle => {
    vehicleWorkload[vehicle.id] = {
      vehicle,
      totalQuantity: 0,
      orderCount: 0,
      nextAvailableDate: new Date()
    };
  });

  // Calculate current workload for each vehicle
  existingOrders.forEach(order => {
    if (order.assignedVehicle && vehicleWorkload[order.assignedVehicle]) {
      vehicleWorkload[order.assignedVehicle].totalQuantity += order.productQuant || 0;
      vehicleWorkload[order.assignedVehicle].orderCount += 1;
    }
  });

  // Find the vehicle with the least workload
  let bestVehicle = null;
  let minWorkload = Infinity;

  Object.values(vehicleWorkload).forEach(workload => {
    const totalWorkload = workload.totalQuantity + productQuant;
    if (totalWorkload < minWorkload) {
      minWorkload = totalWorkload;
      bestVehicle = workload.vehicle;
    }
  });

  return bestVehicle || suitableVehicles[0];
};

/**
 * Calculate estimated delivery dates for all orders
 * @param {Array} orders - Array of orders from DEF_ORDERS
 * @param {Array} vehicles - Array of active vehicles
 * @returns {Array} Orders with estimated delivery dates
 */
export const calculateOrderDeliveryDates = (orders, vehicles) => {
  if (!orders || !vehicles || orders.length === 0 || vehicles.length === 0) {
    return orders.map(order => ({
      ...order,
      estimatedDeliveryDate: null,
      assignedVehicle: null,
      vehicleNo: null,
      vehicleType: null
    }));
  }

  const processedOrders = [];
  const currentDate = new Date();

  // Process each order
  orders.forEach(order => {
    const orderCount = order.orderCount || 1;
    const productQuant = order.productQuant || 0;
    
    // For orders with multiple counts, process each one
    for (let i = 0; i < orderCount; i++) {
      const orderCopy = { ...order };
      
      // Find the best vehicle for this order
      const bestVehicle = findBestVehicle(productQuant, vehicles, processedOrders);
      
      if (bestVehicle) {
        // Calculate delivery date for this vehicle
        const deliveryInfo = calculateNextDeliveryDate(bestVehicle, currentDate, productQuant);
        
        if (deliveryInfo) {
          orderCopy.estimatedDeliveryDate = deliveryInfo.deliveryDate;
          orderCopy.assignedVehicle = bestVehicle.id;
          orderCopy.vehicleNo = deliveryInfo.vehicleNo;
          orderCopy.vehicleType = deliveryInfo.vehicleType;
          orderCopy.availableCapacity = deliveryInfo.availableCapacity;
          orderCopy.dayOfWeek = deliveryInfo.dayOfWeek;
        } else {
          orderCopy.estimatedDeliveryDate = null;
          orderCopy.assignedVehicle = null;
          orderCopy.vehicleNo = null;
          orderCopy.vehicleType = null;
        }
      } else {
        orderCopy.estimatedDeliveryDate = null;
        orderCopy.assignedVehicle = null;
        orderCopy.vehicleNo = null;
        orderCopy.vehicleType = null;
      }
      
      processedOrders.push(orderCopy);
    }
  });

  return processedOrders;
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
      text: 'Today/Tomorrow'
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

