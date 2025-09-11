import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAt,
  endAt,
  and,
  or,
  arrayUnion
} from "firebase/firestore";
import { db } from "../config/firebase";
import { EmployeeService } from "./employeeService";
import { 
  WageEntry, 
  Payment, 
  LedgerEntry, 
  LedgerSummary, 
  MemberBalance, 
  LedgerSearchResult,
  LedgerFilters 
} from "../types/ledger";

export class LedgerService {
  private static readonly WAGES_COLLECTION = "WAGES_ENTRIES";
  private static readonly PAYMENTS_COLLECTION = "payments";
  private static readonly EMPLOYEES_COLLECTION = "employees";
  private static readonly ACCOUNTS_COLLECTION = "employeeaccounts";

  // Cache for search results
  private static searchCache = new Map<string, { results: LedgerSearchResult[], timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Search for employees and accounts with optimized queries and caching
  static async searchEmployeesAndAccounts(orgID: string, searchTerm: string): Promise<LedgerSearchResult[]> {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      // Check cache first
      const cacheKey = `${orgID}-${searchTerm.toLowerCase()}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log(`💾 Using cached results for: ${searchTerm}`);
        return cached.results;
      }
      
      console.log(`🔍 Cache miss, performing fresh search for: ${searchTerm}`);

      const results: LedgerSearchResult[] = [];
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();

      // Use simple queries (optimized queries disabled for debugging)
      console.log(`🔄 Using simple queries for orgID: ${orgID}`);
      
      // Simple employee query (no orderBy to avoid index requirement)
      const employeesQuery = query(
        collection(db, this.EMPLOYEES_COLLECTION),
        where("orgID", "==", orgID),
        where("isActive", "==", true),
        limit(50)
      );

      const employeesSnapshot = await getDocs(employeesQuery);
      console.log(`🔍 Found ${employeesSnapshot.docs.length} employees for orgID: ${orgID}`);
      
      if (employeesSnapshot.docs.length === 0) {
        console.log(`⚠️ No employees found! Checking if orgID is correct: ${orgID}`);
        // Let's try without the isActive filter to see if there are any employees at all
        const allEmployeesQuery = query(
          collection(db, this.EMPLOYEES_COLLECTION),
          where("orgID", "==", orgID),
          limit(10)
        );
        const allEmployeesSnapshot = await getDocs(allEmployeesQuery);
        console.log(`📊 Total employees in org (including inactive): ${allEmployeesSnapshot.docs.length}`);
        allEmployeesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`👤 Employee data:`, { id: doc.id, name: data.name, isActive: data.isActive, orgID: data.orgID });
        });
      }
      
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.name.toLowerCase();
        console.log(`👤 Checking employee: "${data.name}" (${data.isActive ? 'active' : 'inactive'}) against "${normalizedSearchTerm}"`);
        
        if (this.fuzzyMatch(name, normalizedSearchTerm)) {
          console.log(`✅ Match found: ${data.name}`);
          results.push({
            type: 'employee',
            id: doc.id,
            name: data.name,
            description: `Employee - ${data.labourID || 'N/A'}`,
            matchScore: this.calculateMatchScore(name, normalizedSearchTerm)
          });
        } else {
          console.log(`❌ No match for: ${data.name}`);
        }
      });

      // Simple accounts query (no orderBy to avoid index requirement)
      const accountsQuery = query(
        collection(db, this.ACCOUNTS_COLLECTION),
        where("orgID", "==", orgID),
        limit(50)
      );

      const accountsSnapshot = await getDocs(accountsQuery);
      console.log(`🏢 Found ${accountsSnapshot.docs.length} accounts for orgID: ${orgID}`);
      
      if (accountsSnapshot.docs.length === 0) {
        console.log(`⚠️ No accounts found! Checking if orgID is correct: ${orgID}`);
        // Let's try to see if there are any accounts at all
        const allAccountsQuery = query(
          collection(db, this.ACCOUNTS_COLLECTION),
          limit(10)
        );
        const allAccountsSnapshot = await getDocs(allAccountsQuery);
        console.log(`📊 Total accounts in database: ${allAccountsSnapshot.docs.length}`);
        allAccountsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`🏢 Account data:`, { id: doc.id, name: data.name, orgID: data.orgID });
        });
      }
      
      accountsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.name.toLowerCase();
        console.log(`🏢 Checking account: "${data.name}" against "${normalizedSearchTerm}"`);
        
        if (this.fuzzyMatch(name, normalizedSearchTerm)) {
          console.log(`✅ Match found: ${data.name}`);
          results.push({
            type: 'account',
            id: doc.id,
            name: data.name,
            description: `Account - ${data.memberIds?.length || 0} members`,
            matchScore: this.calculateMatchScore(name, normalizedSearchTerm)
          });
        } else {
          console.log(`❌ No match for account: ${data.name}`);
        }
      });

      // Sort by match score (exact matches first, then fuzzy matches)
      results.sort((a, b) => {
        const scoreA = a.matchScore || 0;
        const scoreB = b.matchScore || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return a.name.localeCompare(b.name);
      });

      const finalResults = results.slice(0, 15); // Increased limit for better UX
      console.log(`🎯 Final search results: ${finalResults.length} items for "${searchTerm}"`);
      console.log('Results:', finalResults);

      // Cache the results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now()
      });

      return finalResults;
    } catch (error) {
      console.error("Error searching employees and accounts:", error);
      throw new Error("Failed to search employees and accounts");
    }
  }

  // Fuzzy matching for typo tolerance
  private static fuzzyMatch(text: string, searchTerm: string): boolean {
    // Exact match
    if (text.includes(searchTerm)) {
      console.log(`🎯 Exact match: "${text}" contains "${searchTerm}"`);
      return true;
    }

    // Fuzzy matching for typos (simple implementation)
    const maxDistance = Math.floor(searchTerm.length * 0.3); // Allow 30% character difference
    const distance = this.levenshteinDistance(text, searchTerm);
    const isMatch = distance <= maxDistance;
    
    if (isMatch) {
      console.log(`🎯 Fuzzy match: "${text}" vs "${searchTerm}" (distance: ${distance}, max: ${maxDistance})`);
    }
    
    return isMatch;
  }

  // Calculate match score for sorting
  private static calculateMatchScore(text: string, searchTerm: string): number {
    if (text === searchTerm) return 100; // Exact match
    if (text.startsWith(searchTerm)) return 90; // Starts with
    if (text.includes(searchTerm)) return 80; // Contains
    return Math.max(0, 100 - this.levenshteinDistance(text, searchTerm) * 10); // Fuzzy match
  }

  // Levenshtein distance for fuzzy matching
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Clear search cache
  static clearSearchCache(): void {
    console.log(`🗑️ Clearing search cache. Cache size before: ${this.searchCache.size}`);
    this.searchCache.clear();
    console.log(`✅ Search cache cleared. Cache size after: ${this.searchCache.size}`);
  }

  // Debug function to test search directly
  static async debugSearch(orgID: string, searchTerm: string): Promise<void> {
    console.log(`🔍 DEBUG: Testing search for "${searchTerm}" with orgID: ${orgID}`);
    
    // Test accounts collection directly
    const accountsQuery = query(
      collection(db, this.ACCOUNTS_COLLECTION),
      where("orgID", "==", orgID),
      limit(10)
    );
    
    const accountsSnapshot = await getDocs(accountsQuery);
    console.log(`📊 DEBUG: Found ${accountsSnapshot.docs.length} accounts`);
    
    accountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`🏢 DEBUG Account:`, { 
        id: doc.id, 
        name: data.name, 
        orgID: data.orgID,
        matches: data.name.toLowerCase().includes(searchTerm.toLowerCase())
      });
    });
  }

  // Get employee ledger
  static async getEmployeeLedger(
    employeeId: string, 
    orgID: string, 
    filters?: LedgerFilters
  ): Promise<{ entries: LedgerEntry[], summary: LedgerSummary }> {
    try {
      // Get employee details
      const employee = await EmployeeService.getEmployee(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Get wage entries (credits)
      const wagesQuery = query(
        collection(db, this.WAGES_COLLECTION),
        where("orgID", "==", orgID),
        where("employeeId", "==", employeeId)
      );

      const wagesSnapshot = await getDocs(wagesQuery);
      const wageEntries: WageEntry[] = wagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as WageEntry[];

      // Get payments (debits) where this employee is allocated
      const paymentsQuery = query(
        collection(db, this.PAYMENTS_COLLECTION),
        where("orgID", "==", orgID)
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const allPayments: Payment[] = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Payment[];

      // Filter payments that include this employee
      const relevantPayments = allPayments.filter(payment => 
        payment.allocations.some(allocation => allocation.employeeId === employeeId)
      );

      // Create ledger entries
      const entries: LedgerEntry[] = [];

      // Add opening balance
      entries.push({
        id: 'opening',
        date: employee.dateJoined,
        type: 'opening',
        description: 'Opening Balance',
        amount: employee.openingBalance,
        runningBalance: employee.openingBalance
      });

      // Add wage entries (credits)
      wageEntries.forEach(wage => {
        entries.push({
          id: `wage-${wage.id}`,
          date: wage.date,
          type: 'credit',
          description: `${wage.category} - ${wage.employeeName}`,
          amount: wage.wageAmount,
          runningBalance: 0, // Will be calculated later
          referenceId: wage.id,
          category: wage.category
        });
      });

      // Add payment allocations (debits)
      relevantPayments.forEach(payment => {
        const allocation = payment.allocations.find(a => a.employeeId === employeeId);
        if (allocation) {
          entries.push({
            id: `payment-${payment.id}`,
            date: payment.date,
            type: 'debit',
            description: `Payment - ${payment.remarks}`,
            amount: allocation.amount, // Use amount as stored (assuming it's already negative for debits)
            runningBalance: 0, // Will be calculated later
            referenceId: payment.id
          });
        }
      });

      // Get expense payments from EMPLOYEE_LEDGER
      const employeeLedgerQuery = query(
        collection(db, "EMPLOYEE_LEDGER"),
        where("orgID", "==", orgID),
        where("employeeID", "==", employeeId)
      );

      const employeeLedgerSnapshot = await getDocs(employeeLedgerQuery);
      const employeeLedgerEntries = employeeLedgerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as any[];

      // Add employee ledger entries (expense payments) - ONLY for individual employee ledger
      employeeLedgerEntries.forEach(ledgerEntry => {
        entries.push({
          id: `ledger-${ledgerEntry.id}`,
          date: ledgerEntry.date,
          type: ledgerEntry.transactionType === 'credit' ? 'credit' : 'debit',
          description: ledgerEntry.description || 'Expense Payment',
          amount: ledgerEntry.amount, // Use amount as stored in database (negative for debits)
          runningBalance: 0, // Will be calculated later
          referenceId: ledgerEntry.referenceID,
          category: ledgerEntry.category || 'expense'
        });
      });

      // Apply filters
      let filteredEntries = entries;
      if (filters) {
        if (filters.dateFrom) {
          filteredEntries = filteredEntries.filter(entry => entry.date >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          filteredEntries = filteredEntries.filter(entry => entry.date <= filters.dateTo!);
        }
        if (filters.category) {
          filteredEntries = filteredEntries.filter(entry => entry.category === filters.category);
        }
        if (filters.type && filters.type !== 'all') {
          const filterType = filters.type === 'credits' ? 'credit' : 'debit';
          filteredEntries = filteredEntries.filter(entry => entry.type === filterType);
        }
      }

      // Sort by date
      filteredEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = employee.openingBalance;
      filteredEntries.forEach(entry => {
        if (entry.type !== 'opening') {
          runningBalance += entry.amount;
          entry.runningBalance = runningBalance;
        }
      });

      // Calculate summary
      const totalCredits = wageEntries.reduce((sum, wage) => sum + wage.wageAmount, 0) + 
        employeeLedgerEntries
          .filter(entry => entry.transactionType === 'credit')
          .reduce((sum, entry) => sum + entry.amount, 0);
      
      const totalDebits = relevantPayments.reduce((sum, payment) => {
        const allocation = payment.allocations.find(a => a.employeeId === employeeId);
        return sum + (allocation?.amount || 0);
      }, 0) + 
        employeeLedgerEntries
          .filter(entry => entry.transactionType === 'debit')
          .reduce((sum, entry) => sum + Math.abs(entry.amount), 0); // Use absolute value for total calculation

      const summary: LedgerSummary = {
        openingBalance: employee.openingBalance,
        totalCredits,
        totalDebits,
        closingBalance: employee.openingBalance + totalCredits - totalDebits
      };

      return { entries: filteredEntries, summary };
    } catch (error) {
      console.error("Error getting employee ledger:", error);
      throw new Error("Failed to get employee ledger");
    }
  }

  // Get account ledger
  static async getAccountLedger(
    accountId: string, 
    orgID: string, 
    filters?: LedgerFilters
  ): Promise<{ entries: LedgerEntry[], summary: LedgerSummary }> {
    try {
      // Get account details
      const account = await EmployeeService.getAccount(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      // Get member employees
      const memberPromises = account.memberIds.map(memberId => 
        EmployeeService.getEmployee(memberId)
      );
      const members = (await Promise.all(memberPromises)).filter((member): member is NonNullable<typeof member> => member !== null);

      // Calculate combined opening balance
      const combinedOpeningBalance = members.reduce((sum, member) => 
        sum + member.openingBalance, 0
      );

      // Get wage entries for all members
      const wagesQuery = query(
        collection(db, this.WAGES_COLLECTION),
        where("orgID", "==", orgID),
        where("employeeId", "in", account.memberIds)
      );

      const wagesSnapshot = await getDocs(wagesQuery);
      const wageEntries: WageEntry[] = wagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as WageEntry[];

      // Get payments for this account
      const paymentsQuery = query(
        collection(db, this.PAYMENTS_COLLECTION),
        where("orgID", "==", orgID),
        where("accountId", "==", accountId)
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments: Payment[] = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Payment[];

      // Create ledger entries
      const entries: LedgerEntry[] = [];

      // Add opening balance
      entries.push({
        id: 'opening',
        date: new Date(Math.min(...members.map(m => m.dateJoined.getTime()))),
        type: 'opening',
        description: 'Combined Opening Balance',
        amount: combinedOpeningBalance,
        runningBalance: combinedOpeningBalance
      });

      // Add wage entries (credits)
      wageEntries.forEach(wage => {
        entries.push({
          id: `wage-${wage.id}`,
          date: wage.date,
          type: 'credit',
          description: `${wage.category} - ${wage.employeeName}`,
          member: wage.employeeName,
          amount: wage.wageAmount,
          runningBalance: 0, // Will be calculated later
          referenceId: wage.id,
          category: wage.category
        });
      });

      // Add payments (debits)
      payments.forEach(payment => {
        entries.push({
          id: `payment-${payment.id}`,
          date: payment.date,
          type: 'debit',
          description: `Payment - ${payment.remarks}`,
          amount: payment.totalAmount, // Use amount as stored (assuming it's already negative for debits)
          runningBalance: 0, // Will be calculated later
          referenceId: payment.id
        });
      });

      // Get expense payments from ACCOUNT_LEDGER
      const accountLedgerQuery = query(
        collection(db, "ACCOUNT_LEDGER"),
        where("orgID", "==", orgID),
        where("accountID", "==", accountId)
      );

      const accountLedgerSnapshot = await getDocs(accountLedgerQuery);
      const accountLedgerEntries = accountLedgerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as any[];

      // Add account ledger entries (expense payments) - ONLY for account ledger
      accountLedgerEntries.forEach(ledgerEntry => {
        entries.push({
          id: `ledger-${ledgerEntry.id}`,
          date: ledgerEntry.date,
          type: ledgerEntry.transactionType === 'credit' ? 'credit' : 'debit',
          description: ledgerEntry.description || 'Account Payment',
          amount: ledgerEntry.amount, // Use amount as stored in database (negative for debits)
          runningBalance: 0, // Will be calculated later
          referenceId: ledgerEntry.referenceID,
          category: ledgerEntry.category || 'expense'
        });
      });

      // Apply filters
      let filteredEntries = entries;
      if (filters) {
        if (filters.dateFrom) {
          filteredEntries = filteredEntries.filter(entry => entry.date >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          filteredEntries = filteredEntries.filter(entry => entry.date <= filters.dateTo!);
        }
        if (filters.category) {
          filteredEntries = filteredEntries.filter(entry => entry.category === filters.category);
        }
        if (filters.type && filters.type !== 'all') {
          const filterType = filters.type === 'credits' ? 'credit' : 'debit';
          filteredEntries = filteredEntries.filter(entry => entry.type === filterType);
        }
      }

      // Sort by date
      filteredEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = combinedOpeningBalance;
      filteredEntries.forEach(entry => {
        if (entry.type !== 'opening') {
          runningBalance += entry.amount;
          entry.runningBalance = runningBalance;
        }
      });

      // Calculate summary with member breakdown
      const totalCredits = wageEntries.reduce((sum, wage) => sum + wage.wageAmount, 0) + 
        accountLedgerEntries
          .filter(entry => entry.transactionType === 'credit')
          .reduce((sum, entry) => sum + entry.amount, 0);
      
      const totalDebits = payments.reduce((sum, payment) => sum + payment.totalAmount, 0) + 
        accountLedgerEntries
          .filter(entry => entry.transactionType === 'debit')
          .reduce((sum, entry) => sum + Math.abs(entry.amount), 0); // Use absolute value for total calculation

      const memberBreakdown: MemberBalance[] = members.map(member => {
        const memberWages = wageEntries.filter(w => w.employeeId === member.id);
        const memberCredits = memberWages.reduce((sum, wage) => sum + wage.wageAmount, 0);
        
        // For accounts, we don't track individual debits per member
        const memberDebits = 0; // This would need to be calculated based on split rules
        
        return {
          employeeId: member.id,
          employeeName: member.name,
          openingBalance: member.openingBalance,
          totalCredits: memberCredits,
          totalDebits: memberDebits,
          closingBalance: member.openingBalance + memberCredits - memberDebits
        };
      });

      const summary: LedgerSummary = {
        openingBalance: combinedOpeningBalance,
        totalCredits,
        totalDebits,
        closingBalance: combinedOpeningBalance + totalCredits - totalDebits,
        memberBreakdown
      };

      return { entries: filteredEntries, summary };
    } catch (error) {
      console.error("Error getting account ledger:", error);
      throw new Error("Failed to get account ledger");
    }
  }

  // Export ledger to CSV
  static exportToCSV(entries: LedgerEntry[], summary: LedgerSummary, entityName: string): void {
    const csvContent = [
      [`Ledger for: ${entityName}`],
      [''],
      ['Summary'],
      ['Opening Balance', `₹${this.formatMoney(summary.openingBalance)}`],
      ['Total Credits', `₹${this.formatMoney(summary.totalCredits)}`],
      ['Total Debits', `₹${this.formatMoney(summary.totalDebits)}`],
      ['Closing Balance', `₹${this.formatMoney(summary.closingBalance)}`],
      [''],
      ['Date', 'Type', 'Description', 'Member', 'Amount', 'Running Balance'],
      ...entries.map(entry => [
        entry.date.toLocaleDateString(),
        entry.type.toUpperCase(),
        entry.description,
        entry.member ?? '',
        `₹${this.formatMoney(entry.amount)}`,
        `₹${this.formatMoney(entry.runningBalance)}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}-ledger.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Utility functions
  static formatMoney(paise: number): number {
    return paise / 100;
  }

  static formatMoneyToPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }
}
