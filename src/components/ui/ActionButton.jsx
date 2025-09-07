import React from 'react';

const ActionButton = ({ 
  type = "primary", // "primary", "settle", "unsettle", "edit", "delete", "verify", "unverify"
  size = "sm", // "xs", "sm", "md", "lg"
  onClick,
  disabled = false,
  loading = false,
  children,
  icon,
  className = "",
  ariaLabel,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = {
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "transform 120ms ease, box-shadow 200ms ease",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.25rem",
      opacity: disabled ? 0.6 : 1,
      userSelect: "none"
    };

    const sizeStyles = {
      xs: { padding: "4px 8px", fontSize: "0.75rem" },
      sm: { padding: "6px 10px", fontSize: "0.82rem" },
      md: { padding: "8px 12px", fontSize: "0.92rem" },
      lg: { padding: "10px 16px", fontSize: "14px" }
    };

    const typeStyles = {
      primary: {
        background: "linear-gradient(180deg, #0A84FF, #0066CC)",
        color: "#fff",
        boxShadow: "0 8px 20px rgba(10,132,255,0.25)",
        marginBottom: "0.5rem"
      },
      settle: {
        background: "linear-gradient(180deg, #0A84FF, #0066CC)",
        color: "#fff",
        boxShadow: "0 6px 18px rgba(10,132,255,0.22)"
      },
      unsettle: {
        background: "linear-gradient(180deg, #FF453A, #C62D23)",
        color: "#fff",
        boxShadow: "0 6px 18px rgba(255,69,58,0.22)"
      },
      edit: {
        background: "linear-gradient(180deg, rgba(44,44,46,0.9), rgba(36,36,38,0.9))",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.10)"
      },
      delete: {
        background: "linear-gradient(180deg, #FF453A, #C62D23)",
        color: "#fff"
      },
      verify: {
        background: "linear-gradient(180deg, #28a745, #1e7e34)",
        color: "#fff",
        boxShadow: "0 6px 18px rgba(40,167,69,0.22)"
      },
      unverify: {
        background: "linear-gradient(180deg, #ffc107, #e0a800)",
        color: "#000",
        boxShadow: "0 6px 18px rgba(255,193,7,0.22)"
      }
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...typeStyles[type]
    };
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const buttonStyle = getButtonStyle();

  return (
    <button
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <div style={{
          width: "12px",
          height: "12px",
          border: "2px solid transparent",
          borderTop: "2px solid currentColor",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
      )}
      {!loading && icon && <span style={{ fontSize: "0.8rem" }}>{icon}</span>}
      {children}
    </button>
  );
};

export default ActionButton;
