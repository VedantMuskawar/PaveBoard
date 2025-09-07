import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import PrintDM from "../components/PrintDM.jsx";

const PrintDMPage = () => {
  const { dmNumber } = useParams();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const printDMRef = useRef();

  useEffect(() => {
    setIsClient(true);
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  const handlePrint = () => {
    if (printDMRef.current && printDMRef.current.handlePrint) {
      printDMRef.current.handlePrint();
    } else {
      window.print();
    }
  };

  if (!isClient || isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#141416',
        color: '#f5f5f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
          padding: '2rem',
          background: 'rgba(28,28,30,0.75)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem',
            background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 8px 20px rgba(10,132,255,0.25)'
          }}>
            🚚
          </div>
          
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            margin: '0 0 1rem',
            color: '#ffffff',
            letterSpacing: '-0.02em'
          }}>
            Loading Delivery Memo
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            margin: '0 0 2rem',
            color: '#a1a1aa',
            fontWeight: '400'
          }}>
            Preparing your document for printing...
          </p>
          
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid #0A84FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#141416',
        padding: '0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif',
        overflow: 'auto',
        position: 'relative'
      }}>
      {/* Header */}
      <div className="no-print" style={{
        background: 'rgba(20,20,22,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'padding 160ms ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: 'white',
            boxShadow: '0 8px 20px rgba(10,132,255,0.25)'
          }}>
            🚚
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}>
              Delivery Memo #{dmNumber}
            </h1>
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#a1a1aa',
              fontWeight: '400'
            }}>
              Print Preview & Document Management
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <button
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              boxShadow: '0 8px 20px rgba(10,132,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 12px 30px rgba(10,132,255,0.35)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 20px rgba(10,132,255,0.25)';
            }}
          >
            🖨️ Print
          </button>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#f5f5f7',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.15)';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.35)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
            }}
          >
            ← Back
          </button>
        </div>
      </div>
      
             {/* Main Content */}
             <div className="print-content" style={{
               padding: '1rem',
               display: 'flex',
               justifyContent: 'center',
               alignItems: 'flex-start',
               minHeight: 'calc(100vh - 80px)',
               position: 'relative',
               zIndex: 2,
               overflow: 'auto'
             }}>
            <PrintDM 
              ref={printDMRef}
              dmNumber={parseInt(dmNumber)} 
              isOpen={true}
              onClose={handleClose} 
            />
      </div>
    </div>
    </>
  );
};

export default PrintDMPage;