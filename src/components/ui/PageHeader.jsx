import React from 'react';

const PageHeader = ({ 
  title,
  onBack,
  showBackButton = true,
  backButtonText = "←",
  role = null, // "admin", "manager", "member", etc.
  roleDisplay = null, // Custom role display text
  className = "",
  children // For additional content like buttons, search, etc.
}) => {
  const headerStyle = {
    background: "rgba(20,20,22,0.6)",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "1.2rem",
    fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    width: "100%",
    boxSizing: "border-box"
  };

  const backButtonStyle = {
    fontSize: "0.95rem",
    cursor: "pointer",
    color: "#9ba3ae",
    padding: "6px 10px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(40,40,42,0.8), rgba(26,26,28,0.8))",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    userSelect: "none",
    transition: "all 200ms ease"
  };

  const titleStyle = {
    color: "#f5f5f7",
    fontWeight: 700,
    fontSize: "1.2rem"
  };

  const roleBadgeStyle = {
    fontSize: "0.9rem",
    color: "#9ba3ae",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.25rem"
  };

  const getRoleBadgeStyle = (role) => {
    const baseStyle = { ...roleBadgeStyle };
    
    switch (role?.toLowerCase()) {
      case "admin":
        return {
          ...baseStyle,
          background: "rgba(50,215,75,0.2)",
          border: "1px solid rgba(50,215,75,0.4)",
          color: "#32D74B"
        };
      case "manager":
        return {
          ...baseStyle,
          background: "rgba(10,132,255,0.2)",
          border: "1px solid rgba(10,132,255,0.4)",
          color: "#0A84FF"
        };
      case "member":
        return {
          ...baseStyle,
          background: "rgba(142,142,147,0.2)",
          border: "1px solid rgba(142,142,147,0.4)",
          color: "#8e8e93"
        };
      default:
        return {
          ...baseStyle,
          background: "rgba(142,142,147,0.2)",
          border: "1px solid rgba(142,142,147,0.4)",
          color: "#8e8e93"
        };
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "👑";
      case "manager":
        return "👔";
      case "member":
        return "👤";
      default:
        return "👤";
    }
  };

  const getRoleText = (role, customDisplay) => {
    if (customDisplay) return customDisplay;
    
    switch (role?.toLowerCase()) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header style={headerStyle} className={className}>
      {/* Left side - Back button and title */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {showBackButton && (
          <div 
            style={backButtonStyle}
            onClick={handleBackClick}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255,255,255,0.05)";
              e.target.style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "linear-gradient(180deg, rgba(40,40,42,0.8), rgba(26,26,28,0.8))";
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
            }}
            title="Go back"
            aria-label="Go back"
          >
            {backButtonText}
          </div>
        )}
        <div style={titleStyle}>{title}</div>
      </div>

      {/* Center - Additional content */}
      {children && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {children}
        </div>
      )}

      {/* Right side - Role badge */}
      {role && (
        <div style={getRoleBadgeStyle(role)}>
          <span>{getRoleIcon(role)}</span>
          <span>{getRoleText(role, roleDisplay)}</span>
        </div>
      )}
    </header>
  );
};

export default PageHeader;
