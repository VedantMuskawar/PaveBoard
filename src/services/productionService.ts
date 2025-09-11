import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  increment
} from "firebase/firestore";
import { db } from "../config/firebase";
import { EmployeeService } from "./employeeService";
import { 
  ProductionBatch, 
  ProductionWageEntry, 
  ProductionConfig, 
  WageAllocation, 
  ProductionBatchFormData,
  ProductionBatchWithDetails
} from "../types/production";

export class ProductionService {
  // Default configuration - can be overridden by admin settings
  private static readonly DEFAULT_CONFIG: ProductionConfig = {
    productionWage: 23000, // ₹230 per 1000 Nos (in paise)
    thappiWage: 12000, // ₹120 per 1000 Nos (in paise)
  };

  // Get production configuration (from config collection or defaults)
  static async getProductionConfig(orgID: string): Promise<ProductionConfig> {
    try {
      // In a real implementation, this would fetch from a config collection
      // For now, return default values
      return this.DEFAULT_CONFIG;
    } catch (error) {
      console.error("Error fetching production config:", error);
      return this.DEFAULT_CONFIG;
    }
  }

  // Calculate total wages based on production quantities
  static calculateTotalWages(
    productionQuantity: number,
    thappiQuantity: number,
    config: ProductionConfig
  ): number {
    const productionWages = (productionQuantity * config.productionWage) / 1000;
    const thappiWages = (thappiQuantity * config.thappiWage) / 1000;
    return Math.round(productionWages + thappiWages);
  }

  // Calculate equal wage distribution
  static calculateEqualWages(
    totalWages: number,
    labourIds: string[],
    employees: any[]
  ): WageAllocation[] {
    if (labourIds.length === 0) return [];

    const wagePerLabour = Math.floor(totalWages / labourIds.length);
    const remainder = totalWages - (wagePerLabour * labourIds.length);

    return labourIds.map((employeeId, index) => {
      const employee = employees.find(emp => emp.id === employeeId);
      const wageAmount = wagePerLabour + (index < remainder ? 1 : 0);
      
      return {
        employeeId,
        employeeName: employee?.name || "Unknown",
        unitCount: 0, // Will be calculated based on production split
        wageAmount,
        isManual: false
      };
    });
  }

  // Redistribute wages when one is manually adjusted
  static redistributeWages(
    allocations: WageAllocation[],
    modifiedIndex: number,
    newAmount: number
  ): WageAllocation[] {
    const totalWages = allocations.reduce((sum, alloc) => sum + alloc.wageAmount, 0);
    const otherAllocations = allocations.filter((_, index) => index !== modifiedIndex);
    const remainingWages = totalWages - newAmount;
    
    if (otherAllocations.length === 0) return allocations;

    // Distribute remaining wages equally among other allocations
    const wagePerOther = Math.floor(remainingWages / otherAllocations.length);
    const remainder = remainingWages - (wagePerOther * otherAllocations.length);

    return allocations.map((allocation, index) => {
      if (index === modifiedIndex) {
        return { ...allocation, wageAmount: newAmount, isManual: true };
      }
      
      const otherIndex = otherAllocations.findIndex(alloc => alloc.employeeId === allocation.employeeId);
      const wageAmount = wagePerOther + (otherIndex < remainder ? 1 : 0);
      
      return { ...allocation, wageAmount, isManual: false };
    });
  }

  // Create production batch with wage entries
  static async createProductionBatch(
    orgID: string,
    formData: ProductionBatchFormData,
    createdBy: string
  ): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      // Get production config
      const config = await this.getProductionConfig(orgID);
      
      // Calculate total wages
      const totalWages = this.calculateTotalWages(
        formData.productionQuantity,
        formData.thappiQuantity,
        config
      );

      // Get employees for wage allocation
      const employees = await EmployeeService.getEmployees(orgID);
      const selectedEmployees = employees.filter(emp => 
        formData.labourIds.includes(emp.id) && emp.isActive
      );

