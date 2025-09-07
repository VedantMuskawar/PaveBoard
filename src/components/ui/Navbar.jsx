import React from 'react';
import { Button, Avatar } from './index';

const Navbar = ({ 
  title,
  user,
  onLogout,
  onProfileClick,
  className = '',
  ...props 
}) => {
  return (
    <nav 
      className={`bg-slate-900 border-b border-slate-800 px-4 py-3 ${className}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-slate-200">
            {title || 'PaveBoard'}
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            Dashboard
          </Button>
          <Button variant="ghost" size="sm">
            Orders
          </Button>
          <Button variant="ghost" size="sm">
            Reports
          </Button>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          {user && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onProfileClick}
                className="flex items-center space-x-2"
              >
                <Avatar 
                  size="sm" 
                  fallback={user.name || user.email}
                  src={user.avatar}
                />
                <span className="hidden sm:block text-slate-300">
                  {user.name || user.email}
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
