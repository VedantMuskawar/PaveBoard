import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database.js';
// Removed cacheUtils import - using direct database access

export const useUserData = () => {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all user data directly from database
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading user data directly from database');
      
      const data = await db.userData.toArray();
      setUserData(data);
      setError(null);
      console.log('📡 User data loaded:', data.length, 'users');
    } catch (err) {
      setError('Failed to load user data');
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new user data
  const addUserData = useCallback(async (name, email) => {
    try {
      const newUser = {
        name,
        email,
        lastUpdated: new Date()
      };
      
      const id = await db.userData.add(newUser);
      
      await loadUserData(); // Refresh the list
      return id;
    } catch (err) {
      setError('Failed to add user data');
      console.error('Error adding user data:', err);
      throw err;
    }
  }, [loadUserData]);

  // Update user data
  const updateUserData = useCallback(async (id, name, email) => {
    try {
      await db.userData.update(id, {
        name,
        email,
        lastUpdated: new Date()
      });
      
      await loadUserData(); // Refresh the list
    } catch (err) {
      setError('Failed to update user data');
      console.error('Error updating user data:', err);
      throw err;
    }
  }, [loadUserData]);

  // Delete user data
  const deleteUserData = useCallback(async (id) => {
    try {
      await db.userData.delete(id);
      
      await loadUserData(); // Refresh the list
    } catch (err) {
      setError('Failed to delete user data');
      console.error('Error deleting user data:', err);
      throw err;
    }
  }, [loadUserData]);

  // Load data on component mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    userData,
    loading,
    error,
    addUserData,
    updateUserData,
    deleteUserData,
    refreshData: loadUserData
  };
};
