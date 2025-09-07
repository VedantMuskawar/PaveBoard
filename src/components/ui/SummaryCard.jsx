import React from 'react';

/**
 * SummaryCard Component
 * 
 * A reusable card component for displaying summary statistics with Diesel Ledger styling.
 * Used for showing totals, counts, and key metrics in a consistent dark theme.
 * 
 * Features:
 * - Dark theme with subtle shadows
 * - Flexible layout for different content types
 * - Consistent spacing and typography
 * - Support for icons and colored values
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Main title/label for the summary
 * @param {string|number} props.value - The main value to display
 * @param {string} props.valueColor - Color for the value (default: "#f0f0f0")
 * @param {string} props.icon - Optional icon/emoji to display
 * @param {React.ReactNode} props.children - Additional content (stats, breakdowns, etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.compact - Whether to use compact spacing
 */
const SummaryCard = ({ 
  title, 
  value, 
  valueColor = "#f0f0f0", 
  icon, 
  children, 
  className = "", 
  style = {},
  compact = false
}) => {
  const cardStyles = {
    background: "#1e1e1e",
    padding: compact ? "0.75rem 1.5rem" : "1rem 2rem",
    borderRadius: "12px",
    margin: compact ? "0.5rem 0" : "1rem 0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#f0f0f0",
    ...style
  };

  return (
    <div style={cardStyles} className={className}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {icon && <span style={{ fontSize: "1.2rem" }}>{icon}</span>}
        <span>{title}</span>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ color: valueColor, fontWeight: "bold", fontSize: "1.2rem" }}>
          {value}
        </span>
        {children}
      </div>
    </div>
  );
};

export default SummaryCard;
