import React from 'react';

const ExportButton = ({ 
  onClick, 
  disabled = false, 
  loading = false,
  variant = "primary", // "primary", "secondary", "success"
  size = "md", // "sm", "md", "lg"
  children,
  className = "",
  title = "",
  icon = "📊",
  exportType = "excel" // "excel", "pdf", "csv", "custom"
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25";
      case "secondary":
        return "bg-gray-600 hover:bg-gray-700 text-white";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white";
      default:
        return "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-sm px-4 py-2";
      case "md":
        return "text-base px-6 py-3";
      case "lg":
        return "text-lg px-8 py-4";
      default:
        return "text-base px-6 py-3";
    }
  };

  const getExportIcon = () => {
    switch (exportType) {
      case "excel":
        return "📊";
      case "pdf":
        return "📄";
      case "csv":
        return "📋";
      case "custom":
        return "💾";
      default:
        return icon;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        rounded-lg font-semibold transition-all duration-300
        ${disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-105'}
        ${className}
      `}
      title={title}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getExportIcon()}</span>
          <span>{children}</span>
        </div>
      )}
    </button>
  );
};

export default ExportButton;
