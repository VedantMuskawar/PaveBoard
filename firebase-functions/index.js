const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Helper function to calculate the next available delivery date
function calculateNextDeliveryDate(vehicleId, weeklyCapacity, currentDate = new Date()) {
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Find the current day of week (0 = Sunday, 1 = Monday, etc.)
  let currentDayIndex = currentDate.getDay();
  
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
        const targetDate = new Date(currentDate);
        const daysToAdd = (weekOffset * 7) + dayOffset;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        
        return admin.firestore.Timestamp.fromDate(targetDate);
      }
    }
  }
  
  // If no capacity found, return a date 4 weeks from now
  const fallbackDate = new Date(currentDate);
  fallbackDate.setDate(fallbackDate.getDate() + 28);
  return admin.firestore.Timestamp.fromDate(fallbackDate);
}

// Helper function to find the best vehicle for an order
async function findBestVehicle(productQuant, orgID) {
  try {
    // Get all active vehicles for the organization
    const vehiclesSnapshot = await db.collection('VEHICLES')
      .where('orgID', '==', orgID)
      .where('status', '==', 'Active')
      .get();
    
    if (vehiclesSnapshot.empty) {
      throw new Error('No active vehicles found for organization');
    }
    
    const vehicles = [];
    vehiclesSnapshot.forEach(doc => {
      vehicles.push({ id: doc.id, ...doc.data() });
    });
    
    // Filter vehicles that can handle the quantity
    const suitableVehicles = vehicles.filter(vehicle => 
      vehicle.vehicleQuantity >= productQuant
    );
    
    if (suitableVehicles.length === 0) {
      throw new Error('No vehicles can handle the required quantity');
    }
    
    // For now, use round-robin selection
    // In a more sophisticated system, you might consider:
    // - Current workload
    // - Distance to delivery location
    // - Vehicle efficiency
    // - Driver availability
    
    // Simple round-robin: get a random vehicle from suitable ones
    const randomIndex = Math.floor(Math.random() * suitableVehicles.length);
    return suitableVehicles[randomIndex];
    
  } catch (error) {
    console.error('Error finding best vehicle:', error);
    throw error;
  }
}

// Process order into pending simulation
async function processOrderToSimulation(orderData, orgID) {
  try {
    const { orderCount, productQuant, clientName, productName, regionName } = orderData;
    
    if (orderCount <= 0) {
      console.log('Order count is 0 or negative, skipping processing');
      return;
    }
    
    // Find the best vehicle for this order
    const vehicle = await findBestVehicle(productQuant, orgID);
    
    // Calculate delivery date
    const simulatedDeliveryDate = calculateNextDeliveryDate(
      vehicle.id, 
      vehicle.weeklyCapacity
    );
    
    // Create simulation document
    const simulationData = {
      orderID: orderData.id || orderData.dmNumber, // Use order ID or DM number as reference
      clientName: clientName || 'Unknown Client',
      productName: productName || 'Unknown Product',
      productQuant: productQuant || 0,
      regionName: regionName || 'Unknown Region',
      assignedVehicle: vehicle.id,
      vehicleNo: vehicle.vehicleNo,
      vehicleType: vehicle.type,
      simulatedDeliveryDate: simulatedDeliveryDate,
      createdAt: orderData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      simulationRunAt: admin.firestore.FieldValue.serverTimestamp(),
      orgID: orgID,
      status: 'Pending'
    };
    
    // Add to PENDING_SIMULATION collection
    await db.collection('PENDING_SIMULATION').add(simulationData);
    
    console.log(`Order processed to simulation: ${simulationData.orderID}`);
    
  } catch (error) {
    console.error('Error processing order to simulation:', error);
    throw error;
  }
}

