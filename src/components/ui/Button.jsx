import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  // Exact DieselLedger button styling
  const getButtonStyle = () => {
    const baseStyle = {
      fontWeight: 600,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      transition: "transform 120ms ease, box-shadow 200ms ease",
      opacity: disabled || loading ? 0.5 : 1,
      userSelect: "none",
      border: "none",
      outline: "none"
    };

    const variantStyles = {
      primary: {
        background: "linear-gradient(180deg, #0A84FF, #0066CC)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 12,
        padding: "10px 16px",
        fontSize: "14px",
        boxShadow: "0 8px 20px rgba(10,132,255,0.25)",
        marginBottom: "0.5rem"
      },
      secondary: {
        background: "linear-gradient(180deg, rgba(44,44,46,0.9), rgba(36,36,38,0.9))",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: "0.82rem"
      },
      outline: {
        background: "transparent",
        color: "#ccc",
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "0.5rem 1rem",
        fontSize: "0.95rem"
      },
      danger: {
        background: "linear-gradient(180deg, #FF453A, #C62D23)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: "0.82rem"
      },
      success: {
        background: "#28a745",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "0.5rem 1rem",
        fontSize: "0.95rem",
        marginBottom: "1rem"
      },
      settle: {
        background: "linear-gradient(180deg, #0A84FF, #0066CC)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: "0.92rem",
        boxShadow: "0 6px 18px rgba(10,132,255,0.22)"
      },
      unsettle: {
        background: "linear-gradient(180deg, #FF453A, #C62D23)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: "0.92rem",
        boxShadow: "0 6px 18px rgba(255,69,58,0.22)"
      },
      edit: {
        marginLeft: "0.5rem",
        background: "linear-gradient(180deg, rgba(44,44,46,0.9), rgba(36,36,38,0.9))",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: "0.82rem"
      },
      delete: {
        marginLeft: "0.5rem",
        background: "linear-gradient(180deg, #FF453A, #C62D23)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: "0.82rem"
      }
    };

    const sizeStyles = {
      sm: { padding: "6px 10px", fontSize: "0.82rem" },
      md: { padding: "8px 12px", fontSize: "0.92rem" },
      lg: { padding: "10px 16px", fontSize: "14px" },
      xl: { padding: "0.7rem 2rem", fontSize: "1rem" }
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size]
    };
  };

  const buttonStyle = getButtonStyle();

  return (
    <button
      type={type}
      style={buttonStyle}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <span style={{ marginRight: "0.5rem" }}>⏳</span>
      )}
      {children}
    </button>
  );
};

export default Button;
