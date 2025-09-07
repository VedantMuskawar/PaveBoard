import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { initDatabase } from '../db/database.js';
import { useUserData } from '../hooks/useUserData.js';
import { useAuth } from '../hooks/useAuth.js';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import UserForm from './UserForm.jsx';
import UserList from './UserList.jsx';
import PhoneAuth from './PhoneAuth.jsx';
import UserProfile from './UserProfile.jsx';
import OrganizationSelector from './OrganizationSelector.jsx';

// Lazy load heavy components
const Home = lazy(() => import('../pages/Home.jsx'));
const PrintDMPage = lazy(() => import('../pages/PrintDMPage.jsx'));


const AppContent = () => {
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { selectedOrganization } = useOrganization();
  const {
    userData,
    loading: dataLoading,
    error,
    addUserData,
    updateUserData,
    deleteUserData,
    refreshData
  } = useUserData();

  // Initialize database on app start
  useEffect(() => {
    const init = async () => {
      await initDatabase();
      setDbInitialized(true);
    };
    init();
  }, []);

  const handleAddUser = async (name, email) => {
    await addUserData(name, email);
    setShowAddForm(false);
  };

  const handleUpdateUser = async (name, email) => {
    await updateUserData(editingUser.id, name, email);
    setEditingUser(null);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleDeleteUser = async (id) => {
    await deleteUserData(id);
  };

  const handleAuthSuccess = (user) => {
    console.log('Authentication successful:', user);
    // Navigate to organization selector after successful auth
    window.location.href = '/select-organization';
  };

  // Show loading while initializing
  if (!dbInitialized || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing PaveBoard...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={
          !isAuthenticated ? (
            <div className="min-h-screen bg-gray-50">
              <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    PaveBoard Web
                  </h1>
                </div>

                {/* Authentication Section */}
                <div className="mb-8">
                  <PhoneAuth onSuccess={handleAuthSuccess} />
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                  <p>Sign in to manage your user data</p>
                </div>
              </div>
            </div>
          ) : (
            <Navigate to="/select-organization" replace />
          )
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/select-organization" 
        element={
          isAuthenticated ? (
            <OrganizationSelector />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      <Route 
        path="/home" 
        element={
          isAuthenticated && selectedOrganization ? (
            <Suspense fallback={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading Dashboard...</p>
                </div>
              </div>
            }>
              <Home />
            </Suspense>
          ) : isAuthenticated ? (
            <Navigate to="/select-organization" replace />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      {/* Print DM Page - Public route for printing */}
      <Route 
        path="/print-dm/:dmNumber" 
        element={
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Print Page...</p>
              </div>
            </div>
          }>
            <PrintDMPage />
          </Suspense>
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppContent;
