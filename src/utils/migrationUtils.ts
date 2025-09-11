import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LabourService } from '../services/labourService';
import { LegacyLabour, MigrationResult } from '../types/labour';
import { toast } from 'react-hot-toast';

export class MigrationUtils {
  // Fetch legacy labours from current database
  static async fetchLegacyLabours(orgID: string): Promise<LegacyLabour[]> {
    try {
      const q = query(
        collection(db, 'LABOURS'),
        where('orgID', '==', orgID)
      );
      
      const querySnapshot = await getDocs(q);
      const legacyLabours: LegacyLabour[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        legacyLabours.push({
          id: doc.id,
          ...data
        } as LegacyLabour);
      });
      
      return legacyLabours;
    } catch (error) {
      console.error('Error fetching legacy labours:', error);
      throw new Error(`Failed to fetch legacy labours: ${error.message}`);
    }
  }

  // Migrate individual labours only
  static async migrateIndividualLabours(orgID: string): Promise<MigrationResult> {
    try {
      console.log('Starting migration of individual labours...');
      
      // Fetch legacy labours
      const legacyLabours = await this.fetchLegacyLabours(orgID);
      console.log(`Found ${legacyLabours.length} legacy labours`);
      
      // Filter only individual labours
      const individualLabours = legacyLabours.filter(labour => 
        labour.type === 'individual' || !labour.type
      );
      
      console.log(`Found ${individualLabours.length} individual labours to migrate`);
      
      const migratedLabours: any[] = [];
      const errors: string[] = [];
      
      // Migrate each individual labour
      for (const legacy of individualLabours) {
        try {
          console.log(`Migrating labour: ${legacy.name}`);
          
          const labourData = {
            name: legacy.name,
            gender: legacy.gender || 'Male',
            tags: legacy.tags || ['Production'],
            assignedVehicle: legacy.assignedVehicle || '',
            openingBalance: legacy.openingBalance || 0,
            orgID: legacy.orgID
          };
          
          const newLabour = await LabourService.createLabour(labourData);
          migratedLabours.push(newLabour);
          
          console.log(`Successfully migrated: ${legacy.name} -> ${newLabour.id}`);
        } catch (error) {
          const errorMsg = `Failed to migrate ${legacy.name}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      const result: MigrationResult = {
        success: errors.length === 0,
        migratedCount: migratedLabours.length,
        errors,
        individualLabours: migratedLabours,
        linkedPairs: []
      };
      
      console.log('Migration completed:', result);
      return result;
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  // Migrate all labours (individual + linked pairs)
  static async migrateAllLabours(orgID: string): Promise<MigrationResult> {
    try {
      console.log('Starting migration of all labours...');
      
      // Fetch legacy labours
      const legacyLabours = await this.fetchLegacyLabours(orgID);
      console.log(`Found ${legacyLabours.length} legacy labours`);
      
      // Use the database service migration method
      const { individual, linkedPairs } = await LabourService.migrateLegacyLabours(legacyLabours);
      
      const result: MigrationResult = {
        success: true,
        migratedCount: individual.length + linkedPairs.length,
        errors: [],
        individualLabours: individual,
        linkedPairs: linkedPairs
      };
      
      console.log('Migration completed:', result);
      return result;
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  // Validate migration data
  static validateLegacyData(legacyLabours: LegacyLabour[]): {
    valid: LegacyLabour[];
    invalid: { labour: LegacyLabour; errors: string[] }[];
  } {
    const valid: LegacyLabour[] = [];
    const invalid: { labour: LegacyLabour; errors: string[] }[] = [];
    
    legacyLabours.forEach(labour => {
      const errors: string[] = [];
      
      if (!labour.name || labour.name.trim().length === 0) {
        errors.push('Name is required');
      }
      
      if (!labour.orgID || labour.orgID.trim().length === 0) {
        errors.push('Organization ID is required');
      }
      
      if (labour.type === 'linked_pair') {
        if (!labour.labour1 || !labour.labour2) {
          errors.push('Linked pair must have both labour1 and labour2');
        }
        
        if (labour.labour1 && (!labour.labour1.name || !labour.labour1.labourID)) {
          errors.push('Labour1 must have name and labourID');
        }
        
        if (labour.labour2 && (!labour.labour2.name || !labour.labour2.labourID)) {
          errors.push('Labour2 must have name and labourID');
        }
      }
      
      if (errors.length === 0) {
        valid.push(labour);
      } else {
        invalid.push({ labour, errors });
      }
    });
    
    return { valid, invalid };
  }

  // Create migration report
  static createMigrationReport(result: MigrationResult): string {
    const report = `
# Migration Report

## Summary
- **Status**: ${result.success ? 'SUCCESS' : 'FAILED'}
- **Migrated Count**: ${result.migratedCount}
- **Errors**: ${result.errors.length}

## Individual Labours
- **Count**: ${result.individualLabours.length}
- **Details**: ${result.individualLabours.map(l => `${l.name} (${l.id})`).join(', ')}

## Linked Pairs
- **Count**: ${result.linkedPairs.length}
- **Details**: ${result.linkedPairs.map(p => `Pair ${p.id}: ${p.labour1ID} + ${p.labour2ID}`).join(', ')}

## Errors
${result.errors.length > 0 ? result.errors.map(e => `- ${e}`).join('\n') : 'No errors'}

## Next Steps
1. Verify migrated data in the new system
2. Test all functionality with migrated data
3. Update any hardcoded references to old IDs
4. Clean up old data if migration is successful
    `;
    
    return report;
  }

  // Export migration data for backup
  static exportMigrationData(legacyLabours: LegacyLabour[]): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      count: legacyLabours.length,
      labours: legacyLabours
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Show migration progress
  static showMigrationProgress(current: number, total: number, currentItem: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    
    console.log(`Migration Progress: [${progressBar}] ${percentage}% (${current}/${total})`);
    console.log(`Current: ${currentItem}`);
    
    // Show toast notification for UI
    if (current === total) {
      toast.success(`Migration completed! Migrated ${total} labours.`);
    } else {
      toast.loading(`Migrating ${currentItem}... (${current}/${total})`, { id: 'migration-progress' });
    }
  }

  // Clean up migration progress toast
  static cleanupMigrationProgress(): void {
    toast.dismiss('migration-progress');
  }
}
