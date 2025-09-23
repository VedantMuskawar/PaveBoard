import React, { useEffect, useRef, useState } from 'react';

const PositionedModal = ({ 
  isOpen, 
  onClose, 
  title,
  children, 
  position = { x: 0, y: 0 }, // Keep for API compatibility but not used
  size = 'md',
  className = '',
  closeOnBackdrop = true,
  ...props 
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      
      {/* Modal Container - Properly centered and sticky to viewport */}
      <div 
        className="relative w-full max-h-[95vh] flex flex-col"
        style={{
          maxHeight: '95vh'
        }}
      >
        {/* Modal */}
        <div 
          ref={modalRef}
          className={`relative bg-[#1f1f1f] rounded-2xl shadow-2xl border border-white/08 ${sizes[size]} w-full flex flex-col ${className}`}
          style={{
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-white/06 flex-shrink-0">
              <h3 className="text-lg font-semibold text-[#f3f3f3]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] flex-shrink-0"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionedModal;
