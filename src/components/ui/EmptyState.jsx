import React from 'react';

/**
 * EmptyState Component
 * 
 * A reusable empty state component with Diesel Ledger styling.
 * Displays when there's no data to show, with customizable messages and actions.
 * 
 * Features:
 * - Dark theme with consistent styling
 * - Customizable icons and messages
 * - Optional action buttons
 * - Responsive design
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon/emoji to display (default: "📭")
 * @param {string} props.title - Main title/message
 * @param {string} props.subtitle - Optional subtitle/description
 * @param {React.ReactNode} props.action - Optional action button/component
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.compact - Whether to use compact spacing
 */
const EmptyState = ({ 
  icon = "📭", 
  title = "No data available", 
  subtitle, 
  action, 
  className = "", 
  style = {},
  compact = false
}) => {
  const containerStyles = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: compact ? "2rem 1rem" : "3rem 2rem",
    textAlign: "center",
    color: "#f5f5f7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    ...style
  };

  const iconStyles = {
    fontSize: compact ? "2.5rem" : "3.5rem",
    marginBottom: compact ? "1rem" : "1.5rem",
    opacity: 0.7
  };

  const titleStyles = {
    fontSize: compact ? "1.1rem" : "1.3rem",
    fontWeight: "600",
    color: "#f0f0f0",
    marginBottom: subtitle ? (compact ? "0.5rem" : "0.75rem") : "0"
  };

  const subtitleStyles = {
    fontSize: compact ? "0.9rem" : "1rem",
    color: "#9ba3ae",
    marginBottom: action ? (compact ? "1rem" : "1.5rem") : "0",
    maxWidth: "400px",
    lineHeight: "1.5"
  };

  return (
    <div style={containerStyles} className={className}>
      <div style={iconStyles}>{icon}</div>
      <div style={titleStyles}>{title}</div>
      {subtitle && <div style={subtitleStyles}>{subtitle}</div>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
