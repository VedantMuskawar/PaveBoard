import { Labour, LinkedPair, DisplayLabour, LabourFilters } from '../types/labour';
import { ValidationResult } from '../types/common';

export class LabourUtils {
  // Data Processing
  static processLabourData(rawData: any): Labour {
    return {
      id: rawData.id || '',
      labourID: rawData.labourID || '',
      orgID: rawData.orgID || '',
      name: rawData.name || '',
      gender: rawData.gender || 'Male',
      status: rawData.status || 'Active',
      tags: Array.isArray(rawData.tags) ? rawData.tags : [],
      assignedVehicle: rawData.assignedVehicle || '',
      currentBalance: Number(rawData.currentBalance) || 0,
      totalEarned: Number(rawData.totalEarned) || 0,
      totalPaid: Number(rawData.totalPaid) || 0,
      openingBalance: Number(rawData.openingBalance) || 0,
      linkedPairID: rawData.linkedPairID || undefined,
      isLinked: Boolean(rawData.isLinked),
      createdAt: rawData.createdAt instanceof Date ? rawData.createdAt : new Date(rawData.createdAt),
      updatedAt: rawData.updatedAt instanceof Date ? rawData.updatedAt : new Date(rawData.updatedAt)
    };
  }

  static processLinkedPairData(rawData: any): LinkedPair {
    return {
      id: rawData.id || '',
      orgID: rawData.orgID || '',
      labour1ID: rawData.labour1ID || '',
      labour2ID: rawData.labour2ID || '',
      status: rawData.status || 'Active',
      sharedBalance: Number(rawData.sharedBalance) || 0,
      createdAt: rawData.createdAt instanceof Date ? rawData.createdAt : new Date(rawData.createdAt),
      updatedAt: rawData.updatedAt instanceof Date ? rawData.updatedAt : new Date(rawData.updatedAt)
    };
  }

