import React from 'react';

const FormModal = ({ 
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",
  showCancel = true,
  loading = false,
  size = "md", // "sm", "md", "lg", "xl"
  className = "",
  closeOnBackdrop = true
}) => {
  const sizes = {
    sm: { maxWidth: "400px" },
    md: { maxWidth: "500px" },
    lg: { maxWidth: "700px" },
    xl: { maxWidth: "900px" }
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "0.5rem",
    overflowY: "auto"
  };

  const contentStyle = {
    background: "#1f1f1f",
    padding: "2rem",
    borderRadius: "14px",
    boxShadow: "0 6px 32px rgba(0,0,0,0.45)",
    width: "100%",
    maxWidth: sizes[size].maxWidth,
    maxHeight: "90vh",
    overflowY: "auto",
    color: "#f3f3f3",
    display: "flex",
    flexDirection: "column"
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem"
  };

  const titleStyle = {
    margin: 0,
    color: "#00c3ff",
    fontWeight: "bold",
    fontSize: "1.2rem"
  };

  const closeButtonStyle = {
    background: "transparent",
    border: "none",
    fontSize: "26px",
    color: "#ff4444",
    cursor: "pointer",
    marginLeft: "1rem",
    padding: "4px",
    borderRadius: "4px",
    transition: "background-color 200ms ease"
  };

  const footerStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "2rem",
    paddingTop: "1rem",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0
  };

  const submitButtonStyle = {
    background: "#00c3ff",
    color: "#181c1f",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    padding: "0.5rem 1.3rem",
    fontSize: "1rem",
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: "0 2px 10px rgba(0,195,255,0.15)",
    opacity: loading ? 0.7 : 1,
    transition: "all 200ms ease"
  };

  const cancelButtonStyle = {
    background: "transparent",
    color: "#ccc",
    fontWeight: "600",
    border: "1px solid #666",
    borderRadius: "8px",
    padding: "0.5rem 1.3rem",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 200ms ease"
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && onSubmit) {
      onSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={modalStyle} onClick={handleBackdropClick}>
      <div style={contentStyle} className={className} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <button
            onClick={handleCloseClick}
            style={closeButtonStyle}
            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255,68,68,0.1)"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            title="Close"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {children}
          </div>

          {/* Footer with buttons */}
          <div style={footerStyle}>
            {showCancel && (
              <button
                type="button"
                onClick={handleCloseClick}
                style={cancelButtonStyle}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.05)";
                  e.target.style.borderColor = "#999";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.borderColor = "#666";
                }}
              >
                {cancelText}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#0099cc";
                  e.target.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#00c3ff";
                  e.target.style.transform = "translateY(0)";
                }
              }}
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
                  Loading...
                </>
              ) : (
                submitText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormModal;
