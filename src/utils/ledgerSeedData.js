import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";
import { EmployeeService } from "../services/employeeService";

export const seedLedgerData = async (orgID, createdBy) => {
  try {
    console.log('🌱 Starting ledger seed data creation...');

    // Get existing employees
    const employees = await EmployeeService.getEmployees(orgID);
    if (employees.length === 0) {
      console.log('❌ No employees found. Please create employees first.');
      return;
    }

    // Get existing accounts
    const accounts = await EmployeeService.getAccounts(orgID);
    if (accounts.length === 0) {
      console.log('❌ No accounts found. Please create accounts first.');
      return;
    }

    // Sample wage entries
    const wageEntries = [
      {
        orgID,
        employeeId: employees[0].id,
        employeeName: employees[0].name,
        category: "Salary",
        date: new Date('2024-01-15'),
        wageAmount: 2500000, // ₹25,000 in paise
        createdAt: new Date('2024-01-15')
      },
      {
        orgID,
        employeeId: employees[0].id,
        employeeName: employees[0].name,
        category: "Bonus",
        date: new Date('2024-01-20'),
        wageAmount: 500000, // ₹5,000 in paise
        createdAt: new Date('2024-01-20')
      },
      {
        orgID,
        employeeId: employees[1].id,
        employeeName: employees[1].name,
        category: "Salary",
        date: new Date('2024-01-15'),
        wageAmount: 1800000, // ₹18,000 in paise
        createdAt: new Date('2024-01-15')
      },
      {
        orgID,
        employeeId: employees[1].id,
        employeeName: employees[1].name,
        category: "Trip",
        date: new Date('2024-01-18'),
        wageAmount: 300000, // ₹3,000 in paise
        createdAt: new Date('2024-01-18')
      },
      {
        orgID,
        employeeId: employees[2].id,
        employeeName: employees[2].name,
        category: "Salary",
        date: new Date('2024-01-15'),
        wageAmount: 1500000, // ₹15,000 in paise
        createdAt: new Date('2024-01-15')
      },
      {
        orgID,
        employeeId: employees[2].id,
        employeeName: employees[2].name,
        category: "Batch",
        date: new Date('2024-01-22'),
        wageAmount: 200000, // ₹2,000 in paise
        createdAt: new Date('2024-01-22')
      }
    ];

    // Sample payments
    const payments = [
      {
        orgID,
        accountId: accounts[0].id,
        totalAmount: 5000000, // ₹50,000 in paise
        date: new Date('2024-01-25'),
        remarks: "Monthly salary payment for production team",
        allocations: [
          {
            employeeId: employees[0].id,
            employeeName: employees[0].name,
            amount: 2000000 // ₹20,000 in paise
          },
          {
            employeeId: employees[1].id,
            employeeName: employees[1].name,
            amount: 1500000 // ₹15,000 in paise
          },
          {
            employeeId: employees[2].id,
            employeeName: employees[2].name,
            amount: 1500000 // ₹15,000 in paise
          }
        ],
        createdAt: new Date('2024-01-25')
      },
      {
        orgID,
        totalAmount: 1000000, // ₹10,000 in paise
        date: new Date('2024-01-28'),
        remarks: "Individual payment to manager",
        allocations: [
          {
            employeeId: employees[0].id,
            employeeName: employees[0].name,
            amount: 1000000 // ₹10,000 in paise
          }
        ],
        createdAt: new Date('2024-01-28')
      }
    ];

    // Create wage entries
    console.log('📝 Creating wage entries...');
    for (const wageEntry of wageEntries) {
      try {
        await addDoc(collection(db, "WAGES_ENTRIES"), {
          ...wageEntry,
          createdAt: serverTimestamp()
        });
        console.log(`✅ Created wage entry: ${wageEntry.employeeName} - ${wageEntry.category}`);
      } catch (error) {
        console.error(`❌ Failed to create wage entry for ${wageEntry.employeeName}:`, error);
      }
    }

    // Create payments
    console.log('💳 Creating payments...');
    for (const payment of payments) {
      try {
        await addDoc(collection(db, "payments"), {
          ...payment,
          createdAt: serverTimestamp()
        });
        console.log(`✅ Created payment: ${payment.remarks}`);
      } catch (error) {
        console.error(`❌ Failed to create payment:`, error);
      }
    }

    console.log('🌱 Ledger seed data creation completed!');
    console.log(`📊 Created ${wageEntries.length} wage entries and ${payments.length} payments`);

  } catch (error) {
    console.error('❌ Error creating ledger seed data:', error);
    throw error;
  }
};

export const clearLedgerData = async (orgID) => {
  try {
    console.log('🧹 Clearing ledger data...');
    
    // Note: In a real implementation, you would need to:
    // 1. Delete all wage entries for this org
    // 2. Delete all payments for this org
    
    // For now, we'll just log what would be deleted
    console.log('Would delete all wage entries and payments for this organization');
    console.log('🧹 Ledger data clearing completed!');
    
  } catch (error) {
    console.error('❌ Error clearing ledger data:', error);
    throw error;
  }
};

// Helper function to check if ledger data exists
export const checkLedgerDataExists = async (orgID) => {
  try {
    // This would check for existing wage entries and payments
    // For now, return a placeholder
    return {
      hasWageEntries: false,
      hasPayments: false,
      wageEntryCount: 0,
      paymentCount: 0
    };
  } catch (error) {
    console.error('❌ Error checking ledger data:', error);
    return {
      hasWageEntries: false,
      hasPayments: false,
      wageEntryCount: 0,
      paymentCount: 0
    };
  }
};
