import React from 'react';

const InputField = ({ 
  type = "text",
  value,
  onChange,
  placeholder = "",
  label = "",
  error = "",
  disabled = false,
  required = false,
  size = "md", // "sm", "md", "lg"
  variant = "default", // "default", "search", "number", "email", "password"
  className = "",
  icon = null,
  onIconClick = null,
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
      case "search":
        return "bg-gray-800/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20";
      case "number":
        return "bg-gray-800/50 border-gray-600 focus:border-green-500 focus:ring-green-500/20";
      case "email":
        return "bg-gray-800/50 border-gray-600 focus:border-purple-500 focus:ring-purple-500/20";
      case "password":
        return "bg-gray-800/50 border-gray-600 focus:border-red-500 focus:ring-red-500/20";
      default:
        return "bg-gray-800/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20";
    }
  };

  const getErrorClasses = () => {
    return error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "";
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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border transition-all duration-200
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${getErrorClasses()}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            ${icon ? 'pr-10' : ''}
            text-gray-200 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-opacity-20
            hover:border-gray-500
          `}
          {...props}
        />
        
        {icon && (
          <div 
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${
              onIconClick ? 'cursor-pointer hover:text-gray-300' : ''
            }`}
            onClick={onIconClick}
          >
            {icon}
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

export default InputField;
