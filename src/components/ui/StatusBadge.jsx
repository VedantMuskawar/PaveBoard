import React from 'react';

const StatusBadge = ({ 
  status, 
  variant = "default", // "default", "success", "danger", "warning", "info", "paid", "unpaid", "verified", "unverified"
  size = "sm", // "xs", "sm", "md", "lg"
  className = "",
  showIcon = false,
  useDieselStyle = true // New prop to use Diesel Ledger styling
}) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case "active":
      case "success":
      case "completed":
      case "approved":
      case "settled":
      case "verified":
      case "paid":
        return {
          variant: "success",
          icon: "✅",
          text: status.toUpperCase()
        };
      case "cancelled":
      case "danger":
      case "failed":
      case "rejected":
      case "unsettled":
      case "unverified":
      case "unpaid":
        return {
          variant: "danger",
          icon: "❌",
          text: status.toUpperCase()
        };
      case "pending":
      case "warning":
      case "processing":
        return {
          variant: "warning",
          icon: "⏳",
          text: status.toUpperCase()
        };
      case "info":
      case "draft":
        return {
          variant: "info",
          icon: "ℹ️",
          text: status.toUpperCase()
        };
      default:
        return {
          variant: variant,
          icon: "•",
          text: status?.toUpperCase() || "UNKNOWN"
        };
    }
  };

  const getDieselStyle = (config) => {
    const baseStyle = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontWeight: 700,
      fontSize: "0.85rem",
      letterSpacing: "0.02em",
      userSelect: "none",
      display: "inline-block",
      transition: "all 200ms ease"
    };

    switch (config.variant) {
      case "success":
        return {
          ...baseStyle,
          backgroundColor: "rgba(50,215,75,0.14)",
          color: "#32D74B",
          border: "1px solid rgba(50,215,75,0.35)"
        };
      case "danger":
        return {
          ...baseStyle,
          backgroundColor: "rgba(255,69,58,0.18)",
          color: "#FF453A",
          border: "1px solid rgba(255,69,58,0.45)"
        };
      case "warning":
        return {
          ...baseStyle,
          backgroundColor: "rgba(255,214,10,0.18)",
          color: "#8a6f00",
          border: "1px solid rgba(255,214,10,0.45)"
        };
      case "info":
        return {
          ...baseStyle,
          backgroundColor: "rgba(10,132,255,0.14)",
          color: "#0A84FF",
          border: "1px solid rgba(10,132,255,0.35)"
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "rgba(142,142,147,0.14)",
          color: "#8e8e93",
          border: "1px solid rgba(142,142,147,0.35)"
        };
    }
  };

  const getVariantClasses = () => {
    const config = getStatusConfig();
    switch (config.variant) {
      case "success":
        return "bg-green-600 text-white";
      case "danger":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      case "info":
        return "bg-blue-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "xs":
        return "text-xs px-2 py-0.5";
      case "sm":
        return "text-xs px-3 py-1";
      case "md":
        return "text-sm px-4 py-1.5";
      case "lg":
        return "text-base px-5 py-2";
      default:
        return "text-xs px-3 py-1";
    }
  };

  const config = getStatusConfig();

  // Use Diesel Ledger styling if requested
  if (useDieselStyle) {
    const dieselStyle = getDieselStyle(config);
    return (
      <span style={dieselStyle} className={className}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {showIcon && <span style={{ fontSize: "0.75rem" }}>{config.icon}</span>}
          <span>{config.text}</span>
        </div>
      </span>
    );
  }

  // Fallback to original Tailwind styling
  return (
    <span
      className={`
        inline-block rounded-full font-semibold transition-all duration-200
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        {showIcon && <span className="text-xs">{config.icon}</span>}
        <span>{config.text}</span>
      </div>
    </span>
  );
};

export default StatusBadge;
