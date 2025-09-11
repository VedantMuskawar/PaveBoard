import { WageEntry, WageDistribution, ProductionWageData, WageCalculation, DisplayWageEntry } from '../types/wage';
import { Labour } from '../types/labour';
import { ValidationResult } from '../types/common';

export class WageUtils {
  // Wage Calculations
  static calculateProductionWage(productionData: ProductionWageData): WageCalculation {
    const productionWage = (productionData.productionUnits * productionData.wagePer1000Units) / 1000;
    const thappiWage = (productionData.thappiUnits * productionData.wagePerThappi) / 1000;
    const totalWage = productionWage + thappiWage;
    const perLabourWage = totalWage / productionData.labourIDs.length;

    const distributions = productionData.labourIDs.map(labourID => ({
      labourID,
      amount: perLabourWage
    }));

    return {
      totalWage,
      perLabourWage,
      distributions
    };
  }

  static calculateEqualDistribution(totalWage: number, labourIDs: string[]): WageDistribution {
    const perLabourWage = totalWage / labourIDs.length;
    
    return {
      method: 'equal',
      totalWage,
      distributions: labourIDs.map(labourID => ({
        labourID,
        amount: perLabourWage
      }))
    };
  }

  static calculatePercentageDistribution(totalWage: number, distributions: { labourID: string; percentage: number }[]): WageDistribution {
    const totalPercentage = distributions.reduce((sum, dist) => sum + dist.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Percentages must sum to 100%');
    }

    return {
      method: 'percentage',
      totalWage,
      distributions: distributions.map(dist => ({
        labourID: dist.labourID,
        amount: (totalWage * dist.percentage) / 100,
        percentage: dist.percentage
      }))
    };
  }

  static calculateCustomDistribution(distributions: { labourID: string; amount: number }[]): WageDistribution {
    const totalWage = distributions.reduce((sum, dist) => sum + dist.amount, 0);
    
    return {
      method: 'custom',
      totalWage,
      distributions: distributions.map(dist => ({
        labourID: dist.labourID,
        amount: dist.amount
      }))
    };
  }

