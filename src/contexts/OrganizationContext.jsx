import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { cacheUtils } from '../utils/cacheManager';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load organization from cache on mount
  useEffect(() => {
    const cachedOrg = localStorage.getItem('selectedOrganization');
    if (cachedOrg) {
      try {
        const orgData = JSON.parse(cachedOrg);
        setSelectedOrganization(orgData);
        console.log('📦 Loaded organization from cache');
      } catch (error) {
        console.error('❌ Failed to load organization from cache:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const selectOrganization = (org) => {
    setSelectedOrganization(org);
    // Cache the selected organization
    if (org) {
      localStorage.setItem('selectedOrganization', JSON.stringify(org));
      cacheUtils.cacheOrganization(org.orgID, org);
      console.log('✅ Organization cached');
    }
  };

  const clearOrganization = () => {
    setSelectedOrganization(null);
    localStorage.removeItem('selectedOrganization');
    console.log('🗑️ Organization cache cleared');
  };

  const value = useMemo(() => ({
    selectedOrganization,
    selectOrganization,
    clearOrganization,
    isLoading
  }), [selectedOrganization, isLoading]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
