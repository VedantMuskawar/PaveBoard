import React from 'react';
import PositionedModal from './PositionedModal';

/**
 * PositionedConfirmationModal Component
 * 
 * A confirmation modal that positions itself relative to a specific location
 * (like near a button that was clicked).
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {string} props.title - Modal title
 * @param {string} props.message - Main confirmation message
 * @param {string} props.subtitle - Optional subtitle/additional info
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.confirmVariant - Variant for confirm button (default: "danger")
 * @param {string} props.cancelVariant - Variant for cancel button (default: "outline")
 * @param {Function} props.onConfirm - Function to call when confirmed
 * @param {boolean} props.loading - Whether the confirmation action is loading
 * @param {string} props.icon - Optional icon/emoji to display
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.position - Position object with x, y coordinates
 */
const PositionedConfirmationModal = ({
  isOpen,
  onClose,
  title = "Confirm Action",
  message,
  subtitle,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  cancelVariant = "outline",
  onConfirm,
  loading = false,
  icon,
  className = "",
  position = { x: 0, y: 0 }
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const iconStyles = {
    fontSize: "2rem",
    marginBottom: "1rem",
    opacity: 0.8
  };

  const titleStyles = {
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "#f0f0f0",
    marginBottom: "0.5rem"
  };

  const messageStyles = {
    fontSize: "1rem",
    color: "#e0e0e0",
    marginBottom: subtitle ? "0.5rem" : "0",
    lineHeight: "1.5"
  };

  const subtitleStyles = {
    fontSize: "0.9rem",
    color: "#9ba3ae",
    marginBottom: "1.5rem",
    lineHeight: "1.4"
  };

  const buttonContainerStyles = {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    marginTop: "1.5rem"
  };

  return (
    <PositionedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      position={position}
      size="sm"
    >
      <div style={{ textAlign: "center" }}>
        {icon && <div style={iconStyles}>{icon}</div>}
        <div style={titleStyles}>{title}</div>
        {message && <div style={messageStyles}>{message}</div>}
        {subtitle && <div style={subtitleStyles}>{subtitle}</div>}
        
        <div style={buttonContainerStyles}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              color: "#9ba3ae",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.2s ease"
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              background: confirmVariant === "danger" 
                ? "linear-gradient(180deg, #FF453A, #D70015)" 
                : "linear-gradient(180deg, #0A84FF, #0066CC)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}
          >
            {loading ? "⏳ Processing..." : confirmText}
          </button>
        </div>
      </div>
    </PositionedModal>
  );
};

export default PositionedConfirmationModal;
