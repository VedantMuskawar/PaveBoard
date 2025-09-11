export interface WageEntry {
  id: string;
  orgID: string;
  employeeId: string;
  employeeName: string;
  category: "Salary" | "Trip" | "Batch" | "Bonus";
  date: Date;
  wageAmount: number; // in paise
  createdAt: Date;
}

export interface Payment {
  id: string;
  orgID: string;
  accountId?: string;
  totalAmount: number; // in paise
  date: Date;
  remarks: string;
  allocations: PaymentAllocation[];
  createdAt: Date;
}

export interface PaymentAllocation {
  employeeId: string;
  employeeName: string;
  amount: number; // in paise
}

export interface LedgerEntry {
  id: string;
  date: Date;
  type: 'credit' | 'debit' | 'opening';
  description: string;
  member?: string; // for account ledgers
  amount: number; // in paise
  runningBalance: number; // in paise
  referenceId?: string; // wage entry ID or payment ID
  category?: string; // for credits
}

export interface LedgerSummary {
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  closingBalance: number;
  memberBreakdown?: MemberBalance[]; // for accounts
}

export interface MemberBalance {
  employeeId: string;
  employeeName: string;
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  closingBalance: number;
}

export interface LedgerSearchResult {
  type: 'employee' | 'account';
  id: string;
  name: string;
  description?: string;
  matchScore?: number; // For sorting search results
}

export interface LedgerFilters {
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  type?: 'all' | 'credits' | 'debits';
}

export interface LedgerViewMode {
  view: 'compact' | 'detailed';
  showMemberBreakdown: boolean;
}

export const WAGE_CATEGORIES = [
  "Salary",
  "Trip", 
  "Batch",
  "Bonus"
] as const;

export const LEDGER_ENTRY_TYPES = [
  "opening",
  "credit",
  "debit"
] as const;

export const LEDGER_VIEW_MODES = [
  "compact",
  "detailed"
] as const;
