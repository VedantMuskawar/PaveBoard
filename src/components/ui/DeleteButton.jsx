import React from 'react';

const DeleteButton = ({ 
  onClick, 
  disabled = false, 
  loading = false,
  variant = "danger", // "danger", "cancel", "request"
  size = "sm", // "xs", "sm", "md", "lg"
  children,
  className = "",
  title = "",
  icon = "❌"
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "cancel":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "request":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "requested":
        return "bg-orange-600 text-white cursor-not-allowed";
      default:
        return "bg-red-600 hover:bg-red-700 text-white";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "xs":
        return "text-xs px-2 py-1";
      case "sm":
        return "text-xs px-3 py-1";
      case "md":
        return "text-sm px-4 py-2";
      case "lg":
        return "text-base px-6 py-3";
      default:
        return "text-xs px-3 py-1";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        rounded-md transition-colors duration-200 font-medium
        ${disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        ${className}
      `}
      title={title}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
          Loading...
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span>{icon}</span>
          <span>{children}</span>
        </div>
      )}
    </button>
  );
};

export default DeleteButton;
