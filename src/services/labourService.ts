import { DatabaseService } from './databaseService';
import { Labour, LinkedPair, LabourCreateData, LabourUpdateData, LabourFilters, DisplayLabour } from '../types/labour';
import { ValidationResult, LabourError } from '../types/common';
import { LabourUtils } from '../utils/labourUtils';

export class LabourService {
  // Core CRUD Operations
  static async createLabour(labourData: LabourCreateData): Promise<Labour> {
    try {
      // Validate input data
      const validation = this.validateLabourData(labourData);
      if (!validation.isValid) {
        throw new LabourError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate human-readable labour ID
      const generatedLabourID = LabourUtils.generateLabourID();
      
      // Create labour document
      const labourID = await DatabaseService.createLabour({
        labourID: generatedLabourID,
        orgID: labourData.orgID,
        name: labourData.name,
        gender: labourData.gender,
        status: 'Active',
        tags: labourData.tags,
        assignedVehicle: labourData.assignedVehicle,
        currentBalance: labourData.openingBalance || 0,
        totalEarned: 0,
        totalPaid: 0,
        openingBalance: labourData.openingBalance || 0,
        isLinked: false
      });

      console.log("🔍 Created labour with ID:", labourID);

      // Return created labour
      const createdLabour = await DatabaseService.getLabour(labourID);
      if (!createdLabour) {
        throw new LabourError('Failed to retrieve created labour');
      }

      console.log("✅ Retrieved created labour:", createdLabour);
      return createdLabour;
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to create labour: ${error.message}`);
    }
  }

  static async getLabour(labourID: string): Promise<Labour | null> {
    try {
      return await DatabaseService.getLabour(labourID);
    } catch (error) {
      throw new LabourError(`Failed to get labour: ${error.message}`);
    }
  }

  static async getLabourByLabourID(labourID: string): Promise<Labour | null> {
    try {
      return await DatabaseService.getLabourByLabourID(labourID);
    } catch (error) {
      throw new LabourError(`Failed to get labour by labourID: ${error.message}`);
    }
  }

  static async updateLabour(labourID: string, updates: LabourUpdateData): Promise<void> {
    try {
      // Validate updates
      const validation = this.validateLabourUpdate(updates);
      if (!validation.isValid) {
        throw new LabourError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      await DatabaseService.updateLabour(labourID, updates);
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to update labour: ${error.message}`);
    }
  }

