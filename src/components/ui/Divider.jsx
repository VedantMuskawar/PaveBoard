import React from 'react';

const Divider = ({ 
  orientation = 'horizontal', 
  variant = 'default',
  className = '',
  children,
  ...props 
}) => {
  const baseClasses = 'flex items-center';
  
  const variants = {
    default: 'border-slate-700',
    light: 'border-slate-600',
    dark: 'border-slate-800'
  };

  if (orientation === 'vertical') {
    return (
      <div 
        className={`h-full w-px bg-slate-700 ${className}`} 
        {...props}
      />
    );
  }

  if (children) {
    return (
      <div className={`${baseClasses} ${className}`} {...props}>
        <div className={`flex-1 border-t ${variants[variant]}`} />
        <span className="px-3 text-sm text-slate-400">{children}</span>
        <div className={`flex-1 border-t ${variants[variant]}`} />
      </div>
    );
  }

  return (
    <div className={`border-t ${variants[variant]} ${className}`} {...props} />
  );
};

export default Divider;
