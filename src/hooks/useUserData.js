import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database.js';
import { cacheUtils } from '../utils/cacheManager';

export const useUserData = () => {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all user data with intelligent caching
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try cache first, then fetch fresh data
      const result = await cacheUtils.smartFetchUser('userData', async () => {
        return await db.userData.toArray();
      });
      
      setUserData(result.data);
      setError(null);
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
      
      // Clear cache to force fresh data on next load
      cacheUtils.clearUserCache('userData');
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
      
      // Clear cache to force fresh data on next load
      cacheUtils.clearUserCache('userData');
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
      
      // Clear cache to force fresh data on next load
      cacheUtils.clearUserCache('userData');
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
