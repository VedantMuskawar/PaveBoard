import React from 'react';
import { Card, Badge } from './index';

const SectionCard = ({ 
  title,
  icon,
  children,
  itemCount,
  variant = 'default',
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'bg-gray-800/70 border-gray-700/50',
    primary: 'bg-blue-900/20 border-blue-700/50',
    success: 'bg-green-900/20 border-green-700/50',
    warning: 'bg-yellow-900/20 border-yellow-700/50'
  };

  return (
    <Card 
      className={`p-6 ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-xl font-semibold text-gray-200">
            {title}
          </h3>
        </div>
        {itemCount && (
          <Badge variant="primary" size="sm">
            {itemCount}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </Card>
  );
};

export default SectionCard;
