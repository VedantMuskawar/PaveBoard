// Expense Management Test Script
// This script tests the key functionality of the Expense Management system

import { EmployeeService } from "../../services/employeeService";
import { db } from "../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export const testExpenseManagement = async () => {
  console.log("🧪 Starting Expense Management Tests...");
  
  const testResults = {
    employeeService: false,
    accountsService: false,
    databaseConnection: false,
    collectionsExist: false,
    errors: []
  };

  try {
    // Test 1: Database Connection
    console.log("1️⃣ Testing database connection...");
    const testQuery = query(collection(db, "EXPENSES"), where("orgID", "==", "test"));
    await getDocs(testQuery);
    testResults.databaseConnection = true;
    console.log("✅ Database connection successful");

    // Test 2: EmployeeService
    console.log("2️⃣ Testing EmployeeService...");
    try {
      const employees = await EmployeeService.getEmployees("K4Q6vPOuTcLPtlcEwdw0");
      testResults.employeeService = true;
      console.log(`✅ EmployeeService working - Found ${employees.length} employees`);
    } catch (error) {
      testResults.errors.push(`EmployeeService error: ${error.message}`);
      console.log("❌ EmployeeService failed:", error.message);
    }

    // Test 3: Accounts Service
    console.log("3️⃣ Testing Accounts Service...");
    try {
      const accounts = await EmployeeService.getAccounts("K4Q6vPOuTcLPtlcEwdw0");
      testResults.accountsService = true;
      console.log(`✅ Accounts Service working - Found ${accounts.length} accounts`);
    } catch (error) {
      testResults.errors.push(`Accounts Service error: ${error.message}`);
      console.log("❌ Accounts Service failed:", error.message);
    }

    // Test 4: Check if collections exist
    console.log("4️⃣ Testing collections existence...");
    const collections = ["EXPENSES", "employees", "employeeaccounts", "EMPLOYEE_LEDGER", "ACCOUNT_LEDGER"];
    let existingCollections = 0;
    
    for (const collectionName of collections) {
      try {
        const testQuery = query(collection(db, collectionName), where("orgID", "==", "K4Q6vPOuTcLPtlcEwdw0"));
        await getDocs(testQuery);
        existingCollections++;
        console.log(`✅ Collection ${collectionName} exists`);
      } catch (error) {
        console.log(`❌ Collection ${collectionName} error:`, error.message);
        testResults.errors.push(`Collection ${collectionName} error: ${error.message}`);
      }
    }
    
    testResults.collectionsExist = existingCollections > 0;
    console.log(`✅ ${existingCollections}/${collections.length} collections accessible`);

    // Test 5: Check delete functionality collections
    console.log("5️⃣ Testing delete functionality collections...");
    const deleteCollections = ["EMPLOYEE_LEDGER", "ACCOUNT_LEDGER"];
    let deleteCollectionsAccessible = 0;
    
    for (const collectionName of deleteCollections) {
      try {
        const testQuery = query(collection(db, collectionName), where("referenceID", "==", "test-reference"));
        await getDocs(testQuery);
        deleteCollectionsAccessible++;
        console.log(`✅ Delete collection ${collectionName} accessible`);
      } catch (error) {
        console.log(`❌ Delete collection ${collectionName} error:`, error.message);
        testResults.errors.push(`Delete collection ${collectionName} error: ${error.message}`);
      }
    }
    
    console.log(`✅ ${deleteCollectionsAccessible}/${deleteCollections.length} delete collections accessible`);

    // Test 6: Check EmployeeService methods
    console.log("6️⃣ Testing EmployeeService methods...");
    try {
      // Test formatMoney method
      const testAmount = EmployeeService.formatMoney(10000); // 10000 paise = 100 rupees
      if (testAmount === 100) {
        console.log("✅ EmployeeService.formatMoney working");
      } else {
        testResults.errors.push(`formatMoney returned ${testAmount}, expected 100`);
      }

      // Test formatMoneyToPaise method
      const testPaise = EmployeeService.formatMoneyToPaise(100); // 100 rupees = 10000 paise
      if (testPaise === 10000) {
        console.log("✅ EmployeeService.formatMoneyToPaise working");
      } else {
        testResults.errors.push(`formatMoneyToPaise returned ${testPaise}, expected 10000`);
      }
    } catch (error) {
      testResults.errors.push(`EmployeeService methods error: ${error.message}`);
    }

  } catch (error) {
    testResults.errors.push(`General test error: ${error.message}`);
    console.log("❌ General test error:", error.message);
  }

  // Summary
  console.log("\n📊 Test Results Summary:");
  console.log(`Database Connection: ${testResults.databaseConnection ? "✅" : "❌"}`);
  console.log(`EmployeeService: ${testResults.employeeService ? "✅" : "❌"}`);
  console.log(`Accounts Service: ${testResults.accountsService ? "✅" : "❌"}`);
  console.log(`Collections Exist: ${testResults.collectionsExist ? "✅" : "❌"}`);
  
  if (testResults.errors.length > 0) {
    console.log("\n❌ Errors found:");
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log("\n🎉 All tests passed! Expense Management should be working.");
  }

  return testResults;
};

// Auto-run test when imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  testExpenseManagement().then(results => {
    if (results.errors.length === 0) {
      console.log("🎉 Expense Management is ready to use!");
    } else {
      console.log("⚠️ Some issues found. Check the errors above.");
    }
  });
}
