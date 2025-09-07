import { useState, useCallback } from 'react';
import React from 'react';

const UserList = ({ userData, loading, error, onEdit, onDelete }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setDeletingId(null);
      }
    }
  }, [onDelete]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (userData.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📝</div>
          <p className="text-gray-500">No users found. Add your first user above!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">User List</h2>
      
      <div className="space-y-3">
        {userData.map((user) => (
          <div
            key={user.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{user.name}</h3>
                <p className="text-gray-600 text-sm">{user.email}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Last updated: {formatDate(user.lastUpdated)}
                </p>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onEdit(user)}
                  className="btn btn-secondary text-sm px-3 py-1"
                  disabled={deletingId === user.id}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="btn btn-danger text-sm px-3 py-1"
                  disabled={deletingId === user.id}
                >
                  {deletingId === user.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(UserList);
