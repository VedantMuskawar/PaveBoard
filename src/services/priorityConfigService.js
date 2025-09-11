import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * PRIORITY_CONFIG Service
 * Manages priority configuration settings for organizations
 */

// Default priority configuration
export const DEFAULT_PRIORITY_CONFIG = {
  timeBased: {
    enabled: true,
    urgentDays: 1,      // ≤1 day = 30 points
    normalDays: 3,      // 2-3 days = 20 points
    lowDays: 7,         // 4-7 days = 10 points
    maxPoints: 30
  },
  valueBased: {
    enabled: true,
    highValue: 10000,   // ≥₹10k = 25 points
    mediumValue: 5000,  // ₹5k-10k = 15 points
    lowValue: 1000,     // ₹1k-5k = 10 points
    maxPoints: 25
  },
  vehicleBased: {
    enabled: true,
    maxPoints: 20,
    vehicleEfficiency: {
      "TRACTOR": { tripsPerDay: 4, capacity: 1000, priorityMultiplier: 1.2 },
      "TRUCK": { tripsPerDay: 2, capacity: 2000, priorityMultiplier: 1.0 },
      "MINI_TRUCK": { tripsPerDay: 6, capacity: 500, priorityMultiplier: 0.8 }
    }
  },
  orderCountBased: {
    enabled: true,
    highCount: 100,     // ≥100 = 15 points
    mediumCount: 50,    // 50-99 = 10 points
    lowCount: 10,       // 10-49 = 5 points
    maxPoints: 15
  },
  regionBased: {
    enabled: true,
    maxPoints: 10,
    highPriorityRegions: ["Mumbai", "Delhi", "Bangalore"],
    mediumPriorityRegions: ["Pune", "Chennai", "Hyderabad"],
    lowPriorityRegions: ["Other"]
  },
  clientBased: {
    enabled: true,
    maxPoints: 15,
    vipClients: [],
    regularClients: [],
    newClients: []
  }
};

/**
 * Get priority configuration for organization
 */
export const getPriorityConfig = async (orgId) => {
  try {
    const configQuery = query(
      collection(db, "PRIORITY_CONFIG"),
      where("orgID", "==", orgId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const configSnapshot = await getDocs(configQuery);
    
    if (configSnapshot.docs.length > 0) {
      const config = configSnapshot.docs[0].data();
      console.log("📋 Priority config loaded for org:", orgId);
      return config;
    } else {
      console.log("📋 Using default priority config for org:", orgId);
      return DEFAULT_PRIORITY_CONFIG;
    }
  } catch (error) {
    console.error("❌ Error getting priority config:", error);
    return DEFAULT_PRIORITY_CONFIG;
  }
};

/**
 * Save priority configuration for organization
 */
export const savePriorityConfig = async (orgId, config, userId) => {
  try {
    // First, deactivate existing active configs
    const existingConfigsQuery = query(
      collection(db, "PRIORITY_CONFIG"),
      where("orgID", "==", orgId),
      where("isActive", "==", true)
    );
    const existingConfigsSnapshot = await getDocs(existingConfigsQuery);
    
    // Deactivate existing configs
    const deactivatePromises = existingConfigsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isActive: false, updatedAt: new Date() })
    );
    await Promise.all(deactivatePromises);
    
    // Create new active config
    const newConfig = {
      orgID: orgId,
      configName: config.configName || "Priority Configuration",
      isActive: true,
      ...config,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    const docRef = await addDoc(collection(db, "PRIORITY_CONFIG"), newConfig);
    console.log("✅ Priority config saved:", docRef.id);
    
    return { success: true, configId: docRef.id };
  } catch (error) {
    console.error("❌ Error saving priority config:", error);
    throw error;
  }
};

/**
 * Get all priority configurations for organization (including inactive)
 */
export const getAllPriorityConfigs = async (orgId) => {
  try {
    const configsQuery = query(
      collection(db, "PRIORITY_CONFIG"),
      where("orgID", "==", orgId),
      orderBy("createdAt", "desc")
    );
    const configsSnapshot = await getDocs(configsQuery);
    
    const configs = configsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log("📋 All priority configs loaded:", configs.length);
    return configs;
  } catch (error) {
    console.error("❌ Error getting all priority configs:", error);
    throw error;
  }
};

