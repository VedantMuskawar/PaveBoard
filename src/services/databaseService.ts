import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  runTransaction,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Labour, LinkedPair, LabourFilters } from '../types/labour';
import { WageEntry, WageFilters } from '../types/wage';
import { DatabaseError } from '../types/common';

export class DatabaseService {
  // Labour Collection Operations
  static async createLabour(labourData: Omit<Labour, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Creating LABOURS document
      const docRef = await addDoc(collection(db, 'LABOURS'), {
        ...labourData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // LABOURS document created successfully
      return docRef.id;
    } catch (error) {
      // Error creating LABOURS document
      throw new DatabaseError(`Failed to create labour: ${error.message}`, 'CREATE_LABOUR');
    }
  }

  static async getLabour(labourID: string): Promise<Labour | null> {
    try {
      const docRef = doc(db, 'LABOURS', labourID);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Labour;
    } catch (error) {
      throw new DatabaseError(`Failed to get labour: ${error.message}`, 'GET_LABOUR');
    }
  }

  static async getLabourByLabourID(labourID: string): Promise<Labour | null> {
    try {
      // Searching for labour with labourID
      const q = query(collection(db, 'LABOURS'), where('labourID', '==', labourID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // No labour found with labourID
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      // Found labour with labourID
      
      return {
        id: doc.id,
        ...doc.data()
      } as Labour;
    } catch (error) {
      // Error searching for labour by labourID
      throw new DatabaseError(`Failed to get labour by labourID: ${error.message}`, 'GET_LABOUR_BY_LABOUR_ID');
    }
  }

  static async updateLabour(labourID: string, updates: Partial<Labour>): Promise<void> {
    try {
      const docRef = doc(db, 'LABOURS', labourID);
      
      // Filter out undefined values and prepare update data
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // Add defined fields to update data
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Labour];
        if (value !== undefined) {
          updateData[key] = value;
        }
      });
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      throw new DatabaseError(`Failed to update labour: ${error.message}`, 'UPDATE_LABOUR');
    }
  }

  static async deleteLabour(labourID: string): Promise<void> {
    try {
      const docRef = doc(db, 'LABOURS', labourID);
      await deleteDoc(docRef);
    } catch (error) {
      throw new DatabaseError(`Failed to delete labour: ${error.message}`, 'DELETE_LABOUR');
    }
  }