      // Create production batch document
      const batchRef = doc(collection(db, "production_batches"));
      const batchData: Omit<ProductionBatch, "id"> = {
        orgID,
        batchNo: formData.batchNo,
        date: formData.date,
        cementBags: formData.cementBags,
        productionQuantity: formData.productionQuantity,
        thappiQuantity: formData.thappiQuantity,
        labourIds: formData.labourIds,
        totalWages,
        splitRule: formData.splitRule,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      batch.set(batchRef, {
        ...batchData,
        date: Timestamp.fromDate(formData.date),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create wage entries for each labour
      for (const allocation of formData.wageAllocations) {
        const wageEntryRef = doc(collection(db, "WAGES_ENTRIES"));
        const wageEntry: Omit<ProductionWageEntry, "id"> = {
          orgID,
          employeeId: allocation.employeeId,
          employeeName: allocation.employeeName,
          category: "Production",
          date: formData.date,
          batchId: batchRef.id,
          unitCount: allocation.unitCount,
          wageAmount: allocation.wageAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        batch.set(wageEntryRef, {
          ...wageEntry,
          date: Timestamp.fromDate(formData.date),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update employee balance (increment by wage amount)
        const employeeRef = doc(db, "employees", allocation.employeeId);
        batch.update(employeeRef, {
          currentBalance: increment(allocation.wageAmount),
          updatedAt: serverTimestamp()
        });

        // Update account balance if employee has an account
        const employee = selectedEmployees.find(emp => emp.id === allocation.employeeId);
        if (employee?.accountId) {
          const accountRef = doc(db, "employeeaccounts", employee.accountId);
          batch.update(accountRef, {
            currentBalance: increment(allocation.wageAmount),
            updatedAt: serverTimestamp()
          });
        }

      }

      // Commit all operations
      await batch.commit();
      
      console.log("✅ Production batch created successfully:", batchRef.id);
      return batchRef.id;

    } catch (error) {
      console.error("❌ Error creating production batch:", error);
      throw new Error("Failed to create production batch");
    }
  }

  // Get all production batches
  static async getProductionBatches(orgID: string): Promise<ProductionBatchWithDetails[]> {
    try {
      if (!orgID) {
        throw new Error("Organization ID is required");
      }

      const batchesQuery = query(
        collection(db, "production_batches"),
        where("orgID", "==", orgID)
      );

      const batchesSnapshot = await getDocs(batchesQuery);
      const batches: ProductionBatch[] = [];

      batchesSnapshot.forEach((doc) => {
        const data = doc.data();
        batches.push({
          id: doc.id,
          orgID: data.orgID,
          batchNo: data.batchNo,
          date: data.date?.toDate() || new Date(),
          cementBags: data.cementBags || 0,
          productionQuantity: data.productionQuantity || 0,
          thappiQuantity: data.thappiQuantity || 0,
          labourIds: data.labourIds || [],
          totalWages: data.totalWages || 0,
          splitRule: data.splitRule || "equal",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by date (newest first)
      batches.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Get detailed information for each batch
      const batchesWithDetails: ProductionBatchWithDetails[] = [];
      
      for (const batch of batches) {
        // Get wage entries for this batch
        const wagesQuery = query(
          collection(db, "WAGES_ENTRIES"),
          where("orgID", "==", orgID),
          where("batchId", "==", batch.id)
        );
        
        const wagesSnapshot = await getDocs(wagesQuery);
        const labourDetails = wagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.employeeId,
            name: data.employeeName,
            wageAmount: data.wageAmount || 0,
            unitCount: data.unitCount || 0
          };
        });

        batchesWithDetails.push({
          ...batch,
          labourDetails,
          totalProduction: batch.productionQuantity,
          totalThappi: batch.thappiQuantity
        });
      }

      return batchesWithDetails;

    } catch (error) {
      console.error("❌ Error fetching production batches:", error);
      throw new Error("Failed to fetch production batches");
    }
  }

  // Get production batch by ID
  static async getProductionBatch(orgID: string, batchId: string): Promise<ProductionBatchWithDetails | null> {
    try {
      const batchDoc = await getDoc(doc(db, "production_batches", batchId));
      
      if (!batchDoc.exists()) {
        return null;
      }

      const data = batchDoc.data();
      const batch: ProductionBatch = {
        id: batchDoc.id,
        orgID: data.orgID,
        batchNo: data.batchNo,
        date: data.date?.toDate() || new Date(),
        cementBags: data.cementBags || 0,
        productionQuantity: data.productionQuantity || 0,
        thappiQuantity: data.thappiQuantity || 0,
        labourIds: data.labourIds || [],
        totalWages: data.totalWages || 0,
        splitRule: data.splitRule || "equal",
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };

      // Get labour details
      const wagesQuery = query(
        collection(db, "WAGES_ENTRIES"),
        where("orgID", "==", orgID),
        where("batchId", "==", batchId)
      );
      
      const wagesSnapshot = await getDocs(wagesQuery);
      const labourDetails = wagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.employeeId,
          name: data.employeeName,
          wageAmount: data.wageAmount || 0,
          unitCount: data.unitCount || 0
        };
      });

      return {
        ...batch,
        labourDetails,
        totalProduction: batch.productionQuantity,
        totalThappi: batch.thappiQuantity
      };

    } catch (error) {
      console.error("❌ Error fetching production batch:", error);
      throw new Error("Failed to fetch production batch");
    }
  }

  // Update production batch
  static async updateProductionBatch(
    orgID: string,
    batchId: string,
    formData: ProductionBatchFormData,
    updatedBy: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get production config
      const config = await this.getProductionConfig(orgID);
      
      // Calculate total wages
      const totalWages = this.calculateTotalWages(
        formData.productionQuantity,
        formData.thappiQuantity,
        config
      );

      // Get existing wage entries to revert balances
      const wagesQuery = query(
        collection(db, "WAGES_ENTRIES"),
        where("orgID", "==", orgID),
        where("batchId", "==", batchId)
      );
      
      const wagesSnapshot = await getDocs(wagesQuery);
      const existingWageEntries = wagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get employees to check for account relationships
      const employees = await EmployeeService.getEmployees(orgID);
      const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

      // Revert existing employee and account balances
      for (const wageEntry of existingWageEntries) {
        const wageAmount = wageEntry.wageAmount || 0;
        
        // Revert employee balance (subtract the old wage amount)
        const employeeRef = doc(db, "employees", wageEntry.employeeId);
        batch.update(employeeRef, {
          currentBalance: increment(-wageAmount),
          updatedAt: serverTimestamp()
        });

        // Revert account balance if employee has an account
        const employee = employeeMap.get(wageEntry.employeeId);
        if (employee?.accountId) {
          const accountRef = doc(db, "employeeaccounts", employee.accountId);
          batch.update(accountRef, {
            currentBalance: increment(-wageAmount),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Update production batch
      const batchRef = doc(db, "production_batches", batchId);
      batch.update(batchRef, {
        batchNo: formData.batchNo,
        date: Timestamp.fromDate(formData.date),
        cementBags: formData.cementBags,
        productionQuantity: formData.productionQuantity,
        thappiQuantity: formData.thappiQuantity,
        labourIds: formData.labourIds,
        totalWages,
        splitRule: formData.splitRule,
        updatedAt: serverTimestamp()
      });

      // Delete existing wage entries
      wagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Create new wage entries and update balances
      for (const allocation of formData.wageAllocations) {
        const wageEntryRef = doc(collection(db, "WAGES_ENTRIES"));
        const wageEntry: Omit<ProductionWageEntry, "id"> = {
          orgID,
          employeeId: allocation.employeeId,
          employeeName: allocation.employeeName,
          category: "Production",
          date: formData.date,
          batchId: batchId,
          unitCount: allocation.unitCount,
          wageAmount: allocation.wageAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        batch.set(wageEntryRef, {
          ...wageEntry,
          date: Timestamp.fromDate(formData.date),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update employee balance (add the new wage amount)
        const employeeRef = doc(db, "employees", allocation.employeeId);
        batch.update(employeeRef, {
          currentBalance: increment(allocation.wageAmount),
          updatedAt: serverTimestamp()
        });

        // Update account balance if employee has an account
        const employee = employeeMap.get(allocation.employeeId);
        if (employee?.accountId) {
          const accountRef = doc(db, "employeeaccounts", employee.accountId);
          batch.update(accountRef, {
            currentBalance: increment(allocation.wageAmount),
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      console.log("✅ Production batch updated successfully with balance reversion:", batchId);

    } catch (error) {
      console.error("❌ Error updating production batch:", error);
      throw new Error("Failed to update production batch");
    }
  }

  // Delete production batch
  static async deleteProductionBatch(orgID: string, batchId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // First, get the batch details to know which employees were affected
      const batchDoc = await getDoc(doc(db, "production_batches", batchId));
      if (!batchDoc.exists()) {
        throw new Error("Production batch not found");
      }
      
      const batchData = batchDoc.data();
      
      // Get associated wage entries to know the amounts to revert
      const wagesQuery = query(
        collection(db, "WAGES_ENTRIES"),
        where("orgID", "==", orgID),
        where("batchId", "==", batchId)
      );
      
      const wagesSnapshot = await getDocs(wagesQuery);
      const wageEntries = wagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get employees to check for account relationships
      const employees = await EmployeeService.getEmployees(orgID);
      const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

      // Revert employee balances and account balances
      for (const wageEntry of wageEntries) {
        const wageAmount = wageEntry.wageAmount || 0;
        
        // Revert employee balance (subtract the wage amount)
        const employeeRef = doc(db, "employees", wageEntry.employeeId);
        batch.update(employeeRef, {
          currentBalance: increment(-wageAmount), // Subtract the wage amount
          updatedAt: serverTimestamp()
        });

        // Revert account balance if employee has an account
        const employee = employeeMap.get(wageEntry.employeeId);
        if (employee?.accountId) {
          const accountRef = doc(db, "employeeaccounts", employee.accountId);
          batch.update(accountRef, {
            currentBalance: increment(-wageAmount), // Subtract the wage amount
            updatedAt: serverTimestamp()
          });
        }
      }

      // Delete production batch
      const batchRef = doc(db, "production_batches", batchId);
      batch.delete(batchRef);

      // Delete associated wage entries
      wagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });


      await batch.commit();
      console.log("✅ Production batch deleted successfully with balance reversion:", batchId);

    } catch (error) {
      // Error deleting production batch
      throw new Error("Failed to delete production batch");
    }
  }

  // Get production employees (employees with production tags)
  static async getProductionEmployees(orgID: string): Promise<any[]> {
    try {
      const employees = await EmployeeService.getEmployees(orgID);
      
      const productionEmployees = employees.filter(emp => {
        const hasProductionTag = emp.employeeTags && emp.employeeTags.includes("production");
        const isActive = emp.isActive;
        return isActive && hasProductionTag;
      });
      
      return productionEmployees;
    } catch (error) {
      // Error fetching production employees
      throw new Error("Failed to fetch production employees");
    }
  }

  // Format money for display
  static formatMoney(amount: number): string {
    return `₹${(amount / 100).toFixed(2)}`;
  }

  // Parse money from input
  static parseMoney(amount: string): number {
    const numericValue = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    return Math.round(numericValue * 100);
  }

  // Generate next batch number
  static async generateNextBatchNumber(orgID: string): Promise<string> {
    try {
      const batches = await this.getProductionBatches(orgID);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      // Find the highest batch number for this month
      const monthPrefix = `B${year}${month}`;
      const monthBatches = batches.filter(batch => 
        batch.batchNo.startsWith(monthPrefix)
      );
      
      if (monthBatches.length === 0) {
        return `${monthPrefix}001`;
      }
      
      const lastBatchNo = monthBatches[0].batchNo;
      const lastNumber = parseInt(lastBatchNo.replace(monthPrefix, ''));
      const nextNumber = lastNumber + 1;
      
      return `${monthPrefix}${String(nextNumber).padStart(3, '0')}`;
      
    } catch (error) {
      // Error generating batch number
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-6);
      return `B${timestamp}`;
    }
  }
}
