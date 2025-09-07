import React from 'react';

/**
 * DateRangeFilter Component
 * 
 * A reusable date range filter component with Diesel Ledger styling.
 * Provides consistent date filtering across the application.
 * 
 * Features:
 * - Dark theme with Diesel Ledger styling
 * - Start and end date inputs
 * - Customizable labels and styling
 * - Consistent spacing and layout
 * 
 * @param {Object} props - Component props
 * @param {string} props.startDate - Start date value
 * @param {string} props.endDate - End date value
 * @param {Function} props.onStartDateChange - Handler for start date changes
 * @param {Function} props.onEndDateChange - Handler for end date changes
 * @param {string} props.startLabel - Label for start date (default: "From")
 * @param {string} props.endLabel - Label for end date (default: "To")
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.compact - Whether to use compact spacing
 */
const DateRangeFilter = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "From",
  endLabel = "To",
  className = "",
  style = {},
  compact = false
}) => {
  const containerStyles = {
    display: "flex",
    alignItems: "center",
    gap: compact ? "0.75rem" : "1rem",
    marginBottom: compact ? "0.75rem" : "1.1rem",
    flexWrap: "wrap",
    ...style
  };

  const labelStyles = {
    color: "#ccc",
    fontSize: compact ? "0.9rem" : "1rem",
    fontWeight: "500",
    minWidth: "fit-content"
  };

  const inputStyles = {
    background: "#222",
    color: "white",
    border: "1px solid #444",
    borderRadius: "6px",
    padding: compact ? "0.3rem 0.5rem" : "0.4rem",
    fontSize: compact ? "0.9rem" : "1rem",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
    outline: "none"
  };

  const inputFocusStyles = {
    borderColor: "#0A84FF",
    boxShadow: "0 0 0 2px rgba(10, 132, 255, 0.2)"
  };

  return (
    <div style={containerStyles} className={className}>
      <label style={labelStyles}>{startLabel}:</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        style={inputStyles}
        aria-label={`${startLabel} date`}
        onFocus={(e) => {
          Object.assign(e.target.style, inputFocusStyles);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#444";
          e.target.style.boxShadow = "none";
        }}
      />
      
      <span style={labelStyles}>to</span>
      
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        style={inputStyles}
        aria-label={`${endLabel} date`}
        onFocus={(e) => {
          Object.assign(e.target.style, inputFocusStyles);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#444";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
};

export default DateRangeFilter;
