import React from 'react';

const Avatar = ({ 
  src, 
  alt, 
  size = 'md', 
  fallback,
  className = '',
  ...props 
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl'
  };

  const baseClasses = 'inline-flex items-center justify-center rounded-full bg-slate-700 text-slate-300 font-medium overflow-hidden border border-slate-600';

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizes[size]} ${baseClasses} ${className}`}
        {...props}
      />
    );
  }

  return (
    <div className={`${sizes[size]} ${baseClasses} ${className}`} {...props}>
      {fallback || (alt ? alt.charAt(0).toUpperCase() : '?')}
    </div>
  );
};

export default Avatar;
