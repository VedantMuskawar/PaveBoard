export interface ProductionBatch {
  id: string;
  orgID: string;
  batchNo: string;
  date: Date;
  cementBags: number;
  productionQuantity: number; // Nos produced
  thappiQuantity: number; // Nos produced
  labourIds: string[];
  totalWages: number; // in paise
  splitRule: "equal" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionWageEntry {
  id: string;
  orgID: string;
  employeeId: string;
  employeeName: string;
  category: "Production";
  date: Date;
  batchId: string;
  unitCount: number; // Nos handled by this employee
  wageAmount: number; // in paise
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionConfig {
  productionWage: number; // ₹ per 1000 Nos (in paise)
  thappiWage: number; // ₹ per 1000 Nos (in paise)
}

export interface WageAllocation {
  employeeId: string;
  employeeName: string;
  unitCount: number;
  wageAmount: number; // in paise
  isManual: boolean;
}

export interface ProductionBatchFormData {
  batchNo: string;
  date: Date;
  cementBags: number;
  productionQuantity: number;
  thappiQuantity: number;
  labourIds: string[];
  splitRule: "equal" | "manual";
  wageAllocations: WageAllocation[];
}


export interface ProductionBatchWithDetails extends ProductionBatch {
  labourDetails: {
    id: string;
    name: string;
    wageAmount: number;
    unitCount: number;
  }[];
  totalProduction: number;
  totalThappi: number;
}
