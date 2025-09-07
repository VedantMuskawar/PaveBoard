import React from 'react';
import toast from 'react-hot-toast';

const Toast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#10b981',
        secondary: '#1e293b',
      },
      duration: 4000,
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#1e293b',
      },
      duration: 5000,
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast(message, {
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#3b82f6',
        secondary: '#1e293b',
      },
      duration: 3000,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      ...options,
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};

export default Toast;
