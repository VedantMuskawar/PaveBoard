import React from 'react';
import { Modal, Avatar, Badge, Divider, Button } from './index';

const ProfileModal = ({ 
  isOpen,
  onClose,
  user,
  organization,
  onEditProfile,
  className = '',
  ...props 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Information"
      size="md"
      className={className}
      {...props}
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar 
            size="xl" 
            fallback={organization?.name || user?.name}
            className="bg-blue-600 text-white"
          />
          <div>
            <h3 className="text-lg font-semibold text-slate-200">
              {organization?.name || user?.name}
            </h3>
            <p className="text-slate-400">
              {organization?.phoneNumber || "User Account"}
            </p>
            <Badge 
              variant={organization?.role === 0 ? 'primary' : 'default'}
              className="mt-2"
            >
              {organization?.role === 0 ? 'Admin' : 
               organization?.role === 1 ? 'Manager' : 
               organization?.role === 2 ? 'Member' : 'Home User'}
            </Badge>
          </div>
        </div>
        
        <Divider />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">Organization</p>
            <p className="text-sm text-slate-200">{organization?.orgName || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Organization ID</p>
            <p className="text-sm text-slate-200 font-mono">{organization?.orgID || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Role</p>
            <Badge 
              variant={organization?.role === 0 ? 'primary' : 'default'}
            >
              {organization?.role === 0 ? 'Admin' : 
               organization?.role === 1 ? 'Manager' : 
               organization?.role === 2 ? 'Member' : 'Unknown'}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Phone Number</p>
            <p className="text-sm text-slate-200">{organization?.phoneNumber || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Status</p>
            <Badge variant="success">Active</Badge>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            variant="primary"
            onClick={onEditProfile}
          >
            Edit Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;
