import React from 'react';

const DieselInput = ({ 
  type = "text",
  value,
  onChange,
  placeholder = "",
  label = "",
  required = false,
  disabled = false,
  error = "",
  helperText = "",
  size = "md", // "sm", "md", "lg"
  variant = "default", // "default", "search", "date"
  className = "",
  style = {},
  ...props
}) => {
  const baseInputStyle = {
    height: "44px",
    padding: "0.55rem 0.9rem",
    width: "100%",
    background: "rgba(28,28,30,0.9)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "16px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
    boxSizing: "border-box",
    transition: "all 200ms ease",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return {
          height: "36px",
          padding: "0.4rem 0.7rem",
          fontSize: "14px"
        };
      case "lg":
        return {
          height: "52px",
          padding: "0.7rem 1.1rem",
          fontSize: "18px"
        };
      default:
        return {};
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "search":
        return {
          background: "#222",
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "0.4rem 0.7rem",
          height: "36px",
          fontSize: "14px"
        };
      case "date":
        return {
          background: "#222",
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "0.4rem",
          height: "36px",
          fontSize: "14px"
        };
      default:
        return {};
    }
  };

  const getErrorStyle = () => {
    if (error) {
      return {
        border: "1px solid rgba(255,69,58,0.5)",
        boxShadow: "0 0 0 3px rgba(255,69,58,0.1)"
      };
    }
    return {};
  };

  const getDisabledStyle = () => {
    if (disabled) {
      return {
        opacity: 0.6,
        cursor: "not-allowed",
        background: "rgba(28,28,30,0.5)"
      };
    }
    return {};
  };

  const getFocusStyle = () => {
    return {
      border: "1px solid rgba(0,195,255,0.5)",
      boxShadow: "0 0 0 3px rgba(0,195,255,0.1)",
      outline: "none"
    };
  };

  const inputStyle = {
    ...baseInputStyle,
    ...getSizeStyle(),
    ...getVariantStyle(),
    ...getErrorStyle(),
    ...getDisabledStyle(),
    ...style
  };

  const labelStyle = {
    color: "#ccc",
    fontSize: "0.9rem",
    fontWeight: 500,
    marginBottom: "0.5rem",
    display: "block"
  };

  const errorStyle = {
    color: "#ff4444",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
    display: "block"
  };

  const helperTextStyle = {
    color: "#9ba3ae",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
    display: "block"
  };

  const containerStyle = {
    marginBottom: "1rem"
  };

  const handleFocus = (e) => {
    if (!disabled) {
      Object.assign(e.target.style, getFocusStyle());
    }
  };

  const handleBlur = (e) => {
    if (!disabled) {
      Object.assign(e.target.style, {
        border: error ? "1px solid rgba(255,69,58,0.5)" : "1px solid rgba(255,255,255,0.10)",
        boxShadow: error ? "0 0 0 3px rgba(255,69,58,0.1)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
        outline: "none"
      });
    }
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: "#ff4444", marginLeft: "0.25rem" }}>*</span>}
        </label>
      )}
      
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={inputStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      
      {error && (
        <span style={errorStyle}>{error}</span>
      )}
      
      {helperText && !error && (
        <span style={helperTextStyle}>{helperText}</span>
      )}
    </div>
  );
};

export default DieselInput;
