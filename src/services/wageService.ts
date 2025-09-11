import { DatabaseService } from './databaseService';
import { LabourService } from './labourService';
import { WageEntry, WageDistribution, ProductionWageData, WageCalculation, WageFilters, DisplayWageEntry } from '../types/wage';
import { Labour } from '../types/labour';
import { ValidationResult, LabourError } from '../types/common';

export class WageService {
  // Wage Distribution
  static async distributeWage(totalWage: number, labourIDs: string[]): Promise<WageEntry[]> {
    try {
      if (labourIDs.length === 0) {
        throw new LabourError('No labours selected for wage distribution');
      }

      if (totalWage <= 0) {
        throw new LabourError('Total wage must be greater than 0');
      }

      // Get all labours
      const labours = await Promise.all(
        labourIDs.map(id => LabourService.getLabourByLabourID(id))
      );

      const validLabours = labours.filter(Boolean) as Labour[];
      
      if (validLabours.length !== labourIDs.length) {
        throw new LabourError('Some selected labours were not found');
      }

      // Group labours by relationship type
      const individualLabours = validLabours.filter(l => !l.isLinked);
      const linkedPairs = new Map<string, Labour[]>();

      validLabours.filter(l => l.isLinked).forEach(labour => {
        const pairID = labour.linkedPairID!;
        if (!linkedPairs.has(pairID)) {
          linkedPairs.set(pairID, []);
        }
        linkedPairs.get(pairID)!.push(labour);
      });

      const wageEntries: WageEntry[] = [];
      const perLabourWage = totalWage / labourIDs.length;

      // Process individual labours
      for (const labour of individualLabours) {
        const wageEntry = await this.createWageEntry({
          orgID: labour.orgID,
          labourID: labour.id,
          amount: perLabourWage,
          description: `Individual wage payment`,
          type: 'production',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        wageEntries.push(wageEntry);
      }

      // Process linked pairs
      for (const [pairID, pairLabours] of linkedPairs) {
        const pairWage = perLabourWage * pairLabours.length;
        
        // Create wage entries for each labour in the pair
        for (const labour of pairLabours) {
          const wageEntry = await this.createWageEntry({
            orgID: labour.orgID,
            labourID: labour.id,
            amount: perLabourWage,
            description: `Linked pair wage payment (shared)`,
            type: 'production',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          wageEntries.push(wageEntry);
        }
      }

      return wageEntries;
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to distribute wage: ${error.message}`);
    }
  }

  static async distributeWageWithCustomAmounts(distributions: { labourID: string; amount: number }[]): Promise<WageEntry[]> {
    try {
      if (distributions.length === 0) {
        throw new LabourError('No wage distributions provided');
      }

      const wageEntries: WageEntry[] = [];

      for (const distribution of distributions) {
        const labour = await LabourService.getLabourByLabourID(distribution.labourID);
        if (!labour) {
          throw new LabourError(`Labour not found: ${distribution.labourID}`);
        }

        if (distribution.amount <= 0) {
          throw new LabourError(`Invalid wage amount for labour ${labour.name}: ${distribution.amount}`);
        }

        const wageEntry = await this.createWageEntry({
          orgID: labour.orgID,
          labourID: distribution.labourID,
          amount: distribution.amount,
          description: `Production wage payment`,
          type: 'production',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        wageEntries.push(wageEntry);
      }

      return wageEntries;
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to distribute wage with custom amounts: ${error.message}`);
    }
  }

  // Production Wage Calculation
  static calculateProductionWage(data: ProductionWageData): WageCalculation {
    try {
      const productionWage = (data.productionUnits * data.wagePer1000Units) / 1000;
      const thappiWage = (data.thappiUnits * data.wagePerThappi) / 1000;
      const totalWage = productionWage + thappiWage;
      const perLabourWage = totalWage / data.labourIDs.length;

      const distributions = data.labourIDs.map(labourID => ({
        labourID,
        amount: perLabourWage
      }));

      return {
        totalWage,
        perLabourWage,
        distributions
      };
    } catch (error) {
      throw new LabourError(`Failed to calculate production wage: ${error.message}`);
    }
  }

  // Wage Entry Management
  static async createWageEntry(wageData: Omit<WageEntry, 'id'>): Promise<WageEntry> {
    try {
      const validation = this.validateWageEntry(wageData);
      if (!validation.isValid) {
        throw new LabourError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const wageID = await DatabaseService.createWageEntry(wageData);
      const createdEntry = await this.getWageEntry(wageID);
      
      if (!createdEntry) {
        throw new LabourError('Failed to retrieve created wage entry');
      }

      return createdEntry;
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to create wage entry: ${error.message}`);
    }
  }

  static async getWageEntry(wageID: string): Promise<WageEntry | null> {
    try {
      const wageEntries = await DatabaseService.getWageEntries({ orgID: '' }); // This needs to be fixed
      return wageEntries.find(entry => entry.id === wageID) || null;
    } catch (error) {
      throw new LabourError(`Failed to get wage entry: ${error.message}`);
    }
  }

  static async getWageEntries(filters?: WageFilters): Promise<WageEntry[]> {
    try {
      return await DatabaseService.getWageEntries(filters);
    } catch (error) {
      throw new LabourError(`Failed to get wage entries: ${error.message}`);
    }
  }

  // Balance Updates
  static async processWagePayment(wageEntries: WageEntry[]): Promise<void> {
    try {
      if (wageEntries.length === 0) {
        throw new LabourError('No wage entries to process');
      }

      // Group wage entries by labour
      const labourWages = new Map<string, number>();
      
      for (const entry of wageEntries) {
        const currentAmount = labourWages.get(entry.labourID) || 0;
        labourWages.set(entry.labourID, currentAmount + entry.amount);
      }

      // Update balances for each labour
      for (const [labourID, totalAmount] of labourWages) {
        await LabourService.updateBalance(labourID, totalAmount, 'Wage payment');
      }
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to process wage payment: ${error.message}`);
    }
  }

  static async reverseWageEntry(wageEntryID: string): Promise<void> {
    try {
      const wageEntry = await this.getWageEntry(wageEntryID);
      if (!wageEntry) {
        throw new LabourError('Wage entry not found');
      }

      // Reverse the balance update
      await LabourService.updateBalance(wageEntry.labourID, -wageEntry.amount, 'Wage reversal');

      // Delete the wage entry
      // Note: This would need to be implemented in DatabaseService
      // await DatabaseService.deleteWageEntry(wageEntryID);
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to reverse wage entry: ${error.message}`);
    }
  }

  // Display Helpers
  static async formatWageEntryForDisplay(wageEntry: WageEntry): Promise<DisplayWageEntry> {
    try {
      const labour = await LabourService.getLabour(wageEntry.labourID);
      const labourName = labour ? labour.name : 'Unknown Labour';

      return {
        ...wageEntry,
        labourName,
        formattedAmount: `₹${wageEntry.amount.toFixed(2)}`,
        formattedDate: wageEntry.createdAt.toLocaleDateString()
      };
    } catch (error) {
      throw new LabourError(`Failed to format wage entry for display: ${error.message}`);
    }
  }

  // Validation Methods
  static validateWageEntry(data: Omit<WageEntry, 'id'>): ValidationResult {
    const errors: string[] = [];

    if (!data.orgID || data.orgID.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!data.labourID || data.labourID.trim().length === 0) {
      errors.push('Labour ID is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!data.type || !['production', 'overtime', 'bonus', 'penalty', 'adjustment'].includes(data.type)) {
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

  // Utility Methods
  static async getLabourWageSummary(labourID: string, dateRange?: { from: Date; to: Date }): Promise<{
    totalEarned: number;
    totalEntries: number;
    averageWage: number;
    lastPaymentDate?: Date;
  }> {
    try {
      const filters: WageFilters = { labourID };
      if (dateRange) {
        filters.dateFrom = dateRange.from;
        filters.dateTo = dateRange.to;
      }

      const wageEntries = await this.getWageEntries(filters);
      
      const totalEarned = wageEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const totalEntries = wageEntries.length;
      const averageWage = totalEntries > 0 ? totalEarned / totalEntries : 0;
      const lastPaymentDate = wageEntries.length > 0 
        ? new Date(Math.max(...wageEntries.map(e => e.createdAt.getTime())))
        : undefined;

      return {
        totalEarned,
        totalEntries,
        averageWage,
        lastPaymentDate
      };
    } catch (error) {
      throw new LabourError(`Failed to get labour wage summary: ${error.message}`);
    }
  }
}