// Cloud Function: Process orders when created or updated
exports.processOrders = functions.firestore
  .document('DEF_ORDERS/{orderId}')
  .onWrite(async (change, context) => {
    const orderId = context.params.orderId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    
    try {
      // Handle order creation
      if (!before && after) {
        console.log(`New order created: ${orderId}`);
        
        if (after.orderCount > 0) {
          await processOrderToSimulation(after, after.orgID);
        }
      }
      
      // Handle order updates
      else if (before && after) {
        console.log(`Order updated: ${orderId}`);
        
        const beforeOrderCount = before.orderCount || 0;
        const afterOrderCount = after.orderCount || 0;
        
        // If order count increased, process new orders
        if (afterOrderCount > beforeOrderCount) {
          const additionalOrders = afterOrderCount - beforeOrderCount;
          for (let i = 0; i < additionalOrders; i++) {
            await processOrderToSimulation(after, after.orgID);
          }
        }
        
        // If order count decreased to 0, remove from simulation
        else if (afterOrderCount === 0 && beforeOrderCount > 0) {
          console.log(`Order count is now 0, removing from simulation: ${orderId}`);
          
          // Delete related simulation documents
          const simulationQuery = await db.collection('PENDING_SIMULATION')
            .where('orderID', '==', orderId)
            .get();
          
          const batch = db.batch();
          simulationQuery.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }
      
      // Handle order deletion
      else if (before && !after) {
        console.log(`Order deleted: ${orderId}`);
        
        // Remove related simulation documents
        const simulationQuery = await db.collection('PENDING_SIMULATION')
          .where('orderID', '==', orderId)
          .get();
        
        const batch = db.batch();
        simulationQuery.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
    } catch (error) {
      console.error(`Error processing order ${orderId}:`, error);
      // In production, you might want to send notifications or retry logic here
    }
  });

// Cloud Function: Update vehicle capacity (optional utility function)
exports.updateVehicleCapacity = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { vehicleId, weeklyCapacity, orgID } = data;
  
  if (!vehicleId || !weeklyCapacity || !orgID) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }
  
  try {
    // Verify the user has access to this organization
    // This would require additional user-organization relationship checks
    
    await db.collection('VEHICLES').doc(vehicleId).update({
      weeklyCapacity: weeklyCapacity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'Vehicle capacity updated successfully' };
    
  } catch (error) {
    console.error('Error updating vehicle capacity:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update vehicle capacity');
  }
});

// Cloud Function: Get simulation statistics (optional utility function)
exports.getSimulationStats = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { orgID } = data;
  
  if (!orgID) {
    throw new functions.https.HttpsError('invalid-argument', 'Organization ID is required');
  }
  
  try {
    // Get pending orders count
    const pendingSnapshot = await db.collection('PENDING_SIMULATION')
      .where('orgID', '==', orgID)
      .get();
    
    // Get vehicle utilization
    const vehiclesSnapshot = await db.collection('VEHICLES')
      .where('orgID', '==', orgID)
      .where('status', '==', 'Active')
      .get();
    
    const stats = {
      totalPendingOrders: pendingSnapshot.size,
      activeVehicles: vehiclesSnapshot.size,
      vehicleUtilization: {}
    };
    
    // Calculate per-vehicle utilization
    vehiclesSnapshot.forEach(doc => {
      const vehicle = doc.data();
      const vehiclePendingOrders = pendingSnapshot.docs.filter(
        simDoc => simDoc.data().assignedVehicle === doc.id
      );
      
      stats.vehicleUtilization[vehicle.vehicleNo] = {
        pendingOrders: vehiclePendingOrders.length,
        totalCapacity: Object.values(vehicle.weeklyCapacity || {}).reduce((sum, cap) => sum + cap, 0)
      };
    });
    
    return stats;
    
  } catch (error) {
    console.error('Error getting simulation stats:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get simulation statistics');
  }
});

