import Dexie from 'dexie';

export class PaveBoardDatabase extends Dexie {
  constructor() {
    super('PaveBoardDB');
    
    this.version(1).stores({
      userData: '++id, name, email, lastUpdated'
    });
  }
}

export const db = new PaveBoardDatabase();

// Initialize database
export const initDatabase = async () => {
  try {
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};