  static async deleteLabour(labourID: string): Promise<void> {
    try {
      // Check if labour is linked
      const labour = await DatabaseService.getLabour(labourID);
      if (!labour) {
        throw new LabourError('Labour not found');
      }

      if (labour.isLinked) {
        throw new LabourError('Cannot delete linked labour. Please dissolve the linked pair first.');
      }

      await DatabaseService.deleteLabour(labourID);
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to delete labour: ${error.message}`);
    }
  }

  static async getLabours(filters?: LabourFilters): Promise<Labour[]> {
    try {
      return await DatabaseService.getLabours(filters);
    } catch (error) {
      throw new LabourError(`Failed to get labours: ${error.message}`);
    }
  }

  // Financial Operations
  static async updateBalance(labourID: string, amount: number, reason?: string): Promise<void> {
    try {
      const labour = await DatabaseService.getLabour(labourID);
      if (!labour) {
        throw new LabourError('Labour not found');
      }

      if (labour.isLinked) {
        // Update shared balance
        await DatabaseService.updateSharedBalance(labour.linkedPairID!, amount);
      } else {
        // Update individual balance
        await DatabaseService.updateLabourBalance(labourID, amount);
      }
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to update balance: ${error.message}`);
    }
  }

  // Relationship Management
  static async createLinkedPair(labour1ID: string, labour2ID: string): Promise<string> {
    try {
      console.log("🔗 Creating linked pair with IDs:", labour1ID, labour2ID);
      
      // Validate both labours exist and are not already linked
      const [labour1, labour2] = await Promise.all([
        DatabaseService.getLabour(labour1ID),
        DatabaseService.getLabour(labour2ID)
      ]);

      console.log("🔍 Retrieved labours:", { labour1: labour1?.name, labour2: labour2?.name });

      if (!labour1 || !labour2) {
        console.log("❌ One or both labours not found");
        throw new LabourError('One or both labours not found');
      }

      if (labour1.isLinked || labour2.isLinked) {
        console.log("❌ One or both labours are already linked");
        throw new LabourError('One or both labours are already linked');
      }

      if (labour1ID === labour2ID) {
        console.log("❌ Cannot link a labour to themselves");
        throw new LabourError('Cannot link a labour to themselves');
      }

      if (labour1.orgID !== labour2.orgID) {
        console.log("❌ Cannot link labours from different organizations");
        throw new LabourError('Cannot link labours from different organizations');
      }

      // Create linked pair
      console.log("🔗 Creating linked pair document...");
      const pairID = await DatabaseService.createLinkedPair({
        orgID: labour1.orgID,
        labour1ID: labour1ID,
        labour2ID: labour2ID,
        status: 'Active',
        sharedBalance: labour1.currentBalance + labour2.currentBalance
      });

      console.log("✅ Linked pair created with ID:", pairID);

      // Update both labours to mark them as linked
      console.log("🔄 Updating labour records...");
      await Promise.all([
        DatabaseService.updateLabour(labour1ID, { 
          linkedPairID: pairID, 
          isLinked: true,
          currentBalance: 0 // Individual balance becomes 0, shared balance is used
        }),
        DatabaseService.updateLabour(labour2ID, { 
          linkedPairID: pairID, 
          isLinked: true,
          currentBalance: 0 // Individual balance becomes 0, shared balance is used
        })
      ]);

      console.log("✅ Linked pair creation completed");
      return pairID;
    } catch (error) {
      console.log("❌ Error in createLinkedPair:", error);
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to create linked pair: ${error.message}`);
    }
  }

  static async getLinkedPair(pairID: string): Promise<LinkedPair | null> {
    try {
      return await DatabaseService.getLinkedPair(pairID);
    } catch (error) {
      throw new LabourError(`Failed to get linked pair: ${error.message}`);
    }
  }

  static async dissolveLinkedPair(pairID: string): Promise<void> {
    try {
      const linkedPair = await DatabaseService.getLinkedPair(pairID);
      if (!linkedPair) {
        throw new LabourError('Linked pair not found');
      }

      // Get both labours
      const [labour1, labour2] = await Promise.all([
        DatabaseService.getLabour(linkedPair.labour1ID),
        DatabaseService.getLabour(linkedPair.labour2ID)
      ]);

      if (!labour1 || !labour2) {
        throw new LabourError('One or both labours in the linked pair not found');
      }

      // Distribute shared balance equally between both labours
      const individualBalance = linkedPair.sharedBalance / 2;

      // Update both labours to be individual again
      await Promise.all([
        DatabaseService.updateLabour(linkedPair.labour1ID, {
          isLinked: false,
          currentBalance: individualBalance
        }),
        DatabaseService.updateLabour(linkedPair.labour2ID, {
          isLinked: false,
          currentBalance: individualBalance
        })
      ]);

      // Delete the linked pair document
      await DatabaseService.deleteLinkedPair(pairID);
    } catch (error) {
      if (error instanceof LabourError) {
        throw error;
      }
      throw new LabourError(`Failed to dissolve linked pair: ${error.message}`);
    }
  }

  // Utility Methods
  static async getLinkedPartner(labourID: string): Promise<Labour | null> {
    try {
      const labour = await DatabaseService.getLabour(labourID);
      if (!labour || !labour.isLinked) {
        return null;
      }

      const linkedPair = await DatabaseService.getLinkedPair(labour.linkedPairID!);
      if (!linkedPair) {
        return null;
      }

      const partnerID = linkedPair.labour1ID === labourID ? linkedPair.labour2ID : linkedPair.labour1ID;
      return await DatabaseService.getLabour(partnerID);
    } catch (error) {
      throw new LabourError(`Failed to get linked partner: ${error.message}`);
    }
  }

  static async getLinkedPairMembers(pairID: string): Promise<Labour[]> {
    try {
      const linkedPair = await DatabaseService.getLinkedPair(pairID);
      if (!linkedPair) {
        return [];
      }

      const [labour1, labour2] = await Promise.all([
        DatabaseService.getLabour(linkedPair.labour1ID),
        DatabaseService.getLabour(linkedPair.labour2ID)
      ]);

      return [labour1, labour2].filter(Boolean) as Labour[];
    } catch (error) {
      throw new LabourError(`Failed to get linked pair members: ${error.message}`);
    }
  }

  // Display Helpers
  static async formatLabourForDisplay(labour: Labour): Promise<DisplayLabour> {
    try {
      const displayLabour: DisplayLabour = {
        ...labour,
        isSelected: false
      };

      if (labour.isLinked) {
        const partner = await this.getLinkedPartner(labour.id);
        if (partner) {
          displayLabour.linkedPartnerName = partner.name;
        }
      }

      return displayLabour;
    } catch (error) {
      throw new LabourError(`Failed to format labour for display: ${error.message}`);
    }
  }

  // Validation Methods
  static validateLabourData(data: LabourCreateData): ValidationResult {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!data.gender || !['Male', 'Female'].includes(data.gender)) {
      errors.push('Valid gender is required');
    }

    if (!data.orgID || data.orgID.trim().length === 0) {
      errors.push('Organization ID is required');
    }

    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    }

    if (data.openingBalance && (isNaN(data.openingBalance) || data.openingBalance < 0)) {
      errors.push('Opening balance must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLabourUpdate(data: LabourUpdateData): ValidationResult {
    const errors: string[] = [];

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push('Name cannot be empty');
    }

    if (data.gender !== undefined && !['Male', 'Female'].includes(data.gender)) {
      errors.push('Invalid gender');
    }

    if (data.status !== undefined && !['Active', 'Inactive'].includes(data.status)) {
      errors.push('Invalid status');
    }

    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    }

    if (data.currentBalance !== undefined && (isNaN(data.currentBalance) || data.currentBalance < 0)) {
      errors.push('Current balance must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Migration Methods
  static async migrateLegacyLabours(legacyLabours: any[]): Promise<{ individual: Labour[], linkedPairs: LinkedPair[] }> {
    try {
      return await DatabaseService.migrateLegacyLabours(legacyLabours);
    } catch (error) {
      throw new LabourError(`Failed to migrate legacy labours: ${error.message}`);
    }
  }
}