// Cloud Function: Calculate Production Attendance
exports.calculateProductionAttendance = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { orgID, month, employeeIds } = data;
  
  if (!orgID || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'Organization ID and month are required');
  }
  
  try {
    console.log(`Starting Production attendance calculation for org: ${orgID}, month: ${month}`);
    
    // Parse month (format: YYYY-MM)
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get production employees if not specified
    let targetEmployees = [];
    if (employeeIds && employeeIds.length > 0) {
      // Use specific employee IDs
      for (const empId of employeeIds) {
        const empDoc = await db.collection('employees').doc(empId).get();
        if (empDoc.exists) {
          const empData = empDoc.data();
          if (empData.employeeTags && empData.employeeTags.includes('production')) {
            targetEmployees.push({ id: empId, ...empData });
          }
        }
      }
    } else {
      // Get all production employees for the organization
      const employeesSnapshot = await db.collection('employees')
        .where('orgID', '==', orgID)
        .where('isActive', '==', true)
        .get();
      
      employeesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.employeeTags && data.employeeTags.includes('production')) {
          targetEmployees.push({ id: doc.id, ...data });
        }
      });
    }
    
    console.log(`Found ${targetEmployees.length} production employees to process`);
    
    const results = {
      processed: 0,
      errors: [],
      success: []
    };
    
    // Process each employee
    for (const employee of targetEmployees) {
      try {
        console.log(`Processing employee: ${employee.name} (${employee.labourID})`);
        
        // Query WAGES_ENTRIES for this employee in the specified month
        const wagesSnapshot = await db.collection('WAGES_ENTRIES')
          .where('orgID', '==', orgID)
          .where('employeeId', '==', employee.id)
          .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
          .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
          .get();
        
        // Create attendance data object
        const attendanceData = {};
        const daysInMonth = endDate.getDate();
        
        // Initialize all days as false (absent)
        for (let day = 1; day <= daysInMonth; day++) {
          attendanceData[day.toString()] = false;
        }
        
        // Mark days as present if wage entry exists
        wagesSnapshot.forEach(doc => {
          const wageData = doc.data();
          const wageDate = wageData.date.toDate();
          const dayKey = wageDate.getDate().toString();
          attendanceData[dayKey] = true;
        });
        
        // Calculate summary
        const presentDays = Object.values(attendanceData).filter(Boolean).length;
        const percentage = Math.round((presentDays / daysInMonth) * 100);
        
        // Create attendance document
        const attendanceDocId = `att_${employee.id}_${year}_${monthNum}`;
        const attendanceData_doc = {
          orgID: orgID,
          employeeId: employee.id,
          employeeName: employee.name,
          labourID: employee.labourID,
          month: month,
          year: parseInt(year),
          employeeType: 'production',
          attendanceData: attendanceData,
          summary: {
            totalPresent: presentDays,
            totalDays: daysInMonth,
            percentage: percentage,
            workDays: daysInMonth, // Could be enhanced to exclude weekends
            presentWorkDays: presentDays
          },
          calculationMethod: 'auto_wages',
          calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
          calculatedBy: context.auth.uid,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          sourceData: {
            wagesEntriesCount: wagesSnapshot.size
          }
        };
        
        // Store in ATTENDANCE collection
        await db.collection('ATTENDANCE').doc(attendanceDocId).set(attendanceData_doc);
        
        // Update employee summary (last 3 months)
        const employeeRef = db.collection('employees').doc(employee.id);
        await employeeRef.update({
          [`attendanceSummary.${month}`]: {
            totalPresent: presentDays,
            totalDays: daysInMonth,
            percentage: percentage,
            lastCalculated: admin.firestore.FieldValue.serverTimestamp()
          },
          lastAttendanceUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.success.push({
          employeeId: employee.id,
          employeeName: employee.name,
          labourID: employee.labourID,
          presentDays: presentDays,
          totalDays: daysInMonth,
          percentage: percentage
        });
        
        results.processed++;
        
        console.log(`✅ Processed ${employee.name}: ${presentDays}/${daysInMonth} days (${percentage}%)`);
        
      } catch (error) {
        console.error(`❌ Error processing employee ${employee.name}:`, error);
        results.errors.push({
          employeeId: employee.id,
          employeeName: employee.name,
          error: error.message
        });
      }
    }
    
    console.log(`Production attendance calculation completed. Processed: ${results.processed}, Errors: ${results.errors.length}`);
    
    return {
      success: true,
      message: `Calculated attendance for ${results.processed} production employees`,
      results: results
    };
    
  } catch (error) {
    console.error('Error calculating production attendance:', error);
    throw new functions.https.HttpsError('internal', `Failed to calculate attendance: ${error.message}`);
  }
});

