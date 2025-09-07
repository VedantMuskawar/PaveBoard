import { useState, useEffect, useCallback } from 'react';
import React from 'react';

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), email.trim());
      if (!isEditing) {
        // Clear form only when adding new user
        setName('');
        setEmail('');
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, onSubmit, isEditing]);

  const handleCancel = useCallback(() => {
    if (!isEditing) {
      setName('');
      setEmail('');
    }
    onCancel?.();
  }, [onCancel, isEditing]);

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        {isEditing ? 'Edit User' : 'Add New User'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Enter name"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="Enter email"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isSubmitting || !name.trim() || !email.trim()}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add User')}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default React.memo(UserForm);
