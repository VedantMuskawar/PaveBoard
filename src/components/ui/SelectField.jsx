import React from 'react';

const SelectField = ({ 
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  label = "",
  error = "",
  disabled = false,
  required = false,
  size = "md", // "sm", "md", "lg"
  variant = "default", // "default", "status", "sort"
  className = "",
  showIcon = true,
  ...props
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "md":
        return "px-4 py-3 text-base";
      case "lg":
        return "px-6 py-4 text-lg";
      default:
        return "px-4 py-3 text-base";
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "status":
        return "bg-gray-800/50 border-gray-600 focus:border-green-500 focus:ring-green-500/20";
      case "sort":
        return "bg-gray-800/50 border-gray-600 focus:border-purple-500 focus:ring-purple-500/20";
      default:
        return "bg-gray-800/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20";
    }
  };

  const getErrorClasses = () => {
    return error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "";
  };

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border transition-all duration-200 appearance-none
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${getErrorClasses()}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${showIcon ? 'pr-10' : ''}
            text-gray-200
            focus:outline-none focus:ring-2 focus:ring-opacity-20
            hover:border-gray-500
            bg-gray-800/50
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options.map((option, index) => (
            <option 
              key={index} 
              value={option.value}
              className="bg-gray-800 text-gray-200"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {showIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default SelectField;
