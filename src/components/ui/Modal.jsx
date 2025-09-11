import React, { useEffect, useRef, useState } from 'react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  children, 
  size = 'md',
  className = '',
  closeOnBackdrop = true,
  draggable = true,
  ...props 
}) => {
  const modalRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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

  // Drag functionality
  const handleMouseDown = (e) => {
    if (!draggable || !title) return; // Only allow dragging if draggable and has title (header)
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
        
        {/* Modal */}
        <div 
          ref={modalRef}
          className={`relative bg-[#1f1f1f] rounded-2xl shadow-2xl border border-white/08 ${sizes[size]} w-full ${className} ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {/* Header */}
          {title && (
            <div 
              className={`flex items-center justify-between p-6 border-b border-white/06 ${draggable ? 'cursor-grab select-none' : ''}`}
              onMouseDown={handleMouseDown}
            >
              <h3 className="text-lg font-semibold text-[#f3f3f3]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
