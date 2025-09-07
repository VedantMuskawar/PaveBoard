import React from 'react';

const Card = ({ 
  children, 
  variant = 'default', 
  padding = 'md', 
  className = '', 
  onClick,
  hover = false,
  ...props 
}) => {
  const baseClasses = 'bg-[rgba(20,20,22,0.6)] backdrop-blur-xl rounded-2xl border border-white/08 transition-all duration-200';
  
  const variants = {
    default: 'shadow-lg shadow-black/30',
    elevated: 'shadow-xl shadow-black/30',
    flat: 'shadow-none'
  };
  
  const paddingSizes = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const hoverClasses = hover ? 'hover:shadow-xl hover:border-white/12 hover:bg-[rgba(255,255,255,0.04)] cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const classes = `${baseClasses} ${variants[variant]} ${paddingSizes[padding]} ${hoverClasses} ${clickableClasses} ${className}`;

  return (
    <div
      className={classes}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