  static async getLabours(filters?: LabourFilters): Promise<Labour[]> {
    try {
      // Use a simple query to avoid index requirements
      let q = query(collection(db, 'LABOURS'));
      
      // Only filter by orgID to avoid complex index requirements
      if (filters?.orgID) {
        q = query(q, where('orgID', '==', filters.orgID));
      }
      
      const querySnapshot = await getDocs(q);
      const labours: Labour[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        labours.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        } as Labour);
      });
      
      // Apply filters in memory to avoid complex queries
      let filteredLabours = labours;
      
      if (filters?.status) {
        filteredLabours = filteredLabours.filter(labour => labour.status === filters.status);
      }
      
      if (filters?.isLinked !== undefined) {
        filteredLabours = filteredLabours.filter(labour => labour.isLinked === filters.isLinked);
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        filteredLabours = filteredLabours.filter(labour => 
          filters.tags!.some(tag => labour.tags.includes(tag))
        );
      }
      
      if (filters?.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredLabours = filteredLabours.filter(labour => 
          labour.name.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by createdAt in memory
      filteredLabours.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return filteredLabours;
    } catch (error) {
      throw new DatabaseError(`Failed to get labours: ${error.message}`, 'GET_LABOURS');
    }
  }

  // Linked Pairs Collection Operations
  static async createLinkedPair(pairData: Omit<LinkedPair, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Creating LINKED_PAIRS document
      
      const docRef = await addDoc(collection(db, 'LINKED_PAIRS'), {
        ...pairData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("✅ LINKED_PAIRS document created with ID:", docRef.id);
      console.log("✅ Document path:", docRef.path);
      
      // Verify the document was created by trying to read it back
      const verifyDoc = await getDoc(docRef);
      console.log("🔍 Verification - Document exists:", verifyDoc.exists());
      console.log("🔍 Verification - Document data:", verifyDoc.data());
      
      return docRef.id;
    } catch (error) {
      console.log("❌ Error creating LINKED_PAIRS document:", error);
      console.log("❌ Error details:", error.message);
      console.log("❌ Error code:", error.code);
      throw new DatabaseError(`Failed to create linked pair: ${error.message}`, 'CREATE_LINKED_PAIR');
    }
  }

  static async getLinkedPair(pairID: string): Promise<LinkedPair | null> {
    try {
      const docRef = doc(db, 'LINKED_PAIRS', pairID);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as LinkedPair;
    } catch (error) {
      throw new DatabaseError(`Failed to get linked pair: ${error.message}`, 'GET_LINKED_PAIR');
    }
  }

  static async updateLinkedPair(pairID: string, updates: Partial<LinkedPair>): Promise<void> {
    try {
      const docRef = doc(db, 'LINKED_PAIRS', pairID);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update linked pair: ${error.message}`, 'UPDATE_LINKED_PAIR');
    }
  }

  static async deleteLinkedPair(pairID: string): Promise<void> {
    try {
      const docRef = doc(db, 'LINKED_PAIRS', pairID);
      await deleteDoc(docRef);
    } catch (error) {
      throw new DatabaseError(`Failed to delete linked pair: ${error.message}`, 'DELETE_LINKED_PAIR');
    }
  }

  // Wage Entries Collection Operations
  static async createWageEntry(wageData: Omit<WageEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'WAGE_ENTRIES'), {
        ...wageData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      throw new DatabaseError(`Failed to create wage entry: ${error.message}`, 'CREATE_WAGE_ENTRY');
    }
  }

  static async getWageEntries(filters?: WageFilters): Promise<WageEntry[]> {
    try {
      let q = query(collection(db, 'WAGE_ENTRIES'));
      
      if (filters?.orgID) {
        q = query(q, where('orgID', '==', filters.orgID));
      }
      
      if (filters?.labourID) {
        q = query(q, where('labourID', '==', filters.labourID));
      }
      
      if (filters?.type) {
        q = query(q, where('type', '==', filters.type));
      }
      
      if (filters?.dateFrom) {
        q = query(q, where('createdAt', '>=', filters.dateFrom));
      }
      
      if (filters?.dateTo) {
        q = query(q, where('createdAt', '<=', filters.dateTo));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const wageEntries: WageEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        wageEntries.push({
          id: doc.id,
          ...doc.data()
        } as WageEntry);
      });
      
      return wageEntries;
    } catch (error) {
      throw new DatabaseError(`Failed to get wage entries: ${error.message}`, 'GET_WAGE_ENTRIES');
    }
  }

  // Debug Operations
  static async listAllCollections(): Promise<void> {
    try {
      console.log("🔍 Listing all collections...");
      const collections = ['LABOURS', 'LINKED_PAIRS', 'WAGE_ENTRIES', 'ADMIN_LOGS'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          console.log(`📁 Collection ${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`❌ Collection ${collectionName}: Error - ${error.message}`);
        }
      }
    } catch (error) {
      console.log("❌ Error listing collections:", error);
    }
  }

  // Transaction Operations
  static async updateLabourBalance(labourID: string, amount: number): Promise<void> {
    try {
      const docRef = doc(db, 'LABOURS', labourID);
      await updateDoc(docRef, {
        currentBalance: increment(amount),
        totalEarned: increment(amount),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update labour balance: ${error.message}`, 'UPDATE_BALANCE');
    }
  }

  static async updateSharedBalance(pairID: string, amount: number): Promise<void> {
    try {
      const docRef = doc(db, 'LINKED_PAIRS', pairID);
      await updateDoc(docRef, {
        sharedBalance: increment(amount),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update shared balance: ${error.message}`, 'UPDATE_SHARED_BALANCE');
    }
  }

  // Migration Operations
  static async migrateLegacyLabours(legacyLabours: any[]): Promise<{ individual: Labour[], linkedPairs: LinkedPair[] }> {
    try {
      const individualLabours: Labour[] = [];
      const linkedPairs: LinkedPair[] = [];
      
      for (const legacy of legacyLabours) {
        if (legacy.type === 'individual') {
          // Migrate individual labour
          const labour: Labour = {
            id: legacy.id,
            labourID: legacy.labourID || legacy.id, // Use existing labourID or fallback to id
            orgID: legacy.orgID,
            name: legacy.name,
            gender: legacy.gender as 'Male' | 'Female',
            status: legacy.status as 'Active' | 'Inactive',
            tags: legacy.tags || [],
            assignedVehicle: legacy.assignedVehicle,
            currentBalance: legacy.currentBalance || 0,
            totalEarned: legacy.totalEarned || 0,
            totalPaid: legacy.totalPaid || 0,
            openingBalance: legacy.openingBalance || 0,
            isLinked: false,
            createdAt: legacy.createdAt || new Date(),
            updatedAt: legacy.updatedAt || new Date()
          };
          individualLabours.push(labour);
        } else if (legacy.type === 'linked_pair') {
          // Migrate linked pair - create individual labours first
          const labour1: Labour = {
            id: `${legacy.id}_labour1`,
            labourID: legacy.labour1.labourID || `${legacy.id}_labour1`,
            orgID: legacy.orgID,
            name: legacy.labour1.name,
            gender: legacy.labour1.gender as 'Male' | 'Female',
            status: legacy.status as 'Active' | 'Inactive',
            tags: legacy.labour1.tags || [],
            assignedVehicle: legacy.labour1.assignedVehicle,
            currentBalance: 0, // Will be set after creating linked pair
            totalEarned: 0,
            totalPaid: 0,
            openingBalance: 0,
            isLinked: true,
            createdAt: legacy.createdAt || new Date(),
            updatedAt: legacy.updatedAt || new Date()
          };
          
          const labour2: Labour = {
            id: `${legacy.id}_labour2`,
            labourID: legacy.labour2.labourID || `${legacy.id}_labour2`,
            orgID: legacy.orgID,
            name: legacy.labour2.name,
            gender: legacy.labour2.gender as 'Male' | 'Female',
            status: legacy.status as 'Active' | 'Inactive',
            tags: legacy.labour2.tags || [],
            assignedVehicle: legacy.labour2.assignedVehicle,
            currentBalance: 0, // Will be set after creating linked pair
            totalEarned: 0,
            totalPaid: 0,
            openingBalance: 0,
            isLinked: true,
            createdAt: legacy.createdAt || new Date(),
            updatedAt: legacy.updatedAt || new Date()
          };
          
          individualLabours.push(labour1, labour2);
          
          // Create linked pair
          const linkedPair: LinkedPair = {
            id: legacy.id,
            orgID: legacy.orgID,
            labour1ID: labour1.id,
            labour2ID: labour2.id,
            status: legacy.status as 'Active' | 'Inactive',
            sharedBalance: legacy.sharedBalance?.currentBalance || 0,
            createdAt: legacy.createdAt || new Date(),
            updatedAt: legacy.updatedAt || new Date()
          };
          
          linkedPairs.push(linkedPair);
        }
      }
      
      return { individual: individualLabours, linkedPairs };
    } catch (error) {
      throw new DatabaseError(`Failed to migrate legacy labours: ${error.message}`, 'MIGRATE_LABOURS');
    }
  }
}
