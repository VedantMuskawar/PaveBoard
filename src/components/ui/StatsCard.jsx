import React from 'react';
import { Card } from './index';

const StatsCard = ({ 
  icon,
  title,
  value,
  subtitle,
  variant = 'default',
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'bg-gray-800/70 border-gray-700/50',
    primary: 'bg-blue-900/20 border-blue-700/50',
    success: 'bg-green-900/20 border-green-700/50',
    warning: 'bg-yellow-900/20 border-yellow-700/50',
    danger: 'bg-red-900/20 border-red-700/50'
  };

  const valueVariants = {
    default: 'text-gray-200',
    primary: 'text-blue-200',
    success: 'text-green-200',
    warning: 'text-yellow-200',
    danger: 'text-red-200'
  };

  return (
    <Card 
      variant="flat" 
      className={`p-6 text-center hover-lift ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-200 mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${valueVariants[variant]}`}>{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      )}
    </Card>
  );
};

export default StatsCard;
