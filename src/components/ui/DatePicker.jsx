import React, { useState } from 'react';

const DatePicker = ({ 
  value,
  onChange,
  placeholder = "Select date",
  label = "",
  error = "",
  disabled = false,
  required = false,
  size = "md", // "sm", "md", "lg"
  format = "YYYY-MM-DD", // "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"
  minDate = null,
  maxDate = null,
  className = "",
  showIcon = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

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

  const getErrorClasses = () => {
    return error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "";
  };

  const formatDateForInput = (date) => {
    if (!date) return "";
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    if (dateValue) {
      onChange(dateValue);
    } else {
      onChange("");
    }
  };

  const getMinDate = () => {
    if (minDate) {
      return formatDateForInput(minDate);
    }
    return undefined;
  };

  const getMaxDate = () => {
    if (maxDate) {
      return formatDateForInput(maxDate);
    }
    return undefined;
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
        <input
          type="date"
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={getMinDate()}
          max={getMaxDate()}
          className={`
            w-full rounded-lg border transition-all duration-200
            ${getSizeClasses()}
            bg-gray-800/50 border-gray-600 
            focus:border-blue-500 focus:ring-blue-500/20
            ${getErrorClasses()}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            ${showIcon ? 'pr-10' : ''}
            text-gray-200 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-opacity-20
            hover:border-gray-500
            ${isFocused ? 'border-blue-500' : ''}
          `}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {showIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            📅
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

export default DatePicker;