  // Validation
  static validateWageEntry(wageEntry: Partial<WageEntry>): ValidationResult {
    const errors: string[] = [];

    if (!wageEntry.orgID || wageEntry.orgID.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!wageEntry.labourID || wageEntry.labourID.trim().length === 0) {
      errors.push('Labour ID is required');
    }

    if (!wageEntry.amount || wageEntry.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!wageEntry.description || wageEntry.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!wageEntry.type || !['production', 'overtime', 'bonus', 'penalty', 'adjustment'].includes(wageEntry.type)) {
      errors.push('Valid wage type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateProductionWageData(data: ProductionWageData): ValidationResult {
    const errors: string[] = [];

    if (!data.batchNumber || data.batchNumber.trim().length === 0) {
      errors.push('Batch number is required');
    }

    if (!data.productionUnits || data.productionUnits <= 0) {
      errors.push('Production units must be greater than 0');
    }

    if (data.thappiUnits < 0) {
      errors.push('Thappi units cannot be negative');
    }

    if (!data.wagePer1000Units || data.wagePer1000Units <= 0) {
      errors.push('Wage per 1000 units must be greater than 0');
    }

    if (!data.wagePerThappi || data.wagePerThappi <= 0) {
      errors.push('Wage per thappi must be greater than 0');
    }

    if (!data.labourIDs || data.labourIDs.length === 0) {
      errors.push('At least one labour must be selected');
    }

    if (!data.date) {
      errors.push('Date is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateWageDistribution(distribution: WageDistribution): ValidationResult {
    const errors: string[] = [];

    if (!distribution.totalWage || distribution.totalWage <= 0) {
      errors.push('Total wage must be greater than 0');
    }

    if (!distribution.distributions || distribution.distributions.length === 0) {
      errors.push('At least one distribution is required');
    }

    const totalDistributed = distribution.distributions.reduce((sum, dist) => sum + dist.amount, 0);
    const tolerance = 0.01; // Allow for small rounding differences

    if (Math.abs(totalDistributed - distribution.totalWage) > tolerance) {
      errors.push('Total distributed amount must equal total wage');
    }

    if (distribution.method === 'percentage') {
      const totalPercentage = distribution.distributions.reduce((sum, dist) => sum + (dist.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > tolerance) {
        errors.push('Percentages must sum to 100%');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Display Helpers
  static formatWageForDisplay(wage: WageEntry): DisplayWageEntry {
    return {
      ...wage,
      labourName: 'Unknown Labour', // This would be populated by the service
      formattedAmount: this.formatCurrency(wage.amount),
      formattedDate: this.formatDate(wage.createdAt)
    };
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  static formatAmount(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  // Statistics
  static calculateWageStats(wageEntries: WageEntry[]): {
    totalAmount: number;
    totalEntries: number;
    averageWage: number;
    byType: Record<string, { count: number; total: number }>;
    byLabour: Record<string, { count: number; total: number }>;
  } {
    const totalAmount = wageEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalEntries = wageEntries.length;
    const averageWage = totalEntries > 0 ? totalAmount / totalEntries : 0;

    const byType: Record<string, { count: number; total: number }> = {};
    const byLabour: Record<string, { count: number; total: number }> = {};

    wageEntries.forEach(entry => {
      // By type
      if (!byType[entry.type]) {
        byType[entry.type] = { count: 0, total: 0 };
      }
      byType[entry.type].count++;
      byType[entry.type].total += entry.amount;

      // By labour
      if (!byLabour[entry.labourID]) {
        byLabour[entry.labourID] = { count: 0, total: 0 };
      }
      byLabour[entry.labourID].count++;
      byLabour[entry.labourID].total += entry.amount;
    });

    return {
      totalAmount,
      totalEntries,
      averageWage,
      byType,
      byLabour
    };
  }

  // Filtering and Search
  static filterWageEntries(entries: WageEntry[], filters: {
    labourID?: string;
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): WageEntry[] {
    let filtered = [...entries];

    if (filters.labourID) {
      filtered = filtered.filter(entry => entry.labourID === filters.labourID);
    }

    if (filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(entry => entry.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => entry.createdAt <= filters.dateTo!);
    }

    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(entry => entry.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(entry => entry.amount <= filters.maxAmount!);
    }

    return filtered;
  }

  static searchWageEntries(entries: WageEntry[], searchTerm: string): WageEntry[] {
    if (!searchTerm.trim()) {
      return entries;
    }

    const term = searchTerm.toLowerCase();
    return entries.filter(entry => 
      entry.description.toLowerCase().includes(term) ||
      entry.batchNumber?.toLowerCase().includes(term) ||
      entry.labourID.toLowerCase().includes(term)
    );
  }

  // Sorting
  static sortWageEntries(entries: WageEntry[], sortBy: 'amount' | 'date' | 'type' = 'date', order: 'asc' | 'desc' = 'desc'): WageEntry[] {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  // Data Export
  static exportWageEntriesToCSV(entries: WageEntry[]): string {
    const headers = [
      'ID',
      'Labour ID',
      'Amount',
      'Description',
      'Type',
      'Batch Number',
      'Production Units',
      'Thappi Units',
      'Wage Per 1000 Units',
      'Wage Per Thappi',
      'Created At'
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.labourID,
      entry.amount.toString(),
      entry.description,
      entry.type,
      entry.batchNumber || '',
      entry.productionUnits?.toString() || '',
      entry.thappiUnits?.toString() || '',
      entry.wagePer1000Units?.toString() || '',
      entry.wagePerThappi?.toString() || '',
      entry.createdAt.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Rounding and Precision
  static roundToTwoDecimals(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  static roundToNearestRupee(amount: number): number {
    return Math.round(amount);
  }

  static roundToNearestFive(amount: number): number {
    return Math.round(amount / 5) * 5;
  }

  // Currency Conversion (if needed in future)
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // This is a simplified conversion - in practice, you'd use a real exchange rate API
    return amount * exchangeRate;
  }

  // Validation Helpers
  static isValidAmount(amount: any): boolean {
    return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
  }

  static isValidPercentage(percentage: any): boolean {
    return typeof percentage === 'number' && !isNaN(percentage) && percentage >= 0 && percentage <= 100;
  }

  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }
}
