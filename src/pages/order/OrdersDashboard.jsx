// OrdersDashboard.jsx - Version 2.0 with organization-based role access control
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, updateDoc, addDoc, serverTimestamp, onSnapshot, QueryDocumentSnapshot, runTransaction } from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuthState } from "../../hooks/useAuthState";
import { useOrders } from "../../hooks/useOrders";
import { useExport } from "../../hooks/useExport";
import "./OrdersDashboard.css";

// Import UI Components
import { 
  Button, 
  Card, 
  DataTable, 
  Input, 
  Modal, 
  Spinner, 
  Badge,
  SelectField,
  InputField,
  DatePicker,
  ExportButton,
  StatusBadge,
  PageHeader,
  DieselPage,
  SummaryCard,
  FilterBar,
  LoadingState,
  EmptyState,
  ConfirmationModal,
  DateRangeFilter,
  ErrorBoundary
} from "../../components/ui";

function OrdersDashboard({ onBack }) {
  // Split state into focused, smaller state objects for better performance
  const [filters, setFilters] = useState({
    dmFilter: "",
    dmFrom: "",
    dmTo: "",
    statusFilter: "all",
    sortOrder: "desc",
    startDate: "",
    endDate: ""
  });
  
  const [modal, setModal] = useState({
    showCancelModal: false,
    selectedDM: null
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    hasMoreData: true,
    totalCount: 0
  });
  
  const rowsPerPage = 20;
  const virtualScrollRef = useRef(null);
  const lastVisibleRef = useRef(null);
  const [virtualScrollState, setVirtualScrollState] = useState({
    containerHeight: 600,
    itemHeight: 80,
    visibleItems: 8,
    scrollTop: 0
  });
  
  // Destructure for easier access
  const {
    dmFilter,
    dmFrom,
    dmTo,
    statusFilter,
    sortOrder,
    startDate,
    endDate
  } = filters;
  
  const {
    showCancelModal,
    selectedDM
  } = modal;
  
  const {
    currentPage,
    hasMoreData,
    totalCount
  } = pagination;
  
  // State update helpers - now using specific state setters
  const updateFilters = useCallback((updates) => {
    setFilters(prev => {
      const hasChanges = Object.keys(updates).some(key => prev[key] !== updates[key]);
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateModal = useCallback((updates) => {
    setModal(prev => {
      const hasChanges = Object.keys(updates).some(key => prev[key] !== updates[key]);
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updatePagination = useCallback((updates) => {
    setPagination(prev => {
      const hasChanges = Object.keys(updates).some(key => prev[key] !== updates[key]);
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  // Validation helpers are now in custom hooks

  // Get organization context with proper error handling
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();
  const orgID = selectedOrganization?.orgID;
  
  // Use custom hooks for better separation of concerns
  const { wallet, walletLoading, isAdmin, isManager } = useAuthState();
  const { orders, loading, cancelOrder, readCount } = useOrders(orgID, filters, pagination);
  const { exporting, exportOrdersToExcel } = useExport();
  
  const navigate = useNavigate();


  // Authentication is now handled by useAuthState hook
  // Order loading is now handled by useOrders hook


  // Utility functions
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatINR = (amount) => {
    if (!amount || isNaN(amount)) return "₹0";
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // Check if order can be cancelled based on role and date
  const canCancelOrder = (order) => {
    if (order.status === "cancelled") return false;
    
    if (isAdmin) {
      return true; // Admin can cancel all orders
    }
    
    if (isManager) {
      // Manager can only cancel today's orders
      const today = new Date();
      const orderDate = order.deliveryDate;
      
      if (!orderDate) return false;
      
      let orderDateObj;
      if (orderDate.toDate) {
        orderDateObj = orderDate.toDate();
      } else if (orderDate.seconds) {
        orderDateObj = new Date(orderDate.seconds * 1000);
      } else {
        orderDateObj = new Date(orderDate);
      }
      
      // Check if the order date is today
      const isToday = orderDateObj.toDateString() === today.toDateString();
      return isToday;
    }
    
    return false; // No access for other roles
  };


  // Order cancellation handler using custom hook
  const handleOrderCancel = async () => {
    if (!selectedDM) {
      toast.error("No order selected for cancellation.");
      return;
    }

    const success = await cancelOrder(selectedDM, wallet, orgID);
    
    if (success) {
      updateModal({
        showCancelModal: false,
        selectedDM: null
      });
    }
  };


  // Export functionality using custom hook
  const handleExportExcel = async () => {
    await exportOrdersToExcel(orgID, filters, dmFilter, sortOrder);
  };

  // Clear filters
  const handleClearFilters = () => {
    updateFilters({
      dmFilter: "",
      dmFrom: "",
      dmTo: "",
      statusFilter: "all",
      sortOrder: "desc",
      startDate: "",
      endDate: ""
    });
    toast("All filters cleared");
  };

  // Handle cancel click
  const handleCancelClick = (dm) => {
    if (!canCancelOrder(dm)) {
      if (isManager) {
        toast.error("You can only cancel today's orders.");
      } else {
        toast.error("You don't have permission to cancel orders.");
      }
      return;
    }
    
    updateModal({
      selectedDM: dm,
      showCancelModal: true
    });
  };

  // Memoize filtered orders - now only handles text search (other filters moved to database)
  const filteredOrders = useMemo(() => {
    if (!dmFilter) return orders; // No text filter, return all orders
    
    return orders.filter(order => {
      // Only text search filtering remains on client-side
      const matchesTextFilter = 
        order.dmNumber?.toString().includes(dmFilter) ||
        order.clientName?.toLowerCase().includes(dmFilter.toLowerCase());
      
      return matchesTextFilter;
    });
  }, [orders, dmFilter]);

  // With database pagination, orders are already paginated
  const paginatedOrders = useMemo(() => {
    return filteredOrders; // Orders are already paginated from database
  }, [filteredOrders]);

  // Virtual scrolling calculations
  const virtualScrollData = useMemo(() => {
    const { itemHeight, visibleItems, scrollTop } = virtualScrollState;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems + 1, paginatedOrders.length);
    const offsetY = startIndex * itemHeight;
    
    return {
      startIndex,
      endIndex,
      offsetY,
      totalHeight: paginatedOrders.length * itemHeight,
      visibleOrders: paginatedOrders.slice(startIndex, endIndex)
    };
  }, [paginatedOrders, virtualScrollState]);

  // Handle virtual scroll with debouncing
  const handleVirtualScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    setVirtualScrollState(prev => ({
      ...prev,
      scrollTop
    }));
  }, []);

  // Cleanup virtual scroll on unmount
  useEffect(() => {
    return () => {
      // Cleanup virtual scroll state
      setVirtualScrollState({
        containerHeight: 600,
        itemHeight: 80,
        visibleItems: 8,
        scrollTop: 0
      });
      // Clear refs
      lastVisibleRef.current = null;
    };
  }, []);

  // Error boundary for critical operations
  const handleCriticalError = useCallback((error, context) => {
    toast.error(`An error occurred in ${context}. Please refresh the page.`);
    // Could implement error reporting service here
  }, []);

  // Memoize summary calculations with optimized dependencies
  const summaryData = useMemo(() => {
    const totalOrders = filteredOrders.length;
    
    // Only calculate if we have orders to prevent unnecessary calculations
    if (totalOrders === 0) {
      return {
        totalOrders: 0,
        totalValue: 0,
        cancelledOrders: 0,
        activeOrders: 0
      };
    }
    
    let totalValue = 0;
    let cancelledOrders = 0;
    
    // Single pass through orders for better performance
    filteredOrders.forEach(order => {
      // Calculate total value safely
      const quantity = parseFloat(order.productQuant) || 0;
      const unitPrice = parseFloat(order.productUnitPrice) || 0;
      totalValue += quantity * unitPrice;
      
      // Count cancelled orders
      if (order.status === 'cancelled') {
        cancelledOrders++;
      }
    });
    
    return {
      totalOrders,
      totalValue,
      cancelledOrders,
      activeOrders: totalOrders - cancelledOrders
    };
  }, [filteredOrders]);

  // DataTable columns configuration - memoized for performance
  const columns = useMemo(() => [
    {
      key: 'dmNumber',
      header: 'DM No.',
      align: 'center',
      icon: '📋',
      render: (row) => (
        <a
          href={`/print-dm/${row.dmNumber}${row.status === "cancelled" ? "?cancelled=true" : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
        >
          DM #{row.dmNumber}
        </a>
      )
    },
    {
      key: 'clientName',
      header: 'Client',
      align: 'left',
      icon: '🏢'
    },
    {
      key: 'productQuant',
      header: 'Quantity',
      align: 'right',
      icon: '📦'
    },
    {
      key: 'productUnitPrice',
      header: 'Unit Price',
      align: 'right',
      icon: '💰',
      render: (row) => formatINR(row.productUnitPrice)
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      icon: '💵',
      render: (row) => formatINR((row.productQuant || 0) * (row.productUnitPrice || 0))
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      align: 'center',
      icon: '📅',
      render: (row) => formatDate(row.deliveryDate)
    },
    {
      key: 'regionName',
      header: 'Location',
      align: 'left',
      icon: '📍'
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle No.',
      align: 'center',
      icon: '🚛'
    },
    {
      key: 'clientPhoneNumber',
      header: 'Phone No.',
      align: 'center',
      icon: '📞'
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      icon: '📊',
      render: (row) => (
        <StatusBadge 
          status={row.status === "cancelled" ? "cancelled" : "active"}
          variant={row.status === "cancelled" ? "danger" : "success"}
        >
          {row.status === "cancelled" ? "Cancelled" : "Active"}
        </StatusBadge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      icon: '⚡',
      render: (row) => {
        const canCancel = canCancelOrder(row);
        const isToday = row.deliveryDate && new Date(row.deliveryDate).toDateString() === new Date().toDateString();

        return (
          <div className="flex flex-col gap-2">
            
            {/* Cancel DM Button */}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleCancelClick(row)}
                className="text-xs"
                title={isAdmin ? "Cancel DM (Admin)" : "Cancel Today's DM (Manager)"}
              >
                ❌ Cancel DM
              </Button>
            )}
            
            {/* Access Denied Message */}
            {!canCancel && row.status !== "cancelled" && (isAdmin || isManager) && (
              <div className="text-xs text-gray-400 text-center">
                {isManager && !isToday ? "Today only" : "No access"}
              </div>
            )}
            
            {/* Cancelled Status */}
            {row.status === "cancelled" && (
              <div className="text-xs text-red-400 text-center">
                Already Cancelled
              </div>
            )}
          </div>
        );
      }
    }
  ], [isAdmin, isManager]);

  // Loading state
  if (walletLoading) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading user data..." 
          icon="👤"
        />
      </DieselPage>
    );
  }

  // Organization loading state
  if (orgLoading) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading organization data..." 
          icon="🏢"
        />
      </DieselPage>
    );
  }

  // Organization error state
  if (!selectedOrganization || !orgID) {
    return (
      <DieselPage>
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-white mb-4">Organization Required</h2>
          <p className="text-gray-400 text-center mb-6">
            Please select an organization to view orders.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate("/home")}
            size="lg"
          >
            ← Back to Home
          </Button>
        </div>
      </DieselPage>
    );
  }

  // No wallet state
  if (!wallet) {
    navigate("/");
    return null;
  }

  return (
    <ErrorBoundary>
      <DieselPage>
      {/* Orders Dashboard Header */}
      <PageHeader
        title=""
        onBack={onBack || (() => navigate("/home"))}
        role={isAdmin ? "admin" : isManager ? "manager" : "member"}
        roleDisplay={isAdmin ? "Administrator" : isManager ? "Manager" : "Member"}
      />


      {/* Main Content */}
      <div className="w-full" style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        {/* Filter Bar */}
        <FilterBar style={{ marginBottom: "2rem" }}>
          <FilterBar.Actions>
            <Button
              variant="success"
              onClick={handleExportExcel}
              disabled={exporting || !dmFrom || !dmTo}
              loading={exporting}
              size="md"
            >
              📊 Export Excel
            </Button>
          </FilterBar.Actions>
          
          <FilterBar.Search
            placeholder="Search DM/Client..."
            value={dmFilter}
            onChange={(e) => updateFilters({ dmFilter: e.target.value })}
            style={{ width: "300px" }}
          />
        </FilterBar>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🔍</span>
            <h2 className="text-xl font-bold text-white">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InputField
              label="🔎 Search"
              placeholder="DM/Client..."
                value={dmFilter}
                onChange={(e) => updateFilters({ dmFilter: e.target.value })}
            />
            
            <SelectField
              label="📊 Status"
                value={statusFilter}
                onChange={(e) => updateFilters({ statusFilter: e.target.value })}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "cancelled", label: "Cancelled" }
              ]}
            />
            
            <SelectField
              label="🔽 Sort"
                value={sortOrder}
                onChange={(e) => updateFilters({ sortOrder: e.target.value })}
              options={[
                { value: "desc", label: "Descending" },
                { value: "asc", label: "Ascending" }
              ]}
            />
            
            <InputField
              label="📈 From DM"
                type="number"
              placeholder="DM #"
                value={dmFrom}
                onChange={(e) => updateFilters({ dmFrom: e.target.value })}
            />
            
            <InputField
              label="📉 To DM"
                type="number"
              placeholder="DM #"
                value={dmTo}
                onChange={(e) => updateFilters({ dmTo: e.target.value })}
            />
            
            <DatePicker
              label="📅 Start Date"
                value={startDate}
                onChange={(e) => updateFilters({ startDate: e.target.value })}
            />
            
            <DatePicker
              label="📅 End Date"
                value={endDate}
                onChange={(e) => updateFilters({ endDate: e.target.value })}
              />
            </div>
            
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
                onClick={handleClearFilters}
              size="sm"
              >
                🗑️ Clear Filters
            </Button>
            
            <div className="text-sm text-slate-400">
                  📊 Showing {filteredOrders.length} of {paginatedOrders.length} orders
              </div>
              
            {filteredOrders.length > 0 && (
              <div className="text-sm text-green-400 font-semibold">
                💰 Total: {formatINR(filteredOrders.reduce((sum, order) => 
                  sum + ((order.productQuant || 0) * (order.productUnitPrice || 0)), 0
                ))}
                  </div>
                )}
                </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ margin: "1rem 0" }}>
          <SummaryCard
            title="📊 Total Orders"
            value={summaryData.totalOrders}
            valueColor="#00c3ff"
            icon="📋"
          />
          <SummaryCard
            title="💰 Total Value"
            value={formatINR(summaryData.totalValue)}
            valueColor="#32D74B"
            icon="💵"
          />
          <SummaryCard
            title="❌ Cancelled Orders"
            value={summaryData.cancelledOrders}
            valueColor="#FF453A"
            icon="🚫"
          />
        </div>

        {/* Orders Table */}
        <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold text-white">Orders Table</h2>
          </div>
          
          <div className="overflow-x-auto transition-all duration-300 ease-in-out">
            <DataTable
              columns={columns}
              data={paginatedOrders}
              loading={loading}
              emptyMessage="No orders match the current filters"
              stickyHeader={true}
              className="min-w-full"
            />
          </div>
        </Card>

        {/* Pagination */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => updatePagination({ currentPage: currentPage - 1 })}
                disabled={currentPage === 1}
                size="sm"
              >
                ← Previous
              </Button>
              
              <div className="px-4 py-2 bg-blue-600 rounded-lg text-white font-semibold">
                📄 Page {currentPage}
              </div>
              
              <Button
                variant="outline"
                onClick={() => updatePagination({ currentPage: currentPage + 1 })}
                disabled={paginatedOrders.length < rowsPerPage}
                size="sm"
              >
                Next →
              </Button>
            </div>
            
            <div className="text-sm text-slate-400">
              📊 {rowsPerPage} orders per page
            </div>
          </div>
        </Card>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => updateModal({ showCancelModal: false })}
        title="Confirm Cancellation"
        message={`Are you sure you want to cancel DM #${selectedDM?.dmNumber}?`}
        subtitle="This action cannot be undone."
        confirmText="Confirm Cancellation"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleOrderCancel}
        icon="⚠️"
      />
      </DieselPage>
    </ErrorBoundary>
  );
}
 
 export default OrdersDashboard;