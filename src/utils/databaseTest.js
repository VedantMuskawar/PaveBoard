// Database connection test utility
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';

export const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing Firebase database connection...');
    
    // Test reading from VEHICLE_VOUCHERS collection
    const vouchersRef = collection(db, 'VEHICLE_VOUCHERS');
    const vouchersSnapshot = await getDocs(vouchersRef);
    console.log(`✅ VEHICLE_VOUCHERS collection accessible. Found ${vouchersSnapshot.docs.length} documents.`);
    
    // Test reading from VEHICLES collection
    const vehiclesRef = collection(db, 'VEHICLES');
    const vehiclesSnapshot = await getDocs(vehiclesRef);
    console.log(`✅ VEHICLES collection accessible. Found ${vehiclesSnapshot.docs.length} documents.`);
    
    // Test reading from EXPENSE collection
    const expenseRef = collection(db, 'EXPENSE');
    const expenseSnapshot = await getDocs(expenseRef);
    console.log(`✅ EXPENSE collection accessible. Found ${expenseSnapshot.docs.length} documents.`);
    
    // Test reading from DELIVERY_MEMOS collection (used by OrdersDashboard)
    const deliveryRef = collection(db, 'DELIVERY_MEMOS');
    const deliverySnapshot = await getDocs(deliveryRef);
    console.log(`✅ DELIVERY_MEMOS collection accessible. Found ${deliverySnapshot.docs.length} documents.`);
    
    console.log('🎉 All database collections are accessible!');
    return true;
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

export const createTestData = async (orgID = 'test-org-123') => {
  try {
    console.log('📝 Creating test data...');
    
    // Create a test vehicle voucher
    const testVoucher = {
      voucherNo: 1001,
      date: new Date(),
      vehicleNo: 'TEST-001',
      amount: 5000,
      paid: false,
      verified: false,
      orgID: orgID,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const voucherRef = await addDoc(collection(db, 'VEHICLE_VOUCHERS'), testVoucher);
    console.log(`✅ Test voucher created with ID: ${voucherRef.id}`);
    
    // Create a test vehicle
    const testVehicle = {
      vehicleNumber: 'TEST-001',
      status: 'Active',
      orgID: orgID,
      createdAt: new Date()
    };
    
    const vehicleRef = await addDoc(collection(db, 'VEHICLES'), testVehicle);
    console.log(`✅ Test vehicle created with ID: ${vehicleRef.id}`);
    
    console.log('🎉 Test data created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create test data:', error);
    return false;
  }
};

export const clearTestData = async (orgID = 'test-org-123') => {
  try {
    console.log('🧹 Clearing test data...');
    
    // Note: In a real implementation, you'd want to delete specific test documents
    // For now, we'll just log what would be deleted
    console.log(`Would delete test data for orgID: ${orgID}`);
    console.log('✅ Test data clearing completed (simulated)');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    return false;
  }
};
