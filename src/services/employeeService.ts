import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  serverTimestamp,
  Transaction,
  runTransaction
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Employee, EmployeeAccount, EmployeeFormData, AccountFormData, EmployeeWithAccount } from "../types/employee";

export class EmployeeService {
  private static readonly EMPLOYEES_COLLECTION = "employees";
  private static readonly ACCOUNTS_COLLECTION = "employeeaccounts";

  // Employee CRUD operations
  static async createEmployee(employeeData: EmployeeFormData, orgID: string, createdBy: string): Promise<string> {
    try {
      const now = new Date();
      const employee: Omit<Employee, 'id'> = {
        orgID,
        name: employeeData.name,
        labourID: employeeData.labourID,
        employeeTags: employeeData.employeeTags,
        salaryTags: employeeData.salaryTags,
        salaryValue: Math.round(employeeData.salaryValue * 100), // Convert to paise
        bonusEligible: employeeData.bonusEligible,
        openingBalance: Math.round(employeeData.openingBalance * 100), // Convert to paise
        currentBalance: Math.round(employeeData.openingBalance * 100), // Initialize with opening balance
        isActive: employeeData.isActive,
        dateJoined: employeeData.dateJoined,
        createdAt: now,
        updatedAt: now,
        createdBy
      };

      const docRef = await addDoc(collection(db, this.EMPLOYEES_COLLECTION), employee);
      return docRef.id;
    } catch (error) {
      // Error creating employee
      throw new Error("Failed to create employee");
    }
  }

  static async updateEmployee(employeeId: string, employeeData: Partial<EmployeeFormData>): Promise<void> {
    try {
      const updateData: any = {
        ...employeeData,
        updatedAt: serverTimestamp()
      };

      // Convert money values to paise
      if (employeeData.salaryValue !== undefined) {
        updateData.salaryValue = Math.round(employeeData.salaryValue * 100);
      }
      if (employeeData.openingBalance !== undefined) {
        updateData.openingBalance = Math.round(employeeData.openingBalance * 100);
        // Only update currentBalance if no wages/payments exist yet
        updateData.currentBalance = Math.round(employeeData.openingBalance * 100);
      }

      await updateDoc(doc(db, this.EMPLOYEES_COLLECTION, employeeId), updateData);
    } catch (error) {
      // Error updating employee
      throw new Error("Failed to update employee");
    }
  }

  static async deactivateEmployee(employeeId: string): Promise<void> {
    try {
      // Get employee details first to check for account relationship
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Update employee to inactive
      await updateDoc(doc(db, this.EMPLOYEES_COLLECTION, employeeId), {
        isActive: false,
        updatedAt: serverTimestamp()
      });

      // If employee has an account, update the account's currentBalance
      if (employee.accountId) {
        await this.updateAccountBalance(employee.accountId);
      }

      // Employee deactivated successfully
    } catch (error) {
      // Error deactivating employee
      throw new Error("Failed to deactivate employee");
    }
  }

  static async deleteEmployee(employeeId: string): Promise<void> {
    try {
      // Starting delete process for employee
      
      // Get employee details first to check for account relationship
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // If employee has an account, handle account cleanup
      if (employee.accountId) {
        await runTransaction(db, async (transaction: Transaction) => {
          // Update account member list and recalculate balance
          const accountRef = doc(db, this.ACCOUNTS_COLLECTION, employee.accountId);
          const accountDoc = await transaction.get(accountRef);
          
          if (accountDoc.exists()) {
            const currentMembers = accountDoc.data().memberIds || [];
            const updatedMembers = currentMembers.filter((id: string) => id !== employeeId);
            
            // If no members left, delete the account
            if (updatedMembers.length === 0) {
              transaction.delete(accountRef);
              // Account deleted as it has no remaining members
            } else {
              // Calculate new combined balances
              const newBalance = await this.calculateAccountBalance(updatedMembers);
              const newOpeningBalance = await this.calculateAccountOpeningBalance(updatedMembers);
              
              transaction.update(accountRef, {
                memberIds: updatedMembers,
                currentBalance: newBalance,
                openingBalance: newOpeningBalance,
                updatedAt: serverTimestamp()
              });
            }
          }
          
          // Delete the employee document
          const employeeRef = doc(db, this.EMPLOYEES_COLLECTION, employeeId);
          transaction.delete(employeeRef);
        });
      } else {
        // No account, just delete the employee
        await deleteDoc(doc(db, this.EMPLOYEES_COLLECTION, employeeId));
      }

      // Employee deleted successfully
    } catch (error) {
      // Error deleting employee
      throw new Error("Failed to delete employee");
    }
  }

