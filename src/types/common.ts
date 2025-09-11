// Common Types and Utilities
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterState {
  searchTerm: string;
  status: string;
  tags: string[];
  isLinked: boolean | null;
  dateRange?: DateRange;
}

// Error types
export class LabourError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'LabourError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
