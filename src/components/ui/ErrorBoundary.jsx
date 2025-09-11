import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          background: 'rgba(28,28,30,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          margin: '2rem',
          color: '#f5f5f7',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#ff6b6b'
          }}>
            Something went wrong
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            marginBottom: '2rem',
            color: '#a1a1aa',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            We encountered an unexpected error. This might be a temporary issue.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: '0 8px 20px rgba(10,132,255,0.25)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 24px rgba(10,132,255,0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 20px rgba(10,132,255,0.25)';
              }}
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: '#f5f5f7',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🔄 Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '2rem', 
              textAlign: 'left',
              background: 'rgba(0,0,0,0.3)',
              padding: '1rem',
              borderRadius: '8px',
              maxWidth: '100%',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                <strong>Error Details (Development Only)</strong>
              </summary>
              <pre style={{ 
                fontSize: '0.875rem',
                color: '#ff6b6b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