// Cloud Function: Calculate Loaders Attendance
exports.calculateLoadersAttendance = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { orgID, month, employeeIds } = data;
  
  if (!orgID || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'Organization ID and month are required');
  }
  
  try {
    console.log(`Starting Loaders attendance calculation for org: ${orgID}, month: ${month}`);
    
    // Parse month (format: YYYY-MM)
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get loader employees if not specified
    let targetEmployees = [];
    if (employeeIds && employeeIds.length > 0) {
      // Use specific employee IDs
      for (const empId of employeeIds) {
        const empDoc = await db.collection('employees').doc(empId).get();
        if (empDoc.exists) {
          const empData = empDoc.data();
          if (empData.employeeTags && empData.employeeTags.includes('loader')) {
            targetEmployees.push({ id: empId, ...empData });
          }
        }
      }
    } else {
      // Get all loader employees for the organization
      const employeesSnapshot = await db.collection('employees')
        .where('orgID', '==', orgID)
        .where('isActive', '==', true)
        .get();
      
      employeesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.employeeTags && data.employeeTags.includes('loader')) {
          targetEmployees.push({ id: doc.id, ...data });
        }
      });
    }
    
    console.log(`Found ${targetEmployees.length} loader employees to process`);
    
    const results = {
      processed: 0,
      errors: [],
      success: []
    };
    
    // Process each employee
    for (const employee of targetEmployees) {
      try {
        console.log(`Processing employee: ${employee.name} (${employee.labourID})`);
        
        // Query WAGES_ENTRIES for this employee in the specified month
        // Filter by labourType: "Loader-Unloader" or similar loader categories
        const wagesSnapshot = await db.collection('WAGES_ENTRIES')
          .where('orgID', '==', orgID)
o          .where('labourID', '==', employee.labourID)
          .where('labourType', '==', 'Loader-Unloader') // Specific loader type
          .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
          .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
          .get();
        
        // Create attendance data object
        const attendanceData = {};
        const daysInMonth = endDate.getDate();
        
        // Initialize all days as false (absent)
        for (let day = 1; day <= daysInMonth; day++) {
          attendanceData[day.toString()] = false;
        }
        
        // Mark days as present if wage entry exists
        wagesSnapshot.forEach(doc => {
          const wageData = doc.data();
          const wageDate = wageData.date.toDate();
          const dayKey = wageDate.getDate().toString();
          attendanceData[dayKey] = true;
        });
        
        // Calculate summary
        const presentDays = Object.values(attendanceData).filter(Boolean).length;
        const percentage = Math.round((presentDays / daysInMonth) * 100);
        
        // Create attendance document
        const attendanceDocId = `att_${employee.id}_${year}_${monthNum}`;
        const attendanceData_doc = {
          orgID: orgID,
          employeeId: employee.id,
          employeeName: employee.name,
          labourID: employee.labourID,
          month: month,
          year: parseInt(year),
          employeeType: 'loader',
          attendanceData: attendanceData,
          summary: {
            totalPresent: presentDays,
            totalDays: daysInMonth,
            percentage: percentage,
            workDays: daysInMonth, // Could be enhanced to exclude weekends
            presentWorkDays: presentDays
          },
          calculationMethod: 'auto_wages',
          calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
          calculatedBy: context.auth.uid,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          sourceData: {
            wagesEntriesCount: wagesSnapshot.size,
            labourType: 'Loader-Unloader'
          }
        };
        
        // Store in ATTENDANCE collection
        await db.collection('ATTENDANCE').doc(attendanceDocId).set(attendanceData_doc);
        
        // Update employee summary (last 3 months)
        const employeeRef = db.collection('employees').doc(employee.id);
        await employeeRef.update({
          [`attendanceSummary.${month}`]: {
            totalPresent: presentDays,
            totalDays: daysInMonth,
            percentage: percentage,
            lastCalculated: admin.firestore.FieldValue.serverTimestamp()
          },
          lastAttendanceUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.success.push({
          employeeId: employee.id,
          employeeName: employee.name,
          labourID: employee.labourID,
          presentDays: presentDays,
          totalDays: daysInMonth,
          percentage: percentage
        });
        
        results.processed++;
        
        console.log(`✅ Processed ${employee.name}: ${presentDays}/${daysInMonth} days (${percentage}%)`);
        
      } catch (error) {
        console.error(`❌ Error processing employee ${employee.name}:`, error);
        results.errors.push({
          employeeId: employee.id,
          employeeName: employee.name,
          error: error.message
        });
      }
    }
    
    console.log(`Loaders attendance calculation completed. Processed: ${results.processed}, Errors: ${results.errors.length}`);
    
    return {
      success: true,
      message: `Calculated attendance for ${results.processed} loader employees`,
      results: results
    };
    
  } catch (error) {
    console.error('Error calculating loaders attendance:', error);
    throw new functions.https.HttpsError('internal', `Failed to calculate attendance: ${error.message}`);
  }
});