/**
 * Activate a specific priority configuration
 */
export const activatePriorityConfig = async (configId, orgId, userId) => {
  try {
    // Deactivate all existing active configs
    const existingConfigsQuery = query(
      collection(db, "PRIORITY_CONFIG"),
      where("orgID", "==", orgId),
      where("isActive", "==", true)
    );
    const existingConfigsSnapshot = await getDocs(existingConfigsQuery);
    
    const deactivatePromises = existingConfigsSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isActive: false, updatedAt: new Date() })
    );
    await Promise.all(deactivatePromises);
    
    // Activate the specified config
    const configRef = doc(db, "PRIORITY_CONFIG", configId);
    await updateDoc(configRef, {
      isActive: true,
      updatedAt: new Date()
    });
    
    console.log("✅ Priority config activated:", configId);
    return { success: true };
  } catch (error) {
    console.error("❌ Error activating priority config:", error);
    throw error;
  }
};

/**
 * Validate priority configuration
 */
export const validatePriorityConfig = (config) => {
  const errors = [];
  
  // Validate time-based config
  if (config.timeBased?.enabled) {
    if (config.timeBased.urgentDays < 0) {
      errors.push("Urgent days must be non-negative");
    }
    if (config.timeBased.normalDays < config.timeBased.urgentDays) {
      errors.push("Normal days must be greater than or equal to urgent days");
    }
    if (config.timeBased.lowDays < config.timeBased.normalDays) {
      errors.push("Low days must be greater than or equal to normal days");
    }
  }
  
  // Validate value-based config
  if (config.valueBased?.enabled) {
    if (config.valueBased.highValue < config.valueBased.mediumValue) {
      errors.push("High value must be greater than or equal to medium value");
    }
    if (config.valueBased.mediumValue < config.valueBased.lowValue) {
      errors.push("Medium value must be greater than or equal to low value");
    }
  }
  
  // Validate order count config
  if (config.orderCountBased?.enabled) {
    if (config.orderCountBased.highCount < config.orderCountBased.mediumCount) {
      errors.push("High count must be greater than or equal to medium count");
    }
    if (config.orderCountBased.mediumCount < config.orderCountBased.lowCount) {
      errors.push("Medium count must be greater than or equal to low count");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get priority configuration history
 */
export const getPriorityConfigHistory = async (orgId, limitCount = 10) => {
  try {
    const historyQuery = query(
      collection(db, "PRIORITY_CONFIG"),
      where("orgID", "==", orgId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const historySnapshot = await getDocs(historyQuery);
    
    const history = historySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log("📋 Priority config history loaded:", history.length);
    return history;
  } catch (error) {
    console.error("❌ Error getting priority config history:", error);
    throw error;
  }
};

/**
 * Clone priority configuration
 */
export const clonePriorityConfig = async (sourceConfigId, orgId, userId, newConfigName) => {
  try {
    // Get source config
    const sourceConfigRef = doc(db, "PRIORITY_CONFIG", sourceConfigId);
    const sourceConfigDoc = await getDocs(query(collection(db, "PRIORITY_CONFIG"), where("__name__", "==", sourceConfigId)));
    
    if (sourceConfigDoc.docs.length === 0) {
      throw new Error("Source configuration not found");
    }
    
    const sourceConfig = sourceConfigDoc.docs[0].data();
    
    // Create new config based on source
    const newConfig = {
      orgID: orgId,
      configName: newConfigName || `${sourceConfig.configName} (Copy)`,
      isActive: false, // New configs are inactive by default
      ...sourceConfig,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    // Remove the original ID
    delete newConfig.id;
    
    const docRef = await addDoc(collection(db, "PRIORITY_CONFIG"), newConfig);
    console.log("✅ Priority config cloned:", docRef.id);
    
    return { success: true, configId: docRef.id };
  } catch (error) {
    console.error("❌ Error cloning priority config:", error);
    throw error;
  }
};
