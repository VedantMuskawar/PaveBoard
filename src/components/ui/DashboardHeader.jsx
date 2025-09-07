import React from 'react';
import { Button, Avatar } from './index';

const DashboardHeader = ({ 
  title,
  organization,
  user,
  onLogout,
  onProfileClick,
  onOrganizationClick,
  onSettingsClick,
  showSettings = false,
  className = '',
  ...props 
}) => {
  return (
    <header className={`bg-gray-800 border-b border-gray-700 transition-all duration-300 ${className}`} {...props}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gray-200">
              {title}
            </h1>
            
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="primary" size="sm">
                Home
              </Button>
              <Button variant="outline" size="sm">
                Scheduled Orders
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={onOrganizationClick}
            >
              <span className="mr-2">🏢</span>
              <span>{organization?.orgName}</span>
            </Button>
            
            {showSettings && (
              <Button 
                variant="outline"
                size="sm"
                onClick={onSettingsClick}
              >
                <span className="mr-2">⚙️</span>
                <span>Settings</span>
              </Button>
            )}
            
            <Button 
              variant="outline"
              size="sm"
              onClick={onProfileClick}
            >
              <Avatar 
                size="sm" 
                fallback={user?.name || user?.phoneNumber}
                className="mr-2"
              />
              <span>{user?.phoneNumber || user?.name}</span>
            </Button>
            
            <Button 
              variant="danger"
              size="sm"
              onClick={onLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
