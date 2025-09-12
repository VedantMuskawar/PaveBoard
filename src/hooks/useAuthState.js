import { useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebase';
import { verifyMembership } from '../services/membershipService';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing authentication state and user roles
 * Handles wallet initialization, role determination, and auth state changes
 */
export const useAuthState = () => {
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  const { user } = useAuth();

  // Determine user role based on membership data from database
  const determineUserRole = useCallback((memberData, user) => {
    // Role determination based on database values only
    const isAdminUser = memberData?.role === 'admin' || 
                       memberData?.role === 'Admin' ||
                       memberData?.role === 0; // Role 0 = Admin in database
    
    const isManagerUser = memberData?.role === 'manager' || 
                         memberData?.role === 'Manager' ||
                         memberData?.role === 1; // Role 1 = Manager in database
    
    
    return { isAdminUser, isManagerUser };
  }, []);

  // Initialize wallet and role detection
  const initializeWallet = useCallback(async () => {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      const userId = currentUser.uid;
      const userPhone = currentUser.phoneNumber || '';
      
      try {
        // Verify membership and get role from phone number
        const memberData = await verifyMembership(userPhone);
        
        if (memberData) {
          const { isAdminUser, isManagerUser } = determineUserRole(memberData, user);
          
          setWallet({ 
            uid: userId, 
            name: memberData.name || currentUser.displayName || "User",
            email: currentUser.email,
            phoneNumber: userPhone,
            role: isAdminUser ? 'admin' : isManagerUser ? 'manager' : 'guest',
            memberData: memberData
          });
          setIsAdmin(isAdminUser);
          setIsManager(isManagerUser);
        } else {
          // User not found in membership - check email fallback
          const { isAdminUser, isManagerUser } = determineUserRole(null, user);
          
          setWallet({ 
            uid: userId, 
            name: currentUser.displayName || "Guest User",
            email: currentUser.email,
            phoneNumber: userPhone,
            role: isAdminUser ? 'admin' : isManagerUser ? 'manager' : 'guest'
          });
          setIsAdmin(isAdminUser);
          setIsManager(isManagerUser);
        }
      } catch (error) {
        // Fallback to email-based role on error
        const { isAdminUser, isManagerUser } = determineUserRole(null, user);
        
        setWallet({ 
          uid: userId, 
          name: currentUser.displayName || "Guest User",
          email: currentUser.email,
          phoneNumber: userPhone,
          role: isAdminUser ? 'admin' : isManagerUser ? 'manager' : 'guest'
        });
        setIsAdmin(isAdminUser);
        setIsManager(isManagerUser);
      }
    } else {
      // Fallback for unauthenticated users
      setWallet({ 
        uid: "guest", 
        name: "Guest User",
        role: 2 // 2 = Guest/Member
      });
      setIsAdmin(false);
      setIsManager(false);
    }
    
    setWalletLoading(false);
  }, [user, determineUserRole]);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (user) => {
    if (user) {
      const userId = user.uid;
      const userPhone = user.phoneNumber || '';
      
      try {
        // Verify membership and get role from phone number
        const memberData = await verifyMembership(userPhone);
        
        if (memberData) {
          const { isAdminUser, isManagerUser } = determineUserRole(memberData, user);
          
          setWallet({ 
            uid: userId, 
            name: memberData.name || user.displayName || "User",
            email: user.email,
            phoneNumber: userPhone,
            role: isAdminUser ? 'admin' : isManagerUser ? 'manager' : 'guest',
            memberData: memberData
          });
          setIsAdmin(isAdminUser);
          setIsManager(isManagerUser);
        } else {
          // User not found in membership - default to guest
          setWallet({ 
            uid: userId, 
            name: user.displayName || "Guest User",
            email: user.email,
            phoneNumber: userPhone,
            role: 'guest'
          });
          setIsAdmin(false);
          setIsManager(false);
        }
      } catch (error) {
        // Fallback to guest role on error
        setWallet({ 
          uid: userId, 
          name: user.displayName || "Guest User",
          email: user.email,
          phoneNumber: userPhone,
          role: 'guest'
        });
        setIsAdmin(false);
        setIsManager(false);
      }
    } else {
      setWallet(null);
      setIsAdmin(false);
      setIsManager(false);
    }
    setWalletLoading(false);
  }, [determineUserRole]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeWallet();
    
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChange);
    
    return () => unsubscribe();
  }, [initializeWallet, handleAuthStateChange]);

  return {
    wallet,
    walletLoading,
    isAdmin,
    isManager
  };
};
