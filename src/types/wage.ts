// Wage Management Types
export interface WageEntry {
  id: string;
  orgID: string;
  labourID: string;
  amount: number;
  description: string;
  type: 'production' | 'overtime' | 'bonus' | 'penalty' | 'adjustment';
  productionEntryID?: string;
  batchNumber?: string;
  productionUnits?: number;
  thappiUnits?: number;
  wagePer1000Units?: number;
  wagePerThappi?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WageDistribution {
  method: 'equal' | 'percentage' | 'custom';
  totalWage: number;
  distributions: {
    labourID: string;
    amount: number;
    percentage?: number;
  }[];
}

export interface ProductionWageData {
  batchNumber: string;
  productionUnits: number;
  thappiUnits: number;
  wagePer1000Units: number;
  wagePerThappi: number;
  labourIDs: string[];
  date: Date;
}

export interface WageCalculation {
  totalWage: number;
  perLabourWage: number;
  distributions: {
    labourID: string;
    amount: number;
  }[];
}

export interface WageFilters {
  labourID?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  orgID?: string;
}

// Display types for UI
export interface DisplayWageEntry extends WageEntry {
  labourName: string;
  formattedAmount: string;
  formattedDate: string;
}
