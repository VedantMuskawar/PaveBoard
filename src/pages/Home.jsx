import { useEffect, useState, Suspense, lazy, useMemo, useCallback } from "react";
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
const DieselLedger = lazy(() => import("./order/DieselLedger"));
const ProductionEntry = lazy(() => import("./production & labour/ProductionEntry"));
const VehicleLabourEntry = lazy(() => import("./production & labour/VehicleLabourEntry"));
const VehicleLabourWeeklyLedger = lazy(() => import("./production & labour/VehicleLabourWeeklyLedger"));
const LabourManagement = lazy(() => import("./production & labour/LabourManagement"));
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

function Home() {
  const [userName, setUserName] = useState("User");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [pageVisibility, setPageVisibility] = useState({});
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [currentView, setCurrentView] = useState("home"); // "home", "dashboard", "orders-dashboard", "diesel-ledger", "production-entry", "vehicle-labour-entry", "vehicle-labour-ledger", "labour-management", "client-ledger", "income-ledger", "expense-management", "cash-ledger", "vendor-management", "procurement-entry", "procurement-report", "vehicle-management", "vehicle-wages", or "scheduled-orders"
  
  // Debug currentView changes
  useEffect(() => {
    console.log("🔄 Current view changed to:", currentView);
  }, [currentView]);
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg, clearOrganization, isLoading: orgLoading } = useOrganization();

  useEffect(() => {
    console.log("Home: Organization state changed", { 
      orgLoading, 
      selectedOrg, 
      localStorage: localStorage.getItem('selectedOrganization')
    });
    
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

  // Initialize page visibility state
  useEffect(() => {
    if (selectedOrg) {
      // Load saved settings from localStorage
      const savedPageVisibility = localStorage.getItem('adminPageVisibility');
      const savedSectionVisibility = localStorage.getItem('adminSectionVisibility');
      
      const initialSectionVisibility = {};
      const initialPageVisibility = {};
      
      sections.forEach((section, sectionIndex) => {
        // Use saved setting or default to true
        initialSectionVisibility[sectionIndex] = savedSectionVisibility ? 
          JSON.parse(savedSectionVisibility)[sectionIndex] !== false : true;
        
        section.items.forEach((item, itemIndex) => {
          // Use saved setting or default to true
          initialPageVisibility[`${sectionIndex}-${itemIndex}`] = savedPageVisibility ? 
            JSON.parse(savedPageVisibility)[`${sectionIndex}-${itemIndex}`] !== false : true;
        });
      });
      
      setSectionVisibility(initialSectionVisibility);
      setPageVisibility(initialPageVisibility);
    }
  }, [selectedOrg]);



  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const handlePageClick = (item) => {
    // Check user role for access control
    const isAdmin = selectedOrg?.role === 0;
    
    // Managers cannot access Vehicle Operations pages
    if (!isAdmin && (item.title.includes("Vehicle Management") || item.title.includes("Vehicle Wages"))) {
      toast.error("Access Denied: You don't have permission to access Vehicle Operations.");
      return;
    }
    
    // Handle Orders Dashboard toggle
    if (item.title === "Orders Dashboard") {
      setCurrentView("orders-dashboard");
      return;
    }
    
    // Handle Diesel Ledger toggle
    if (item.title === "Diesel Ledger") {
      setCurrentView("diesel-ledger");
      return;
    }
    
    // Handle Production Entry toggle
    if (item.title === "Production Entry") {
      console.log("🏭 Production Entry clicked, setting currentView to production-entry");
      setCurrentView("production-entry");
      console.log("🏭 setCurrentView called, currentView should be:", "production-entry");
      return;
    }
    
    // Handle Vehicle Labour Entry toggle
    if (item.title === "Vehicle Labour Entry") {
      console.log("👷‍♂️ Vehicle Labour Entry clicked, setting currentView to vehicle-labour-entry");
      setCurrentView("vehicle-labour-entry");
      return;
    }
    
    // Handle Vehicle Labour Ledger toggle
    if (item.title === "Vehicle Labour Ledger") {
      console.log("📊 Vehicle Labour Ledger clicked, setting currentView to vehicle-labour-ledger");
      setCurrentView("vehicle-labour-ledger");
      return;
    }
    
    // Handle Labour Management toggle
    if (item.title === "Labour Management") {
      console.log("👥 Labour Management clicked, setting currentView to labour-management");
      setCurrentView("labour-management");
      return;
    }
    
    // Handle Client Ledger toggle
    if (item.title === "Client Ledger") {
      console.log("📊 Client Ledger clicked, setting currentView to client-ledger");
      setCurrentView("client-ledger");
      return;
    }
    
    // Handle Income Ledger toggle
    if (item.title === "Income Ledger") {
      console.log("📈 Income Ledger clicked, setting currentView to income-ledger");
      setCurrentView("income-ledger");
      return;
    }
    
    // Handle Expense Management toggle
    if (item.title === "Expense Management") {
      console.log("💸 Expense Management clicked, setting currentView to expense-management");
      setCurrentView("expense-management");
      return;
    }
    
    // Handle Cash Ledger toggle
    if (item.title === "Cash Ledger") {
      console.log("💳 Cash Ledger clicked, setting currentView to cash-ledger");
      setCurrentView("cash-ledger");
      return;
    }
    
    // Handle Vendor Management toggle
    if (item.title === "Vendor Management") {
      console.log("🏢 Vendor Management clicked, setting currentView to vendor-management");
      setCurrentView("vendor-management");
      return;
    }
    
    // Handle Procurement Entry toggle
    if (item.title === "Procurement Entry") {
      console.log("📝 Procurement Entry clicked, setting currentView to procurement-entry");
      setCurrentView("procurement-entry");
      return;
    }
    
    // Handle Procurement Reports toggle
    if (item.title === "Procurement Reports") {
      console.log("📊 Procurement Reports clicked, setting currentView to procurement-report");
      setCurrentView("procurement-report");
      return;
    }
    
    // Handle Vehicle Management toggle
    if (item.title === "Vehicle Management") {
      console.log("🚛 Vehicle Management clicked, setting currentView to vehicle-management");
      setCurrentView("vehicle-management");
      return;
    }
    
    // Handle Vehicle Wages toggle
    if (item.title === "Vehicle Wages") {
      console.log("💰 Vehicle Wages clicked, setting currentView to vehicle-wages");
      setCurrentView("vehicle-wages");
      return;
    }
    
    // Handle Scheduled Orders toggle
    if (item.title === "Scheduled Orders") {
      console.log("📅 Scheduled Orders clicked, setting currentView to scheduled-orders");
      setCurrentView("scheduled-orders");
      return;
    }
    
    // For other pages, show a toast message since they are not implemented yet
    toast.info(`${item.title} - Coming Soon!`);
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    toast.info("Edit profile functionality coming soon!");
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

    const renderHomeView = () => (
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
  );

  const renderOrdersDashboardView = () => (
    <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
      <Suspense fallback={<LoadingSpinner message="Loading Orders Dashboard..." />}>
        <OrdersDashboard onBack={() => setCurrentView('home')} />
      </Suspense>
    </div>
  );

  const renderDieselLedgerView = () => (
    <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
      <Suspense fallback={<LoadingSpinner message="Loading Diesel Ledger..." />}>
        <DieselLedger onBack={() => setCurrentView('home')} />
      </Suspense>
    </div>
  );

  const renderProductionEntryView = () => {
    console.log("🏭 Rendering Production Entry view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Production Entry..." />}>
            <ProductionEntry onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Production Entry:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Production Entry</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderVehicleLabourEntryView = () => {
    console.log("👷‍♂️ Rendering Vehicle Labour Entry view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Vehicle Labour Entry..." />}>
            <VehicleLabourEntry onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Vehicle Labour Entry:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Vehicle Labour Entry</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderVehicleLabourLedgerView = () => {
    console.log("📊 Rendering Vehicle Labour Ledger view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Vehicle Labour Ledger..." />}>
            <VehicleLabourWeeklyLedger onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Vehicle Labour Ledger:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Vehicle Labour Ledger</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderLabourManagementView = () => {
    console.log("👥 Rendering Labour Management view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Labour Management..." />}>
            <LabourManagement onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Labour Management:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Labour Management</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderClientLedgerView = () => {
    console.log("📊 Rendering Client Ledger view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Client Ledger..." />}>
            <ClientLedger onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Client Ledger:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Client Ledger</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderIncomeLedgerView = () => {
    console.log("📈 Rendering Income Ledger view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Income Ledger..." />}>
            <IncomeLedger onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Income Ledger:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Income Ledger</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderExpenseManagementView = () => {
    console.log("💸 Rendering Expense Management view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Expense Management..." />}>
            <ExpenseManagement onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Expense Management:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Expense Management</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderCashLedgerView = () => {
    console.log("💳 Rendering Cash Ledger view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Cash Ledger..." />}>
            <CashLedger onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Cash Ledger:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Cash Ledger</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderVendorManagementView = () => {
    console.log("🏢 Rendering Vendor Management view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Vendor Management..." />}>
            <VendorManagement onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Vendor Management:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Vendor Management</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderProcurementEntryView = () => {
    console.log("📝 Rendering Procurement Entry view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Procurement Entry..." />}>
            <ProcurementEntry onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Procurement Entry:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Procurement Entry</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderProcurementReportView = () => {
    console.log("📊 Rendering Procurement Report view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Procurement Report..." />}>
            <ProcurementReport onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Procurement Report:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Procurement Report</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderVehicleManagementView = () => {
    console.log("🚛 Rendering Vehicle Management view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Vehicle Management..." />}>
            <VehicleManagement onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Vehicle Management:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Vehicle Management</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderVehicleWagesView = () => {
    console.log("💰 Rendering Vehicle Wages view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Vehicle Wages..." />}>
            <VehicleWagesManagement onBack={() => setCurrentView('home')} />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Vehicle Wages:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Vehicle Wages</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderScheduledOrdersView = () => {
    console.log("📅 Rendering Scheduled Orders view");
    try {
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <Suspense fallback={<LoadingSpinner message="Loading Scheduled Orders..." />}>
            <ScheduledOrdersDashboard />
          </Suspense>
        </div>
      );
    } catch (error) {
      console.error("❌ Error rendering Scheduled Orders:", error);
      console.error("❌ Error stack:", error.stack);
      return (
        <div className="dashboard-inner-wrapper transition-all duration-300 ease-in-out">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff6b6b" }}>
            <h2>Error loading Scheduled Orders</h2>
            <p>{error.message}</p>
            <pre style={{ fontSize: "0.8rem", marginTop: "1rem", textAlign: "left" }}>
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
  };

  const renderDashboardView = () => {
    console.log("📊 Rendering Dashboard view");
    return (
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
                  onClick={() => setCurrentView("production-entry")}
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
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[rgba(20,20,22,0.9)]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[rgba(15,15,17,0.95)] via-[rgba(20,20,22,0.95)] to-[rgba(15,15,17,0.95)] border-b border-[rgba(255,255,255,0.15)] backdrop-blur-[30px] sticky top-0 z-50 px-6 py-6 shadow-2xl">
        <div className="flex items-center justify-between w-full">
          {/* Left Side - Brand & Breadcrumb */}
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3 transition-all duration-500 ease-in-out">
              <span className="transition-all duration-500 ease-in-out">
                {currentView === "dashboard" ? "📊 Dashboard" :
                 currentView === "orders-dashboard" ? "📋 Orders Dashboard" : 
                 currentView === "diesel-ledger" ? "⛽ Diesel Ledger" : 
                 currentView === "production-entry" ? "🏭 Production Entry" :
                 currentView === "vehicle-labour-entry" ? "👷‍♂️ Vehicle Labour Entry" :
                 currentView === "vehicle-labour-ledger" ? "📊 Vehicle Labour Ledger" :
                 currentView === "labour-management" ? "👥 Labour Management" :
                 currentView === "client-ledger" ? "📊 Client Ledger" :
                 currentView === "income-ledger" ? "📈 Income Ledger" :
                 currentView === "expense-management" ? "💸 Expense Management" :
                 currentView === "cash-ledger" ? "💳 Cash Ledger" :
                 currentView === "vendor-management" ? "🏢 Vendor Management" :
                 currentView === "procurement-entry" ? "📝 Procurement Entry" :
                 currentView === "procurement-report" ? "📊 Procurement Reports" :
                 currentView === "vehicle-management" ? "🚛 Vehicle Management" :
                 currentView === "vehicle-wages" ? "💰 Vehicle Wages" :
                 currentView === "scheduled-orders" ? "📅 Scheduled Orders" :
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
            currentView === "scheduled-orders" ? "opacity-100 translate-y-0" :
            "opacity-100 translate-y-0"
          }`}>
            {(() => {
              console.log("🏠 Current view:", currentView);
              if (currentView === "dashboard") return renderDashboardView();
              if (currentView === "orders-dashboard") return renderOrdersDashboardView();
              if (currentView === "diesel-ledger") return renderDieselLedgerView();
              if (currentView === "production-entry") return renderProductionEntryView();
              if (currentView === "vehicle-labour-entry") return renderVehicleLabourEntryView();
              if (currentView === "vehicle-labour-ledger") return renderVehicleLabourLedgerView();
              if (currentView === "labour-management") return renderLabourManagementView();
              if (currentView === "client-ledger") return renderClientLedgerView();
              if (currentView === "income-ledger") return renderIncomeLedgerView();
              if (currentView === "expense-management") return renderExpenseManagementView();
              if (currentView === "cash-ledger") return renderCashLedgerView();
              if (currentView === "vendor-management") return renderVendorManagementView();
              if (currentView === "procurement-entry") return renderProcurementEntryView();
              if (currentView === "procurement-report") return renderProcurementReportView();
              if (currentView === "vehicle-management") return renderVehicleManagementView();
              if (currentView === "vehicle-wages") return renderVehicleWagesView();
              if (currentView === "scheduled-orders") return renderScheduledOrdersView();
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

const sections = [
  {
    label: "📦 Order Management",
    items: [
      { emoji: "📋", title: "Orders Dashboard", path: "/home/orders" },
      { emoji: "⛽", title: "Diesel Ledger", path: "/home/diesel-ledger" },
      { emoji: "📅", title: "Scheduled Orders", path: "/home/scheduled-orders" },
    ]
  },
  {
    label: "🏭 Production & Labour",
    items: [
      { emoji: "⚡", title: "Production Entry", path: "/home/production-entry" },
      { emoji: "👷‍♂️", title: "Vehicle Labour Entry", path: "/home/v-labour-entry" },
      { emoji: "📊", title: "Vehicle Labour Ledger", path: "/home/v-labour-ledger" },
      { emoji: "👥", title: "Labour Management", path: "/home/manage-labour" },
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
    label: "🚗 Vehicle Operations",
    items: [
      { emoji: "🚛", title: "Vehicle Management", path: "/home/manage-vehicle" },
      { emoji: "💰", title: "Vehicle Wages", path: "/home/vehicle-wages" }
    ]
  },
  {
    label: "🏗️ Procurement Management",
    items: [
      { emoji: "🏢", title: "Vendor Management", path: "/home/vendor-management" },
      { emoji: "📝", title: "Procurement Entry", path: "/home/procurement-entry" },
      { emoji: "📋", title: "Procurement Reports", path: "/home/procurement-reports" }
    ]
  },
  
];


export default Home;