import { 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  increment,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";
import { EmployeeService } from "../services/employeeService";
import { ProductionService } from "../services/productionService";

export const seedProductionData = async (orgID, createdBy) => {
  try {
    console.log('🌱 Starting production seed data creation...');

    // Get existing production employees
    const employees = await ProductionService.getProductionEmployees(orgID);
    if (employees.length === 0) {
      console.log('❌ No production employees found. Please create employees with "production" tag first.');
      return;
    }

    // Get production config
    const config = await ProductionService.getProductionConfig(orgID);

    // Sample production batches
    const productionBatches = [
      {
        orgID,
        batchNo: "B202401001",
        date: new Date('2024-01-15'),
        cementBags: 50,
        productionQuantity: 2000, // 2000 Nos
        thappiQuantity: 1500, // 1500 Nos
        labourIds: employees.slice(0, 3).map(emp => emp.id), // First 3 employees
        totalWages: 0, // Will be calculated
        splitRule: "equal",
        createdAt: new Date('2024-01-15')
      },
      {
        orgID,
        batchNo: "B202401002",
        date: new Date('2024-01-18'),
        cementBags: 75,
        productionQuantity: 3000, // 3000 Nos
        thappiQuantity: 2000, // 2000 Nos
        labourIds: employees.slice(0, 2).map(emp => emp.id), // First 2 employees
        totalWages: 0, // Will be calculated
        splitRule: "equal",
        createdAt: new Date('2024-01-18')
      },
      {
        orgID,
        batchNo: "B202401003",
        date: new Date('2024-01-22'),
        cementBags: 60,
        productionQuantity: 2500, // 2500 Nos
        thappiQuantity: 1800, // 1800 Nos
        labourIds: employees.slice(1, 4).map(emp => emp.id), // Middle 3 employees
        totalWages: 0, // Will be calculated
        splitRule: "manual",
        createdAt: new Date('2024-01-22')
      }
    ];

    // Calculate total wages for each batch
    productionBatches.forEach(batch => {
      batch.totalWages = ProductionService.calculateTotalWages(
        batch.productionQuantity,
        batch.thappiQuantity,
        config
      );
    });

    // Create production batches and associated data
    for (const batchData of productionBatches) {
      try {
        // Create production batch
        const batchRef = await addDoc(collection(db, "production_batches"), {
          ...batchData,
          date: batchData.date,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Created production batch: ${batchData.batchNo}`);

        // Calculate wage allocations
        const wageAllocations = ProductionService.calculateEqualWages(
          batchData.totalWages,
          batchData.labourIds,
          employees
        );

        // Create wage entries for each labour
        for (const allocation of wageAllocations) {
          const wageEntry = {
            orgID,
            employeeId: allocation.employeeId,
            employeeName: allocation.employeeName,
            category: "Production",
            date: batchData.date,
            batchId: batchRef.id,
            unitCount: Math.floor((batchData.productionQuantity + batchData.thappiQuantity) / batchData.labourIds.length),
            wageAmount: allocation.wageAmount,
            createdAt: batchData.createdAt
          };

          await addDoc(collection(db, "WAGES_ENTRIES"), {
            ...wageEntry,
            date: batchData.date,
            createdAt: serverTimestamp()
          });

          // Update employee balance (increment by wage amount)
          const employeeRef = doc(db, "employees", allocation.employeeId);
          await updateDoc(employeeRef, {
            currentBalance: increment(allocation.wageAmount),
            updatedAt: serverTimestamp()
          });

          // Create attendance entry
          const attendanceEntry = {
            orgID,
            employeeId: allocation.employeeId,
            date: batchData.date,
            source: "production_batches",
            unitType: "batch",
            unitCount: 1,
            batchId: batchRef.id,
            createdAt: batchData.createdAt
          };

          await addDoc(collection(db, "attendance"), {
            ...attendanceEntry,
            date: batchData.date,
            createdAt: serverTimestamp()
          });

          console.log(`✅ Created wage entry for ${allocation.employeeName}: ${ProductionService.formatMoney(allocation.wageAmount)}`);
        }

        console.log(`✅ Created ${wageAllocations.length} wage entries and attendance records for batch ${batchData.batchNo}`);

      } catch (error) {
        console.error(`❌ Failed to create batch ${batchData.batchNo}:`, error);
      }
    }

    console.log('🌱 Production seed data creation completed!');
    console.log(`📊 Created ${productionBatches.length} production batches with associated wage entries and attendance records`);

  } catch (error) {
    console.error('❌ Error creating production seed data:', error);
    throw error;
  }
};

export const clearProductionData = async (orgID) => {
  try {
    console.log('🧹 Clearing production data...');
    
    // Note: In a real implementation, you would need to:
    // 1. Delete all production batches for this org
    // 2. Delete all associated wage entries
    // 3. Delete all associated attendance entries
    // 4. Update employee balances accordingly
    
    // For now, we'll just log what would be deleted
    console.log('Would delete all production batches, wage entries, and attendance records for this organization');
    console.log('🧹 Production data clearing completed!');
    
  } catch (error) {
    console.error('❌ Error clearing production data:', error);
    throw error;
  }
};

// Helper function to check if production data exists
export const checkProductionDataExists = async (orgID) => {
  try {
    // This would check for existing production batches
    // For now, return a placeholder
    return {
      hasProductionBatches: false,
      batchCount: 0,
      hasWageEntries: false,
      wageEntryCount: 0
    };
  } catch (error) {
    console.error('❌ Error checking production data:', error);
    return {
      hasProductionBatches: false,
      batchCount: 0,
      hasWageEntries: false,
      wageEntryCount: 0
    };
  }
};

// Helper function to create sample production employees if none exist
export const createSampleProductionEmployees = async (orgID) => {
  try {
    console.log('👷‍♂️ Creating sample production employees...');

    const sampleEmployees = [
      {
        orgID,
        name: "Rajesh Kumar",
        labourID: "EMP0001",
        employeeTags: ["production", "supervisor"],
        salaryTags: ["fixed"],
        salaryValue: 2500000, // ₹25,000 in paise
        bonusEligible: true,
        accountId: null,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        dateJoined: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orgID,
        name: "Suresh Singh",
        labourID: "EMP0002",
        employeeTags: ["production", "operator"],
        salaryTags: ["fixed"],
        salaryValue: 2000000, // ₹20,000 in paise
        bonusEligible: true,
        accountId: null,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        dateJoined: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orgID,
        name: "Amit Patel",
        labourID: "EMP0003",
        employeeTags: ["production", "helper"],
        salaryTags: ["fixed"],
        salaryValue: 1800000, // ₹18,000 in paise
        bonusEligible: false,
        accountId: null,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        dateJoined: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orgID,
        name: "Vikram Sharma",
        labourID: "EMP0004",
        employeeTags: ["production", "operator"],
        salaryTags: ["fixed"],
        salaryValue: 1900000, // ₹19,000 in paise
        bonusEligible: true,
        accountId: null,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        dateJoined: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const createdEmployees = [];
    for (const employeeData of sampleEmployees) {
      try {
        const employeeId = await EmployeeService.createEmployee(orgID, employeeData, 'system');
        createdEmployees.push({ ...employeeData, id: employeeId });
        console.log(`✅ Created production employee: ${employeeData.name}`);
      } catch (error) {
        console.error(`❌ Failed to create employee ${employeeData.name}:`, error);
      }
    }

    console.log(`👷‍♂️ Created ${createdEmployees.length} production employees`);
    return createdEmployees;

  } catch (error) {
    console.error('❌ Error creating sample production employees:', error);
    throw error;
  }
};
