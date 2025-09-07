import React from 'react';

/**
 * LoadingState Component
 * 
 * A reusable loading state component with Diesel Ledger styling.
 * Provides consistent loading indicators for different scenarios.
 * 
 * Features:
 * - Dark theme with Diesel Ledger background
 * - Multiple loading variants (page, inline, skeleton)
 * - Consistent typography and spacing
 * - Customizable messages and icons
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Loading variant: 'page', 'inline', 'skeleton'
 * @param {string} props.message - Loading message to display
 * @param {string} props.icon - Icon/emoji to display (default: "⏳")
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.fullHeight - Whether to use full height (for page variant)
 */
const LoadingState = ({ 
  variant = "inline", 
  message = "Loading...", 
  icon = "⏳", 
  className = "", 
  style = {},
  fullHeight = true
}) => {
  // Base styles for all variants
  const baseStyles = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#f5f5f7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale"
  };

  // Variant-specific styles
  const variantStyles = {
    page: {
      ...baseStyles,
      background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
      minHeight: fullHeight ? "100vh" : "50vh",
      paddingBottom: "2rem"
    },
    inline: {
      ...baseStyles,
      padding: "2rem",
      minHeight: "200px"
    },
    skeleton: {
      ...baseStyles,
      padding: "1rem",
      minHeight: "100px"
    }
  };

  const iconStyles = {
    fontSize: variant === "page" ? "3rem" : "2rem",
    marginBottom: variant === "page" ? "1rem" : "0.5rem",
    opacity: 0.8
  };

  const messageStyles = {
    color: variant === "page" ? "#8e8e93" : "#9ba3ae",
    fontSize: variant === "page" ? "1.1rem" : "0.95rem",
    fontWeight: variant === "page" ? "500" : "400"
  };

  return (
    <div style={variantStyles[variant]} className={className}>
      <div style={iconStyles}>{icon}</div>
      <div style={messageStyles}>{message}</div>
    </div>
  );
};

/**
 * SkeletonLoader Component
 * 
 * A skeleton loading component for table rows and cards.
 * 
 * @param {Object} props - Component props
 * @param {number} props.rows - Number of skeleton rows to display
 * @param {string} props.className - Additional CSS classes
 */
const SkeletonLoader = ({ rows = 5, className = "" }) => {
  const skeletonRowStyles = {
    background: "rgba(28,28,30,0.42)",
    borderRadius: "8px",
    margin: "0.5rem 0",
    height: "40px",
    animation: "pulse 1.5s ease-in-out infinite alternate"
  };

  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={skeletonRowStyles} />
      ))}
    </div>
  );
};

// Export both components
export { LoadingState, SkeletonLoader };
export default LoadingState;
