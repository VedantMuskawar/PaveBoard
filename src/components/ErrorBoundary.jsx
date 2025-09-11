import React from 'react';
import { ErrorBoundary } from './ui';

// Enhanced Error Boundary with detailed error handling
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Here you could send error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // In production, you would send this to your error monitoring service
    // For now, we'll just store it locally for debugging
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };
      
      // Store in sessionStorage for debugging
      sessionStorage.setItem('lastError', JSON.stringify(errorData));
    } catch (e) {
      // Silently fail if we can't log the error
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const isNetworkError = error?.message?.includes('network') || 
                           error?.message?.includes('fetch') ||
                           error?.message?.includes('connection');
      
      const isFirestoreError = error?.code?.startsWith('firestore/') ||
                              error?.message?.includes('firestore');

      return (
        <div style={{
          minHeight: '100vh',
          background: 'radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)',
          color: '#f5f5f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(28,28,30,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '3rem',
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
          }}>
            {/* Error Icon */}
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
              {isNetworkError ? '🌐' : isFirestoreError ? '🔥' : '⚠️'}
            </div>
            
            {/* Error Title */}
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: '#ffffff'
            }}>
              {isNetworkError ? 'Connection Issue' : 
               isFirestoreError ? 'Database Error' : 
               'Something Went Wrong'}
            </h1>
            
            {/* Error Message */}
            <p style={{
              fontSize: '1rem',
              lineHeight: '1.6',
              marginBottom: '2rem',
              color: '#a1a1aa'
            }}>
              {isNetworkError ? 
                'Unable to connect to the server. Please check your internet connection.' :
                isFirestoreError ?
                'There was an issue accessing the database. Please try again.' :
                'An unexpected error occurred. Our team has been notified.'
              }
            </p>
            
            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <details style={{
                marginBottom: '2rem',
                textAlign: 'left',
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                  Error Details (Development)
                </summary>
                <pre style={{
                  color: '#ff6b6b',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {error?.message || 'Unknown error'}
                  {error?.stack && `\n\nStack Trace:\n${error.stack}`}
                </pre>
              </details>
            )}
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                style={{
                  background: retryCount >= 3 ? 
                    'rgba(255,255,255,0.1)' : 
                    'linear-gradient(135deg, #0A84FF, #0066CC)',
                  color: retryCount >= 3 ? '#666' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: retryCount >= 3 ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                  opacity: retryCount >= 3 ? 0.5 : 1
                }}
              >
                {retryCount >= 3 ? 'Max Retries Reached' : '🔄 Try Again'}
              </button>
              
              <button
                onClick={this.handleReload}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#f5f5f7',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
              >
                🔄 Reload Page
              </button>
            </div>
            
            {/* Retry Counter */}
            {retryCount > 0 && (
              <p style={{
                fontSize: '0.875rem',
                color: '#666',
                marginTop: '1.5rem'
              }}>
                Retry attempts: {retryCount}/3
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