  // Validation
  static validateLabourData(labour: Partial<Labour>): ValidationResult {
    const errors: string[] = [];

    if (!labour.name || labour.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!labour.gender || !['Male', 'Female'].includes(labour.gender)) {
      errors.push('Valid gender is required');
    }

    if (!labour.orgID || labour.orgID.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (labour.currentBalance !== undefined && (isNaN(labour.currentBalance) || labour.currentBalance < 0)) {
      errors.push('Current balance must be a non-negative number');
    }

    if (labour.totalEarned !== undefined && (isNaN(labour.totalEarned) || labour.totalEarned < 0)) {
      errors.push('Total earned must be a non-negative number');
    }

    if (labour.totalPaid !== undefined && (isNaN(labour.totalPaid) || labour.totalPaid < 0)) {
      errors.push('Total paid must be a non-negative number');
    }

    if (labour.openingBalance !== undefined && (isNaN(labour.openingBalance) || labour.openingBalance < 0)) {
      errors.push('Opening balance must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLinkedPairData(pair: Partial<LinkedPair>): ValidationResult {
    const errors: string[] = [];

    if (!pair.labour1ID || pair.labour1ID.trim().length === 0) {
      errors.push('Labour 1 ID is required');
    }

    if (!pair.labour2ID || pair.labour2ID.trim().length === 0) {
      errors.push('Labour 2 ID is required');
    }

    if (pair.labour1ID === pair.labour2ID) {
      errors.push('Cannot link a labour to themselves');
    }

    if (!pair.orgID || pair.orgID.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (pair.sharedBalance !== undefined && (isNaN(pair.sharedBalance) || pair.sharedBalance < 0)) {
      errors.push('Shared balance must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Relationship Helpers
  static isLinkedLabour(labour: Labour): boolean {
    return Boolean(labour.isLinked && labour.linkedPairID);
  }

  static getLinkedPartnerName(labour: Labour, linkedPairs: LinkedPair[]): string | undefined {
    if (!labour.isLinked || !labour.linkedPairID) {
      return undefined;
    }

    const linkedPair = linkedPairs.find(pair => pair.id === labour.linkedPairID);
    if (!linkedPair) {
      return undefined;
    }

    // This is a simplified version - in practice, you'd need to fetch the partner's name
    return linkedPair.labour1ID === labour.id ? 'Partner' : 'Partner';
  }

  static canCreateLinkedPair(labour1: Labour, labour2: Labour): ValidationResult {
    const errors: string[] = [];

    if (labour1.id === labour2.id) {
      errors.push('Cannot link a labour to themselves');
    }

    if (labour1.orgID !== labour2.orgID) {
      errors.push('Cannot link labours from different organizations');
    }

    if (labour1.isLinked) {
      errors.push(`${labour1.name} is already linked to another labour`);
    }

    if (labour2.isLinked) {
      errors.push(`${labour2.name} is already linked to another labour`);
    }

    if (labour1.status !== 'Active' || labour2.status !== 'Active') {
      errors.push('Both labours must be active to create a linked pair');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Display Helpers
  static formatLabourForDisplay(labour: Labour, linkedPairs: LinkedPair[] = []): DisplayLabour {
    const displayLabour: DisplayLabour = {
      ...labour,
      isSelected: false,
      linkedPartnerName: this.getLinkedPartnerName(labour, linkedPairs)
    };

    return displayLabour;
  }

  static formatBalanceForDisplay(balance: number): string {
    return `₹${balance.toFixed(2)}`;
  }

  static formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Filtering and Search
  static filterLabours(labours: Labour[], filters: LabourFilters): Labour[] {
    let filtered = [...labours];

    if (filters.status) {
      filtered = filtered.filter(labour => labour.status === filters.status);
    }

    if (filters.isLinked !== undefined) {
      filtered = filtered.filter(labour => labour.isLinked === filters.isLinked);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(labour => 
        filters.tags!.some(tag => labour.tags.includes(tag))
      );
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(labour => 
        labour.name.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  static searchLabours(labours: Labour[], searchTerm: string): Labour[] {
    if (!searchTerm.trim()) {
      return labours;
    }

    const term = searchTerm.toLowerCase();
    return labours.filter(labour => 
      labour.name.toLowerCase().includes(term) ||
      labour.tags.some(tag => tag.toLowerCase().includes(term)) ||
      (labour.assignedVehicle && labour.assignedVehicle.toLowerCase().includes(term))
    );
  }

  // Grouping and Sorting
  static groupLaboursByType(labours: Labour[]): { individual: Labour[], linked: Labour[] } {
    return {
      individual: labours.filter(labour => !labour.isLinked),
      linked: labours.filter(labour => labour.isLinked)
    };
  }

  static groupLaboursByStatus(labours: Labour[]): { active: Labour[], inactive: Labour[] } {
    return {
      active: labours.filter(labour => labour.status === 'Active'),
      inactive: labours.filter(labour => labour.status === 'Inactive')
    };
  }

  static sortLabours(labours: Labour[], sortBy: 'name' | 'balance' | 'createdAt' = 'name', order: 'asc' | 'desc' = 'asc'): Labour[] {
    const sorted = [...labours].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'balance':
          comparison = a.currentBalance - b.currentBalance;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          comparison = 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  // Statistics
  static calculateLabourStats(labours: Labour[]): {
    total: number;
    active: number;
    inactive: number;
    linked: number;
    individual: number;
    totalBalance: number;
    averageBalance: number;
  } {
    const active = labours.filter(l => l.status === 'Active').length;
    const inactive = labours.filter(l => l.status === 'Inactive').length;
    const linked = labours.filter(l => l.isLinked).length;
    const individual = labours.filter(l => !l.isLinked).length;
    const totalBalance = labours.reduce((sum, l) => sum + l.currentBalance, 0);
    const averageBalance = labours.length > 0 ? totalBalance / labours.length : 0;

    return {
      total: labours.length,
      active,
      inactive,
      linked,
      individual,
      totalBalance,
      averageBalance
    };
  }

  // Data Export
  static exportLaboursToCSV(labours: Labour[]): string {
    const headers = [
      'ID',
      'Name',
      'Gender',
      'Status',
      'Tags',
      'Assigned Vehicle',
      'Current Balance',
      'Total Earned',
      'Total Paid',
      'Opening Balance',
      'Is Linked',
      'Linked Pair ID',
      'Created At',
      'Updated At'
    ];

    const rows = labours.map(labour => [
      labour.id,
      labour.name,
      labour.gender,
      labour.status,
      labour.tags.join(', '),
      labour.assignedVehicle || '',
      labour.currentBalance.toString(),
      labour.totalEarned.toString(),
      labour.totalPaid.toString(),
      labour.openingBalance.toString(),
      labour.isLinked ? 'Yes' : 'No',
      labour.linkedPairID || '',
      labour.createdAt.toISOString(),
      labour.updatedAt.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // ID Generation
  static generateLabourID(): string {
    // Generate 6-digit number (000000-999999) to match existing format L349635
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `L${random}`;
  }

  static generateLinkedPairID(): string {
    // Generate 6-digit number (000000-999999) to match existing format
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `P${random}`;
  }
}
