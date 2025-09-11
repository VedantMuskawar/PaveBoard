import { useOrganization as useOrgContext } from '../contexts/OrganizationContext';

/**
 * Custom hook to get the current organization ID
 * Falls back to hardcoded value if context is not available
 */
export const useOrganization = () => {
  try {
    const context = useOrgContext();
    
    // Use the organization ID from the context
    const orgId = context?.selectedOrganization?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
    
    return {
      orgId,
      currentOrganization: context?.selectedOrganization,
      isLoading: context?.isLoading || false
    };
  } catch (error) {
    // Fallback if context is not available
    console.warn('Organization context not available, using fallback org ID');
    return {
      orgId: "K4Q6vPOuTcLPtlcEwdw0",
      currentOrganization: null,
      isLoading: false
    };
  }
};
