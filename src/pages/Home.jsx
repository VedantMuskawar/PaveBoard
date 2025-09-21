import { useEffect, useState, Suspense, lazy, useMemo, useCallback, useRef } from "react";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../contexts/OrganizationContext";
import { toast } from "react-hot-toast";
import "./Home.css";

// Import reusable UI components
import { 
  Button,
  Card,
  Modal,
  Avatar,
  Badge,
  Divider
} from "../components/ui";

// Lazy load heavy components for better performance
const OrdersDashboard = lazy(() => import("./order/OrdersDashboard"));
const PendingOrders = lazy(() => import("./order/PendingOrders"));
const DieselLedger = lazy(() => import("./order/DieselLedger"));
const ProductionEntriesPage = lazy(() => import("./production & labour/ProductionEntriesPage"));
const VehicleLabourEntry = lazy(() => import("./production & labour/VehicleLabourEntry"));
const VehicleLabourWeeklyLedger = lazy(() => import("./production & labour/VehicleLabourWeeklyLedger"));
const LabourManagement = lazy(() => import("./production & labour/LabourManagement"));
const LedgerPage = lazy(() => import("./production & labour/LedgerPage"));
const ClientLedger = lazy(() => import("./accounting/ClientLedger"));
const IncomeLedger = lazy(() => import("./accounting/IncomeLedger"));
const ExpenseManagement = lazy(() => import("./accounting/ExpenseManagement"));
const CashLedger = lazy(() => import("./accounting/CashLedger"));
const VendorManagement = lazy(() => import("./procurement/VendorManagement"));
const ProcurementEntry = lazy(() => import("./procurement/ProcurementEntry"));
const ProcurementReport = lazy(() => import("./procurement/ProcurementReport"));
const VehicleManagement = lazy(() => import("./vehicle operations/VehicleManagement"));
const VehicleWagesManagement = lazy(() => import("./vehicle operations/VehicleWages"));
const ScheduledOrdersDashboard = lazy(() => import("./ScheduledOrdersDashboard"));

// Loading component for Suspense fallback
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Reusable error boundary component
const ErrorBoundary = ({ children, fallbackTitle, fallbackMessage }) => {
  try {
    return children;
  } catch (error) {
    console.error(`❌ Error rendering ${fallbackTitle}:`, error);
    return (
      <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
        <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
          <h2>Error loading {fallbackTitle}</h2>
          <p>{fallbackMessage || error.message}</p>
          <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
            {error.stack}
          </pre>
        </div>
      </div>
    );
  }
};

