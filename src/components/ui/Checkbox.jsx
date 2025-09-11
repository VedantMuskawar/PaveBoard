import React from 'react';

const Checkbox = ({ 
  checked, 
  onChange, 
  disabled = false, 
  className = '', 
  id,
  name,
  value,
  ...props 
}) => {
  return (
    <input
      type="checkbox"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
      {...props}
    />
  );
};

export default Checkbox;
