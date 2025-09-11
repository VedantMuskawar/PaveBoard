export interface Employee {
  id: string;
  orgID: string;
  name: string;
  labourID: string;
  employeeTags: string[];
  salaryTags: string[];
  salaryValue: number;
  bonusEligible: boolean;
  accountId?: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  dateJoined: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmployeeAccount {
  id: string;
  orgID: string;
  name: string;
  accountType: "combined";
  memberIds: string[];
  currentBalance: number; // Combined current balance of all members
  openingBalance: number; // Combined opening balance of all members
  splitRule: {
    type: "equal" | "proportional" | "manual";
    manualSplits?: { [employeeId: string]: number }; // For manual split type
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeFormData {
  name: string;
  labourID: string;
  employeeTags: string[];
  salaryTags: string[];
  salaryValue: number;
  bonusEligible: boolean;
  openingBalance: number;
  isActive: boolean;
  dateJoined: Date;
}

export interface AccountFormData {
  name: string;
  memberIds: string[];
  currentBalance: number; // Combined current balance of all members
  splitRule: {
    type: "equal" | "proportional" | "manual";
    manualSplits?: { [employeeId: string]: number };
  };
}

export interface EmployeeWithAccount extends Employee {
  accountName?: string;
  accountType?: string;
}

export const EMPLOYEE_TAGS = [
  "manager",
  "driver", 
  "loader",
  "production",
  "supervisor",
  "helper",
  "operator",
  "maintenance"
] as const;

export const SALARY_TAGS = [
  "fixed",
  "perTrip", 
  "perBatch"
] as const;

export const SPLIT_RULE_TYPES = [
  "equal",
  "proportional", 
  "manual"
] as const;
