import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import toast from 'react-hot-toast';

const OrganizationSelector = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { selectOrganization } = useOrganization();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('No authenticated user found');
      navigate('/');
      return;
    }

    setUser(currentUser);
    fetchUserOrganizations(currentUser.uid);
  }, [navigate]);

  const fetchUserOrganizations = async (userID) => {
    try {
      setLoading(true);
      
      const membersRef = collection(db, 'MEMBERSHIP');
      const q = query(membersRef, where('userID', '==', userID));
      const querySnapshot = await getDocs(q);
      
      const orgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orgs.push({
          id: doc.id,
          orgID: data.orgID,
          orgName: data.orgName,
          role: data.role,
          member: data.member || {},
          userID: data.userID
        });
      });

      setOrganizations(orgs);
      
      // Handle different scenarios
      if (orgs.length === 0) {
        toast.error('No organizations found for this user');
        await signOut(auth);
        navigate('/');
        return;
      }
      
      // No auto-selection - let user choose even if only one organization
      
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
      await signOut(auth);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSelect = (org) => {
    selectOrganization(org);
    const memberName = org.member?.name || 'User';
    toast.success(`Welcome ${memberName} to ${org.orgName}!`);
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgba(20,20,22,0.9)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Loading Organizations</h2>
          <p className="text-gray-400">Please wait while we fetch your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgba(20,20,22,0.9)]">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Select Organization
          </h1>
          <p className="text-gray-400 text-lg">
            Choose which organization you'd like to access
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-600/30">
            <span className="text-sm text-gray-400">👤</span>
            <span className="text-sm text-gray-300">
              {user?.phoneNumber || 'User'}
            </span>
          </div>
        </div>

        {/* Organizations List */}
        <div className="space-y-4 mb-12">
          {organizations.map((org, index) => (
            <div
              key={org.id}
              onClick={() => handleOrganizationSelect(org)}
              className="bg-gradient-to-br from-gray-800/40 via-gray-700/30 to-gray-800/40 backdrop-blur-xl border border-gray-600/40 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-xl">🏢</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-100 mb-1 group-hover:text-blue-300 transition-colors duration-300">
                      {org.orgName}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">
                        Role: {org.role === 0 ? 'Admin' : org.role === 1 ? 'Manager' : 'Member'}
                      </span>
                      {org.member?.name && (
                        <span className="text-sm text-gray-400">
                          • {org.member.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-gray-400 group-hover:text-blue-300 transition-colors duration-300">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out Option */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800/50 px-6 py-3 rounded-xl border border-gray-600/30">
            <span className="text-sm text-gray-400">Not you?</span>
            <button
              onClick={async () => {
                await signOut(auth);
                navigate('/');
              }}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors duration-200 underline"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-gray-500">
            PaveBoard - Modern Business Management Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;