  static async getEmployees(orgID: string): Promise<EmployeeWithAccount[]> {
    try {
      if (!orgID) {
        throw new Error("Organization ID is required");
      }

      // Fetching employees for organization

      const q = query(
        collection(db, this.EMPLOYEES_COLLECTION),
        where("orgID", "==", orgID)
      );

      const snapshot = await getDocs(q);
      // Query executed successfully

      const employees = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dateJoined: data.dateJoined?.toDate() || new Date()
        };
      }) as Employee[];

      // Processed employees successfully

      // Sort by createdAt descending (newest first)
      employees.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Fetch account information for employees with accounts
      const employeesWithAccounts = await Promise.all(
        employees.map(async (employee) => {
          if (employee.accountId) {
            try {
              const accountDoc = await getDoc(doc(db, this.ACCOUNTS_COLLECTION, employee.accountId));
              if (accountDoc.exists()) {
                const accountData = accountDoc.data();
                return {
                  ...employee,
                  accountName: accountData.name,
                  accountType: accountData.accountType
                };
              }
            } catch (error) {
              // Error fetching account for employee
            }
          }
          return employee;
        })
      );

      return employeesWithAccounts;
    } catch (error) {
      // Error fetching employees
      throw new Error("Failed to fetch employees");
    }
  }

  static async getEmployee(employeeId: string): Promise<Employee | null> {
    try {
      const docRef = doc(db, this.EMPLOYEES_COLLECTION, employeeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dateJoined: data.dateJoined?.toDate() || new Date()
        } as Employee;
      }
      return null;
    } catch (error) {
      // Error fetching employee
      throw new Error("Failed to fetch employee");
    }
  }

  // Account CRUD operations
  static async createAccount(accountData: AccountFormData, orgID: string, createdBy: string): Promise<string> {
    try {
      const now = new Date();
      
      // Calculate combined balances from member employees
      const combinedBalance = await this.calculateAccountBalance(accountData.memberIds);
      const combinedOpeningBalance = await this.calculateAccountOpeningBalance(accountData.memberIds);
      
      const account: Omit<EmployeeAccount, 'id'> = {
        orgID,
        name: accountData.name,
        accountType: "combined",
        memberIds: accountData.memberIds,
        currentBalance: combinedBalance,
        openingBalance: combinedOpeningBalance,
        splitRule: accountData.splitRule,
        createdBy,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, this.ACCOUNTS_COLLECTION), account);
      return docRef.id;
    } catch (error) {
      // Error creating account
      throw new Error("Failed to create account");
    }
  }

  static async updateAccount(accountId: string, accountData: Partial<AccountFormData>): Promise<void> {
    try {
      const updateData: any = {
        ...accountData,
        updatedAt: serverTimestamp()
      };

      // If memberIds are being updated, recalculate balances
      if (accountData.memberIds) {
        updateData.currentBalance = await this.calculateAccountBalance(accountData.memberIds);
        updateData.openingBalance = await this.calculateAccountOpeningBalance(accountData.memberIds);
      }

      await updateDoc(doc(db, this.ACCOUNTS_COLLECTION, accountId), updateData);
    } catch (error) {
      // Error updating account
      throw new Error("Failed to update account");
    }
  }

  static async getAccounts(orgID: string): Promise<EmployeeAccount[]> {
    try {
      const q = query(
        collection(db, this.ACCOUNTS_COLLECTION),
        where("orgID", "==", orgID)
      );

      const snapshot = await getDocs(q);
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as EmployeeAccount[];

      // Sort by createdAt descending (newest first)
      accounts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return accounts;
    } catch (error) {
      // Error fetching accounts
      throw new Error("Failed to fetch accounts");
    }
  }

  static async getAccount(accountId: string): Promise<EmployeeAccount | null> {
    try {
      const docRef = doc(db, this.ACCOUNTS_COLLECTION, accountId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as EmployeeAccount;
      }
      return null;
    } catch (error) {
      // Error fetching account
      throw new Error("Failed to fetch account");
    }
  }

  // Combined operations
  static async createAccountWithMembers(
    accountData: AccountFormData, 
    orgID: string, 
    createdBy: string
  ): Promise<string> {
    try {
      return await runTransaction(db, async (transaction: Transaction) => {
        // Calculate combined balances from member employees
        const combinedBalance = await this.calculateAccountBalance(accountData.memberIds);
        const combinedOpeningBalance = await this.calculateAccountOpeningBalance(accountData.memberIds);
        
        // Create the account
        const accountRef = doc(collection(db, this.ACCOUNTS_COLLECTION));
        const now = new Date();
        const account: Omit<EmployeeAccount, 'id'> = {
          orgID,
          name: accountData.name,
          accountType: "combined",
          memberIds: accountData.memberIds,
          currentBalance: combinedBalance,
          openingBalance: combinedOpeningBalance,
          splitRule: accountData.splitRule,
          createdBy,
          createdAt: now,
          updatedAt: now
        };

        transaction.set(accountRef, account);

        // Update all member employees to reference this account
        const memberUpdates = accountData.memberIds.map(memberId => {
          const employeeRef = doc(db, this.EMPLOYEES_COLLECTION, memberId);
          return transaction.update(employeeRef, {
            accountId: accountRef.id,
            updatedAt: serverTimestamp()
          });
        });

        await Promise.all(memberUpdates);

        return accountRef.id;
      });
    } catch (error) {
      // Error creating account with members
      throw new Error("Failed to create account with members");
    }
  }

  static async removeMemberFromAccount(accountId: string, employeeId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction: Transaction) => {
        // Remove employee from account
        const employeeRef = doc(db, this.EMPLOYEES_COLLECTION, employeeId);
        transaction.update(employeeRef, {
          accountId: null,
          updatedAt: serverTimestamp()
        });

        // Update account member list and recalculate balance
        const accountRef = doc(db, this.ACCOUNTS_COLLECTION, accountId);
        const accountDoc = await transaction.get(accountRef);
        
        if (accountDoc.exists()) {
          const currentMembers = accountDoc.data().memberIds || [];
          const updatedMembers = currentMembers.filter((id: string) => id !== employeeId);
          
          // If no members left, delete the account
          if (updatedMembers.length === 0) {
            transaction.delete(accountRef);
            // Account deleted as it has no remaining members
            return;
          }
          
          // Calculate new combined balances
          const newBalance = await this.calculateAccountBalance(updatedMembers);
          const newOpeningBalance = await this.calculateAccountOpeningBalance(updatedMembers);
          
          transaction.update(accountRef, {
            memberIds: updatedMembers,
            currentBalance: newBalance,
            openingBalance: newOpeningBalance,
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      // Error removing member from account
      throw new Error("Failed to remove member from account");
    }
  }

  // Utility functions
  static formatMoney(paise: number): number {
    return paise / 100;
  }

  static formatMoneyToPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }

  static calculateCombinedBalance(employees: Employee[]): number {
    return employees.reduce((total, employee) => total + employee.currentBalance, 0);
  }

  static async calculateAccountBalance(memberIds: string[]): Promise<number> {
    try {
      if (memberIds.length === 0) return 0;
      
      // Fetch all member employees
      const memberPromises = memberIds.map(async (memberId) => {
        try {
          const employee = await this.getEmployee(memberId);
          return employee?.currentBalance || 0;
        } catch (error) {
          // Employee not found, skipping from balance calculation
          return 0;
        }
      });
      
      const balances = await Promise.all(memberPromises);
      return balances.reduce((total, balance) => total + balance, 0);
    } catch (error) {
      // Error calculating account balance
      return 0;
    }
  }

  static async calculateAccountOpeningBalance(memberIds: string[]): Promise<number> {
    try {
      if (memberIds.length === 0) return 0;
      
      // Fetch all member employees
      const memberPromises = memberIds.map(async (memberId) => {
        try {
          const employee = await this.getEmployee(memberId);
          return employee?.openingBalance || 0;
        } catch (error) {
          // Employee not found, skipping from balance calculation
          return 0;
        }
      });
      
      const balances = await Promise.all(memberPromises);
      return balances.reduce((total, balance) => total + balance, 0);
    } catch (error) {
      // Error calculating account opening balance
      return 0;
    }
  }

  static async updateAccountBalance(accountId: string): Promise<void> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error("Account not found");
      }
      
      const newBalance = await this.calculateAccountBalance(account.memberIds);
      const newOpeningBalance = await this.calculateAccountOpeningBalance(account.memberIds);
      
      await updateDoc(doc(db, this.ACCOUNTS_COLLECTION, accountId), {
        currentBalance: newBalance,
        openingBalance: newOpeningBalance,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Error updating account balance
      throw new Error("Failed to update account balance");
    }
  }

  static validateLabourID(orgID: string, labourID: string, excludeId?: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const q = query(
          collection(db, this.EMPLOYEES_COLLECTION),
          where("orgID", "==", orgID),
          where("labourID", "==", labourID)
        );

        const snapshot = await getDocs(q);
        const existing = snapshot.docs.find(doc => doc.id !== excludeId);
        resolve(!existing);
      } catch (error) {
        // Error validating labour ID
        resolve(false);
      }
    });
  }
}
