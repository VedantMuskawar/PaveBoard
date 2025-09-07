import { useAuth } from '../hooks/useAuth.js';
import { useState, useEffect } from 'react';
import { getUserRecord } from '../services/membershipService.js';

const UserProfile = () => {
  const { user, signOut, loading } = useAuth();
  const [userRecord, setUserRecord] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Load user record from Firestore
  useEffect(() => {
    const loadUserRecord = async () => {
      if (user?.uid) {
        setLoadingUserData(true);
        try {
          const record = await getUserRecord(user.uid);
          setUserRecord(record);
        } catch (error) {
          console.error('Error loading user record:', error);
        } finally {
          setLoadingUserData(false);
        }
      }
    };

    loadUserRecord();
  }, [user?.uid]);

  if (loading || loadingUserData) {
    return (
      <div className="card max-w-md mx-auto">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const memberData = userRecord?.memberData;

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-primary-600">
            {user.phoneNumber ? '📱' : '👤'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome!
        </h2>
        <p className="text-gray-600">
          {memberData?.name || memberData?.member?.name || user.phoneNumber || user.email || 'User'}
        </p>
        {memberData?.orgName && (
          <p className="text-sm text-gray-500 mt-1">
            {memberData.orgName}
          </p>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Name:</span>
          <span className="text-sm font-medium text-gray-900">
            {memberData?.name || memberData?.member?.name || 'Not provided'}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Phone Number:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.phoneNumber || 'Not provided'}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Organization:</span>
          <span className="text-sm font-medium text-gray-900">
            {memberData?.orgName || 'Not provided'}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Role:</span>
          <span className="text-sm font-medium text-gray-900">
            {memberData?.role === 0 ? 'Admin' : 'Member'}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">User ID:</span>
          <span className="text-sm font-mono text-gray-900 text-xs">
            {user.uid.slice(0, 8)}...
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600">Last Sign In:</span>
          <span className="text-sm text-gray-900">
            {user.metadata?.lastSignInTime 
              ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
              : 'Unknown'
            }
          </span>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="btn btn-danger w-full"
      >
        Sign Out
      </button>
    </div>
  );
};

export default UserProfile;
