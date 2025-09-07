import React from 'react';

const PaginationComponent = ({ 
  hasMore = false,
  loading = false,
  onLoadMore,
  loadingText = "Loading...",
  loadMoreText = "Load More",
  endText = "All items loaded",
  showDebug = false,
  debugInfo = {},
  className = ""
}) => {
  const containerStyle = {
    textAlign: "center",
    marginTop: "1.5rem"
  };

  const debugStyle = {
    fontSize: "0.8rem",
    color: "#666",
    marginBottom: "0.5rem",
    fontFamily: "monospace"
  };

  const buttonStyle = {
    background: "#007bff",
    color: "white",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    padding: "0.7rem 2rem",
    fontSize: "1rem",
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: "0 2px 10px rgba(0,123,255,0.15)",
    opacity: loading ? 0.7 : 1,
    transition: "all 200ms ease"
  };

  const endStateStyle = {
    color: "#666",
    fontSize: "0.9rem",
    padding: "1rem",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)"
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Debug Information */}
      {showDebug && Object.keys(debugInfo).length > 0 && (
        <div style={debugStyle}>
          Debug: {Object.entries(debugInfo).map(([key, value]) => 
            `${key}=${value.toString()}`
          ).join(', ')}
        </div>
      )}
      
      {/* Load More Button */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          style={buttonStyle}
          aria-label={loading ? loadingText : loadMoreText}
        >
          {loading ? (
            <>
              <div style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                border: "2px solid transparent",
                borderTop: "2px solid currentColor",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginRight: "0.5rem"
              }} />
              {loadingText}
            </>
          ) : (
            loadMoreText
          )}
        </button>
      )}
      
      {/* End State */}
      {!hasMore && (
        <div style={endStateStyle}>
          {endText}
        </div>
      )}
    </div>
  );
};

export default PaginationComponent;