function Home() {
  const [userName, setUserName] = useState("User");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [pageVisibility, setPageVisibility] = useState({});
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [currentView, setCurrentView] = useState("home"); // "home", "dashboard", "orders-dashboard", "diesel-ledger", "production-entry", "vehicle-labour-entry", "vehicle-labour-ledger", "labour-management", "client-ledger", "income-ledger", "expense-management", "cash-ledger", "vendor-management", "procurement-entry", "procurement-report", "vehicle-management", "vehicle-wages", or "scheduled-orders"

  // Debounced localStorage operations to prevent excessive writes
  const debouncedSaveSettings = useCallback(
    (() => {
      let timeoutId;
      return (pageVisibility, sectionVisibility) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          try {
            localStorage.setItem('adminPageVisibility', JSON.stringify(pageVisibility));
            localStorage.setItem('adminSectionVisibility', JSON.stringify(sectionVisibility));
          } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
          }
        }, 300);
      };
    })(),
    []
  );
  
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg, clearOrganization, isLoading: orgLoading } = useOrganization();

  // Memoize sections array to prevent recreation on every render
  const sections = useMemo(() => {
    const isAdmin = selectedOrg?.role === 0;
    
    return [
      {
        label: "📦 Orders And Vehicle",
        items: [
          { emoji: "📋", title: "Orders Dashboard", path: "/home/orders" },
          { emoji: "⏳", title: "Pending Orders", path: "/home/pending-orders" },
          { emoji: "⛽", title: "Diesel Ledger", path: "/home/diesel-ledger" },
          { emoji: "🚛", title: "Vehicle Management", path: "/home/manage-vehicle" },
          ...(isAdmin ? [{ emoji: "💰", title: "Vehicle Wages", path: "/home/vehicle-wages" }] : []),
        ]
      },
      {
        label: "🏭 Production & Labour",
        items: [
          { emoji: "🏭", title: "Production Entries", path: "/home/production-entries" },
          { emoji: "👷‍♂️", title: "Vehicle Labour Entry", path: "/home/v-labour-entry" },
          { emoji: "📊", title: "Vehicle Labour Ledger", path: "/home/v-labour-ledger" },
          { emoji: "👥", title: "Labour Management", path: "/home/manage-labour" },
          { emoji: "📋", title: "Unified Ledger", path: "/home/ledger" },
        ]
      },
      {
        label: "💼 Financial Management",
        items: [
          { emoji: "📊", title: "Client Ledger", path: "/home/client-ledger" },
          { emoji: "📈", title: "Income Ledger", path: "/home/income-ledger" },
          { emoji: "💸", title: "Expense Management", path: "/home/raw-material-entry" },
          { emoji: "💳", title: "Cash Ledger", path: "/home/cash-ledger" }
        ]
      },
      {
        label: "🏢 Procurement Management",
        items: [
          { emoji: "🏢", title: "Vendor Management", path: "/home/vendor-management" },
          { emoji: "📝", title: "Procurement Entry", path: "/home/procurement-entry" },
          { emoji: "📊", title: "Procurement Reports", path: "/home/procurement-report" }
        ]
      }
    ];
  }, [selectedOrg]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Use organization member name if available, otherwise fall back to user data
      const name = selectedOrg?.member?.name || selectedOrg?.name || user.displayName || user.email || user.phoneNumber || "User";
      setUserName(name);
    } else {
      navigate("/");
      return;
    }

    // Check if organization is selected (only after loading is complete)
    if (!orgLoading && !selectedOrg) {
      navigate("/select-organization");
      return;
    }
  }, [navigate, selectedOrg, orgLoading]);

  // Memoize localStorage reads to prevent excessive reads
  const savedSettings = useMemo(() => {
    try {
      const savedPageVisibility = localStorage.getItem('adminPageVisibility');
      const savedSectionVisibility = localStorage.getItem('adminSectionVisibility');
      
      return {
        pageVisibility: savedPageVisibility ? JSON.parse(savedPageVisibility) : {},
        sectionVisibility: savedSectionVisibility ? JSON.parse(savedSectionVisibility) : {}
      };
    } catch (error) {
      console.error('Failed to parse saved settings:', error);
      return { pageVisibility: {}, sectionVisibility: {} };
    }
  }, []); // Remove selectedOrg dependency since settings are global

  // Initialize page visibility state
  useEffect(() => {
    if (selectedOrg) {
      const initialSectionVisibility = {};
      const initialPageVisibility = {};
      
      sections.forEach((section, sectionIndex) => {
        // Use saved setting or default to true
        initialSectionVisibility[sectionIndex] = savedSettings.sectionVisibility[sectionIndex] !== false;
        
        section.items.forEach((item, itemIndex) => {
          // Use saved setting or default to true
          initialPageVisibility[`${sectionIndex}-${itemIndex}`] = savedSettings.pageVisibility[`${sectionIndex}-${itemIndex}`] !== false;
        });
      });
      
      setSectionVisibility(initialSectionVisibility);
      setPageVisibility(initialPageVisibility);
    }
  }, [selectedOrg, sections, savedSettings]);



  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  // Memoized view mapping for efficient lookups
  const viewMapping = useMemo(() => ({
    "Orders Dashboard": "orders-dashboard",
    "Pending Orders": "pending-orders",
    "Diesel Ledger": "diesel-ledger",
    "Vehicle Management": "vehicle-management",
    "Vehicle Wages": "vehicle-wages",
    "Production Entries": "production-entries",
    "Vehicle Labour Entry": "vehicle-labour-entry",
    "Vehicle Labour Ledger": "vehicle-labour-ledger",
    "Labour Management": "labour-management",
    "Unified Ledger": "ledger",
    "Client Ledger": "client-ledger",
    "Income Ledger": "income-ledger",
    "Expense Management": "expense-management",
    "Cash Ledger": "cash-ledger",
    "Vendor Management": "vendor-management",
    "Procurement Entry": "procurement-entry",
    "Procurement Reports": "procurement-report"
  }), []);

  const handlePageClick = useCallback((item) => {
    // Check user role for access control
    const isAdmin = selectedOrg?.role === 0;
    
    // Managers cannot access Vehicle Operations pages
    if (!isAdmin && (item.title.includes("Vehicle Management") || item.title.includes("Vehicle Wages"))) {
      toast.error("Access Denied: You don't have permission to access Vehicle Operations.");
      return;
    }
    
    // Use lookup for efficient view switching
    const viewKey = viewMapping[item.title];
    if (viewKey) {
      setCurrentView(viewKey);
      return;
    }
    
    // For other pages, show a toast message since they are not implemented yet
    toast(`${item.title} - Coming Soon!`);
  }, [selectedOrg?.role, viewMapping]);

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    toast("Edit profile functionality coming soon!");
    setShowProfileDropdown(false);
  };

  const handleNavigationClick = useCallback((view) => {
    // Add a subtle delay for smooth transition
    setTimeout(() => {
      setCurrentView(view);
    }, 100);
  }, []);

  const toggleProfileDropdown = useCallback(() => {
    setShowProfileDropdown(prev => !prev);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

    const renderHomeView = useCallback(() => (
    <div className="w-full px-6">
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sections.map((section, sectionIndex) => {
          // Check user role for access control
          const isAdmin = selectedOrg?.role === 0;
          const isManager = selectedOrg?.role !== 0;
          
          // Managers cannot access Vehicle Operations section
          if (isManager && section.label === "🚗 Vehicle Operations") {
            return null;
          }
          
          // Admins always see everything, managers see only what's allowed
          const sectionVisible = isAdmin || sectionVisibility[sectionIndex];
          
          if (!sectionVisible) return null;
          
          return (
            <div key={sectionIndex} className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-500">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
                <h3 className="text-2xl font-extrabold text-gray-100 tracking-tight leading-tight flex items-center gap-3">
                  <span className="text-3xl filter drop-shadow-lg">{section.label.split(' ')[0]}</span>
                  <span className="text-gray-200 font-semibold">{section.label.split(' ').slice(1).join(' ')}</span>
                </h3>
              </div>
              
              {/* Section Content */}
              <div className="grid grid-cols-2 gap-6">
                {section.items.map((item, itemIndex) => {
                  // Admins always see everything, managers see only what's allowed
                  const pageVisible = isAdmin || pageVisibility[`${sectionIndex}-${itemIndex}`];
                  
                  if (!pageVisible) return null;
                  
                  return (
                    <DashboardCard
                      key={itemIndex}
                      emoji={item.emoji}
                      title={item.title}
                      path={item.path}
                      adminUnlocked={adminUnlocked}
                      navigate={navigate}
                      onClick={() => handlePageClick(item)}
                      sectionType={section.label}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ), [sections, selectedOrg, sectionVisibility, pageVisibility, adminUnlocked, handlePageClick]);

  // Memoized view renderer map
  const viewRenderers = useMemo(() => ({
    "orders-dashboard": () => (
      <ErrorBoundary fallbackTitle="Orders Dashboard">
        <Suspense fallback={<LoadingSpinner message="Loading Orders Dashboard..." />}>
          <OrdersDashboard onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "pending-orders": () => (
      <ErrorBoundary fallbackTitle="Pending Orders">
        <Suspense fallback={<LoadingSpinner message="Loading Pending Orders..." />}>
          <PendingOrders onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "scheduled-orders": () => (
      <ErrorBoundary fallbackTitle="Scheduled Orders">
        <Suspense fallback={<LoadingSpinner message="Loading Scheduled Orders..." />}>
          <ScheduledOrdersDashboard onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "diesel-ledger": () => (
      <ErrorBoundary fallbackTitle="Diesel Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Diesel Ledger..." />}>
          <DieselLedger onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "production-entries": () => (
      <ErrorBoundary fallbackTitle="Production Entries">
        <Suspense fallback={<LoadingSpinner message="Loading Production Entries..." />}>
          <ProductionEntriesPage onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "vehicle-labour-entry": () => (
      <ErrorBoundary fallbackTitle="Vehicle Labour Entry">
        <Suspense fallback={<LoadingSpinner message="Loading Vehicle Labour Entry..." />}>
          <VehicleLabourEntry onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "vehicle-labour-ledger": () => (
      <ErrorBoundary fallbackTitle="Vehicle Labour Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Vehicle Labour Ledger..." />}>
          <VehicleLabourWeeklyLedger onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "labour-management": () => (
      <ErrorBoundary fallbackTitle="Labour Management">
        <Suspense fallback={<LoadingSpinner message="Loading Labour Management..." />}>
          <LabourManagement onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "ledger": () => (
      <ErrorBoundary fallbackTitle="Unified Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Unified Ledger..." />}>
          <LedgerPage onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "client-ledger": () => (
      <ErrorBoundary fallbackTitle="Client Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Client Ledger..." />}>
          <ClientLedger onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "income-ledger": () => (
      <ErrorBoundary fallbackTitle="Income Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Income Ledger..." />}>
          <IncomeLedger onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "expense-management": () => (
      <ErrorBoundary fallbackTitle="Expense Management">
        <Suspense fallback={<LoadingSpinner message="Loading Expense Management..." />}>
          <ExpenseManagement onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "cash-ledger": () => (
      <ErrorBoundary fallbackTitle="Cash Ledger">
        <Suspense fallback={<LoadingSpinner message="Loading Cash Ledger..." />}>
          <CashLedger onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "vendor-management": () => (
      <ErrorBoundary fallbackTitle="Vendor Management">
        <Suspense fallback={<LoadingSpinner message="Loading Vendor Management..." />}>
          <VendorManagement onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "procurement-entry": () => (
      <ErrorBoundary fallbackTitle="Procurement Entry">
        <Suspense fallback={<LoadingSpinner message="Loading Procurement Entry..." />}>
          <ProcurementEntry onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "procurement-report": () => (
      <ErrorBoundary fallbackTitle="Procurement Report">
        <Suspense fallback={<LoadingSpinner message="Loading Procurement Report..." />}>
          <ProcurementReport onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "vehicle-management": () => (
      <ErrorBoundary fallbackTitle="Vehicle Management">
        <Suspense fallback={<LoadingSpinner message="Loading Vehicle Management..." />}>
          <VehicleManagement onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    ),
    "vehicle-wages": () => (
      <ErrorBoundary fallbackTitle="Vehicle Wages">
        <Suspense fallback={<LoadingSpinner message="Loading Vehicle Wages..." />}>
          <VehicleWagesManagement onBack={() => setCurrentView('home')} />
        </Suspense>
      </ErrorBoundary>
    )
  }), []);

  const renderDashboardView = useCallback(() => (
    <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
      <div className="w-full px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">📊 Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Active Orders</span>
                <span className="text-blue-400 font-bold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending Tasks</span>
                <span className="text-orange-400 font-bold">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">This Month Revenue</span>
                <span className="text-green-400 font-bold">₹2,45,000</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">🕒 Recent Activity</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                <span className="text-blue-400">📋</span> New order created
                <div className="text-xs text-gray-500">2 hours ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-green-400">⚡</span> Production entry completed
                <div className="text-xs text-gray-500">4 hours ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-purple-400">👷‍♂️</span> Labour entry updated
                <div className="text-xs text-gray-500">6 hours ago</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">🚀 Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setCurrentView("orders-dashboard")}
                className="w-full text-left p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
              >
                <span className="text-blue-400">📋</span> New Order
              </button>
              <button 
                onClick={() => setCurrentView("production-entries")}
                className="w-full text-left p-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
              >
                <span className="text-green-400">⚡</span> Production Entry
              </button>
              <button 
                onClick={() => setCurrentView("vehicle-labour-entry")}
                className="w-full text-left p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
              >
                <span className="text-purple-400">👷‍♂️</span> Labour Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[rgba(20,20,22,0.9)]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[rgba(15,15,17,0.95)] via-[rgba(20,20,22,0.95)] to-[rgba(15,15,17,0.95)] border-b border-[rgba(255,255,255,0.15)] backdrop-blur-[30px] sticky top-0 z-50 px-6 py-6 shadow-2xl">
        <div className="flex items-center justify-between w-full">
          {/* Left Side - Brand & Breadcrumb */}
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3 transition-all duration-500 ease-in-out">
              <span className="transition-all duration-500 ease-in-out">
                {                 currentView === "dashboard" ? "📊 Dashboard" :
                 currentView === "orders-dashboard" ? "📋 Orders Dashboard" : 
                 currentView === "pending-orders" ? "⏳ Pending Orders" :
                 currentView === "scheduled-orders" ? "Scheduled Orders" :
                 currentView === "diesel-ledger" ? "⛽ Diesel Ledger" :
                 currentView === "production-entries" ? "🏭 Production Entries" :
                 currentView === "vehicle-labour-entry" ? "👷‍♂️ Vehicle Labour Entry" :
                 currentView === "vehicle-labour-ledger" ? "📊 Vehicle Labour Ledger" :
                 currentView === "labour-management" ? "👥 Labour Management" :
                 currentView === "ledger" ? "📋 Unified Ledger" :
                 currentView === "client-ledger" ? "📊 Client Ledger" :
                 currentView === "income-ledger" ? "📈 Income Ledger" :
                 currentView === "expense-management" ? "💸 Expense Management" :
                 currentView === "cash-ledger" ? "💳 Cash Ledger" :
                 currentView === "vendor-management" ? "🏢 Vendor Management" :
                 currentView === "procurement-entry" ? "📝 Procurement Entry" :
                 currentView === "procurement-report" ? "📊 Procurement Reports" :
                 currentView === "vehicle-management" ? "🚛 Vehicle Management" :
                 currentView === "vehicle-wages" ? "💰 Vehicle Wages" :
                 `PaveHome - ${selectedOrg?.orgName}`}
              </span>
            </h1>
          </div>
          
          {/* Center - Navigation */}
          <div className="flex items-center space-x-3">
            {/* Home Button - Active State */}
            <button 
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-500 ease-in-out transform hover:scale-105 ${
                currentView === "home" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-105" 
                  : "bg-gray-700/30 text-gray-300 border border-gray-600/50 hover:bg-gray-600/40 hover:text-gray-200 hover:border-gray-500/60"
              }`}
              onClick={() => handleNavigationClick("home")}
            >
              <span className="transition-all duration-300 ease-in-out">Home</span>
            </button>
            
            
            {/* Scheduled Orders Button */}
            <button 
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-500 ease-in-out transform hover:scale-105 ${
                currentView === "scheduled-orders" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-105" 
                  : "bg-gray-700/30 text-gray-300 border border-gray-600/50 hover:bg-gray-600/40 hover:text-gray-200 hover:border-gray-500/60"
              }`}
              onClick={() => handleNavigationClick("scheduled-orders")}
            >
              <span className="transition-all duration-300 ease-in-out">Scheduled Orders</span>
            </button>
            
            {/* Dashboard Button */}
            <button 
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-500 ease-in-out transform hover:scale-105 ${
                currentView === "dashboard" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-105" 
                  : "bg-gray-700/30 text-gray-300 border border-gray-600/50 hover:bg-gray-600/40 hover:text-gray-200 hover:border-gray-500/60"
              }`}
              onClick={() => handleNavigationClick("dashboard")}
            >
              <span className="transition-all duration-300 ease-in-out">Dashboard</span>
            </button>
          </div>
          
          {/* Right Side - Profile & Actions */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate("/select-organization")}
              className="px-4 py-2 bg-gradient-to-r from-gray-700/50 to-gray-600/50 hover:from-gray-600/50 hover:to-gray-500/50 border-gray-500/50 hover:border-gray-400/50 transition-all duration-300"
            >
              <span className="mr-2 text-lg">🏢</span>
              <span className="font-medium">{selectedOrg?.orgName}</span>
            </Button>
            
            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <Button 
                variant="ghost"
                size="sm"
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-700/50"
              >
                <Avatar 
                  size="md" 
                  fallback={userName}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-200">{userName}</div>
                  <div className="text-xs text-gray-400">{selectedOrg?.member?.phoneNumber || selectedOrg?.phoneNumber || "No phone"}</div>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              
              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-2xl shadow-2xl z-50">
                  <div className="p-6">
                    {/* User Info */}
                    <div className="flex items-center space-x-4 mb-6">
                      <Avatar 
                        size="lg" 
                        fallback={userName}
                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-200">{userName}</h3>
                        <p className="text-sm text-gray-400">{selectedOrg?.member?.phoneNumber || selectedOrg?.phoneNumber || "No phone"}</p>
                        <Badge 
                          variant={selectedOrg?.role === 0 ? 'primary' : 'default'}
                          className="mt-2"
                        >
                          {selectedOrg?.role === 0 ? 'Admin' : 
                           selectedOrg?.role === 1 ? 'Manager' : 
                           selectedOrg?.role === 2 ? 'Member' : 'Home User'}
                        </Badge>
                      </div>
                    </div>
                    
                    <Divider />
                    
                    {/* Organization Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Organization</span>
                        <span className="text-sm font-medium text-gray-200">{selectedOrg?.orgName || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Status</span>
                        <Badge variant="success">Active</Badge>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="space-y-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleEditProfile}
                        className="w-full justify-start"
                      >
                        <span className="mr-2">✏️</span>
                        Edit Profile
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/select-organization")}
                        className="w-full justify-start"
                      >
                        <span className="mr-2">🏢</span>
                        Switch Organization
                      </Button>
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={handleLogout}
                        className="w-full justify-start"
                      >
                        <span className="mr-2">🚪</span>
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

            {/* Main Content */}
      <main className="flex-1 p-8 bg-[rgba(20,20,22,0.9)] relative">
        {/* Subtle background pattern for content area */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(25,25,27,0.3)] via-transparent to-[rgba(15,15,17,0.3)] pointer-events-none"></div>
        <div className="relative z-10 transition-all duration-500 ease-in-out">
          <div className={`transition-all duration-500 ease-in-out ${
            currentView === "home" ? "opacity-100 translate-y-0" : 
            currentView === "dashboard" ? "opacity-100 translate-y-0" :
            "opacity-100 translate-y-0"
          }`}>
            {(() => {
              if (currentView === "dashboard") return renderDashboardView();
              if (currentView === "home") return renderHomeView();
              
              const renderer = viewRenderers[currentView];
              if (renderer) {
                return (
                  <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
                    {renderer()}
                  </div>
                );
              }
              
              return renderHomeView();
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ emoji, title, onClick, path, adminUnlocked, navigate, sectionType }) {
  // Use page background color for tiles
  const colorScheme = "from-[rgba(20,20,22,0.9)] to-[rgba(20,20,22,0.9)] border-gray-400/50 hover:border-gray-300/70";

  return (
    <div
      className={`cursor-pointer transition-all duration-500 p-6 bg-gradient-to-br ${colorScheme} backdrop-blur-md rounded-2xl border hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-2 hover:scale-105 hover:bg-opacity-80 w-full h-32 flex flex-col justify-center items-center`}
      role="button"
      tabIndex={0}
      aria-label={title}
      title={`Click to access ${title}`}
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (title.includes("Vehicle Wages") && !adminUnlocked) {
          const pass = prompt("Enter Admin Password");
          if (pass === "0511") {
            setAdminUnlocked(true);
            navigate(path);
          }
        } else {
          navigate(path);
        }
      }}
      onKeyDown={(e) => {
        const ENTER = 13, SPACE = 32, LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40;
        const isActivate = e.keyCode === ENTER || e.keyCode === SPACE;
        if (isActivate) {
          e.preventDefault();
          e.currentTarget.click();
          return;
        }
        if ([LEFT, UP, RIGHT, DOWN].includes(e.keyCode)) {
          e.preventDefault();
          const cards = Array.from(document.querySelectorAll(".dash-card"));
          const currentIndex = cards.indexOf(e.currentTarget);
          if (currentIndex > -1) {
            const delta = (e.keyCode === LEFT || e.keyCode === UP) ? -1 : 1;
            const nextIndex = (currentIndex + delta + cards.length) % cards.length;
            const nextEl = cards[nextIndex];
            if (nextEl && typeof nextEl.focus === 'function') {
              nextEl.focus();
            }
          }
        }
      }}
    >
      <div className="text-center">
        <div className="text-4xl mb-4 filter drop-shadow-lg hover:scale-110 transition-transform duration-300">{emoji}</div>
        <div className="text-sm font-bold text-gray-100 leading-tight tracking-wide">{title}</div>
      </div>
    </div>
  );
}

export default Home;