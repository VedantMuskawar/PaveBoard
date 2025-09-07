import React from 'react';

/**
 * FilterBar Component
 * 
 * A reusable filter bar component with Diesel Ledger styling.
 * Provides a consistent layout for search inputs, filters, and action buttons.
 * 
 * Features:
 * - Dark theme with backdrop blur effect
 * - Flexible layout for buttons and inputs
 * - Consistent spacing and styling
 * - Support for multiple action buttons
 * - Responsive design
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the filter bar
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.compact - Whether to use compact spacing
 */
const FilterBar = ({ 
  children, 
  className = "", 
  style = {},
  compact = false
}) => {
  const filterBarStyles = {
    background: "#181c1f",
    borderRadius: "8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    padding: compact ? "1rem 1.5rem" : "2rem",
    marginBottom: compact ? "1rem" : "2rem",
    maxWidth: "1200px",
    margin: "0 auto 2rem auto",
    display: "flex",
    flexWrap: "wrap",
    gap: compact ? "1rem" : "1.5rem",
    alignItems: "center",
    justifyContent: "space-between",
    ...style
  };

  return (
    <div style={filterBarStyles} className={className}>
      {children}
    </div>
  );
};

/**
 * FilterBar Actions Component
 * 
 * A sub-component for grouping action buttons in the filter bar.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Action buttons to render
 * @param {string} props.className - Additional CSS classes
 */
const FilterBarActions = ({ children, className = "" }) => {
  const actionsStyles = {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    flexWrap: "wrap"
  };

  return (
    <div style={actionsStyles} className={className}>
      {children}
    </div>
  );
};

/**
 * FilterBar Search Component
 * 
 * A sub-component for search input in the filter bar.
 * 
 * @param {Object} props - Component props
 * @param {string} props.placeholder - Placeholder text for the search input
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Change handler for the search input
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
const FilterBarSearch = ({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className = "", 
  style = {} 
}) => {
  const searchStyles = {
    padding: "0.5rem",
    width: "200px",
    background: "#222",
    border: "1px solid #444",
    color: "white",
    borderRadius: "6px",
    fontSize: "0.95rem",
    ...style
  };

  return (
    <input
      style={searchStyles}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      aria-label={placeholder}
    />
  );
};

// Export the main component and sub-components
FilterBar.Actions = FilterBarActions;
FilterBar.Search = FilterBarSearch;

export default FilterBar;
