import React from 'react';

/**
 * DieselPage Component
 * 
 * A reusable page wrapper component that provides the Diesel Ledger's signature
 * dark theme styling, background gradient, and consistent layout structure.
 * 
 * Features:
 * - Radial gradient background matching Diesel Ledger
 * - Consistent typography and font smoothing
 * - Proper spacing and padding
 * - Dark theme color scheme
 * - Responsive design
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the page
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.fullHeight - Whether to use full viewport height
 * @param {string} props.padding - Custom padding (default: "0 2rem")
 * @param {string} props.marginTop - Custom margin top (default: "1.5rem")
 */
const DieselPage = ({ 
  children, 
  className = "", 
  style = {}, 
  fullHeight = true,
  padding = "0 2rem",
  marginTop = "1.5rem"
}) => {
  // Diesel Ledger page styles
  const pageStyles = {
    background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
    minHeight: fullHeight ? "100vh" : "auto",
    paddingBottom: "2rem",
    color: "#f5f5f7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    ...style
  };

  const contentStyles = {
    marginTop,
    padding,
    width: "100%",
    boxSizing: "border-box"
  };

  return (
    <div style={pageStyles} className={className}>
      {children}
    </div>
  );
};

export default DieselPage;
