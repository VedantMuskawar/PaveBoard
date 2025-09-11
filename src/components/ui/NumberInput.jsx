import React from 'react';

const NumberInput = React.forwardRef(({ 
  className = '', 
  placeholder = '', 
  value = '', 
  onChange, 
  min, 
  max, 
  step = 1,
  disabled = false,
  required = false,
  ...props 
}, ref) => {
  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const combinedClasses = `${baseClasses} ${className}`.trim();

  return (
    <input
      ref={ref}
      type="number"
      className={combinedClasses}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      required={required}
      {...props}
    />
  );
});

NumberInput.displayName = 'NumberInput';

export default NumberInput;
