import { useMemo } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { OrganizationProvider } from './contexts/OrganizationContext.jsx';
import AppContent from './components/AppContent.jsx';

function App() {
  // Memoize toast options to prevent unnecessary re-renders
  const toastOptions = useMemo(() => ({
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
    },
    success: {
      duration: 3000,
      iconTheme: {
        primary: '#4ade80',
        secondary: '#fff',
      },
    },
    error: {
      duration: 5000,
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
    },
  }), []);

  return (
    <Router>
      <OrganizationProvider>
        <Toaster 
          position="top-right"
          toastOptions={toastOptions}
        />
        <AppContent />
      </OrganizationProvider>
    </Router>
  );
}

export default App;
