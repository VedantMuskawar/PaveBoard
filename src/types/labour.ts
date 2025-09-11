// Core Labour Management Types
export interface Labour {
  id: string;
  labourID: string; // Human-readable ID like L12345678
  orgID: string;
  name: string;
  gender: 'Male' | 'Female';
  status: 'Active' | 'Inactive';
  tags: string[];
  assignedVehicle?: string;
  currentBalance: number;
  totalEarned: number;
  totalPaid: number;
  openingBalance: number;
  linkedPairID?: string;
  isLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedPair {
  id: string;
  orgID: string;
  labour1ID: string;
  labour2ID: string;
  status: 'Active' | 'Inactive';
  sharedBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LabourFilters {
  status?: 'Active' | 'Inactive';
  tags?: string[];
  isLinked?: boolean;
  searchTerm?: string;
  orgID?: string;
}

export interface LabourCreateData {
  name: string;
  gender: 'Male' | 'Female';
  tags: string[];
  assignedVehicle?: string;
  openingBalance?: number;
  orgID: string;
}

export interface LabourUpdateData {
  name?: string;
  gender?: 'Male' | 'Female';
  status?: 'Active' | 'Inactive';
  tags?: string[];
  assignedVehicle?: string;
  currentBalance?: number;
  totalEarned?: number;
  totalPaid?: number;
}

export interface LinkedPairCreateData {
  labour1ID: string;
  labour2ID: string;
  orgID: string;
}

// Display types for UI
export interface DisplayLabour extends Labour {
  linkedPartnerName?: string;
  isSelected?: boolean;
}

// Migration types
export interface LegacyLabour {
  id: string;
  orgID: string;
  name: string;
  gender: string;
  status: string;
  tags: string[];
  assignedVehicle?: string;
  currentBalance: number;
  totalEarned: number;
  totalPaid: number;
  openingBalance: number;
  type?: 'individual' | 'linked_pair';
  // For linked pairs
  labour1?: {
    labourID: string;
    name: string;
    gender: string;
    tags: string[];
    assignedVehicle?: string;
  };
  labour2?: {
    labourID: string;
    name: string;
    gender: string;
    tags: string[];
    assignedVehicle?: string;
  };
  sharedBalance?: {
    currentBalance: number;
    totalEarned: number;
    totalPaid: number;
  };
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  individualLabours: Labour[];
  linkedPairs: LinkedPair[];
}
