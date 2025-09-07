// OrdersDashboard.jsx - Version 2.0 with caching and role-based access
import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useOrganization } from "../../contexts/OrganizationContext";
import { cacheUtils } from "../../utils/cacheManager";
import * as XLSX from 'xlsx';
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
  DateRangeFilter
} from "../../components/ui";

function OrdersDashboard({ onBack }) {
  // State management
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDM, setSelectedDM] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  
  // Filter states
  const [dmFilter, setDmFilter] = useState("");
  const [dmFrom, setDmFrom] = useState("");
  const [dmTo, setDmTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Data states
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [paginatedOrders, setPaginatedOrders] = useState([]);
  
  // Mock wallet and role data (replace with actual context when available)
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  const navigate = useNavigate();
  const { selectedOrganization } = useOrganization();
  const orgID = selectedOrganization?.orgID || "mock-org-id";


  // Mock wallet initialization (replace with actual wallet context)
  useEffect(() => {
    setTimeout(() => {
      setWallet({ 
        uid: "mock-uid", 
        name: "Mock User",
        role: 1 // 0 = Admin, 1 = Manager
      });
      setIsAdmin(false);
      setIsManager(true);
      setWalletLoading(false);
    }, 1000);
  }, []);

  // Load orders with smart caching
  useEffect(() => {
    if (!wallet?.uid || !orgID) return;
    
    const loadOrders = async () => {
      setLoading(true);
      try {
        // Define fetch function for fresh data
        const fetchOrdersFromFirebase = async () => {
          const ordersRef = collection(db, "DELIVERY_MEMOS");
          let q = query(
            ordersRef,
            where("orgID", "==", orgID),
            limit(1000) // Fetch more to allow proper sorting
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure status is properly set
            status: doc.data().status || (doc.data().dmNumber === "Cancelled" ? "cancelled" : "active")
          }));
        };

        // Use smart fetch with caching
        const result = await cacheUtils.smartFetchOrders(orgID, fetchOrdersFromFirebase);
        
        // Sort orders by DM number
        let ordersData = result.data.sort((a, b) => {
          const aNum = parseInt(a.dmNumber) || 0;
          const bNum = parseInt(b.dmNumber) || 0;
          return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
        });
        
        setOrders(ordersData);
        
        // Apply pagination
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedData = ordersData.slice(startIndex, endIndex);
        setPaginatedOrders(paginatedData);

        // Show cache status to user
        if (result.fromCache) {
          toast.success(`📦 Orders loaded from cache (${ordersData.length} orders)`);
        } else {
          toast.success(`🔄 Orders loaded from Firebase (${ordersData.length} orders)`);
        }
        
        } catch (error) {
        console.error("Error loading orders:", error);
        toast.error("Failed to load orders from Firebase");
        
        // Set empty arrays on error
        setOrders([]);
        setPaginatedOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [wallet?.uid, orgID, currentPage, sortOrder]);


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


  // Order cancellation handler (works for both Admin and Manager)
  // Updated: Fixed function name from handleAdminCancel to handleOrderCancel
  const handleOrderCancel = async () => {
    try {
      // Update DELIVERY_MEMOS document
      const docRef = doc(db, "DELIVERY_MEMOS", selectedDM.id);
      await updateDoc(docRef, {
        status: "cancelled",
        clientName: "Cancelled",
        productQuant: "Cancelled",
        productUnitPrice: "Cancelled",
        regionName: "Cancelled",
        vehicleNumber: "Cancelled",
        clientPhoneNumber: "Cancelled",
        paySchedule: "Cancelled",
        dispatchedTime: "Cancelled",
        dispatchStart: selectedDM.dispatchStart || "",
        dispatchEnd: selectedDM.dispatchEnd || "",
        deliveredTime: "Cancelled",
        productName: "Cancelled",
        toAccount: "Cancelled",
        paymentStatus: false,
        cancelledAt: serverTimestamp(),
        cancelledBy: wallet?.uid || 'unknown',
        cancelledByName: wallet?.name || wallet?.displayName || (isAdmin ? 'Admin' : 'Manager')
      });

      // Update SCH_ORDERS to mark dmNumber as "Cancelled"
      try {
        const schQuery = query(
          collection(db, "SCH_ORDERS"),
          where("dmNumber", "==", selectedDM.dmNumber),
          where("orgID", "==", orgID)
        );
        const schSnapshot = await getDocs(schQuery);
        if (!schSnapshot.empty) {
          const schDoc = schSnapshot.docs[0];
          await updateDoc(doc(db, "SCH_ORDERS", schDoc.id), {
            dmNumber: "Cancelled"
          });
          console.log(`✅ Updated SCH_ORDERS ${schDoc.id} dmNumber to "Cancelled"`);
        }
      } catch (schError) {
        console.error("Failed to update SCH_ORDERS:", schError);
        // Don't fail the main cancellation if SCH_ORDERS update fails
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === selectedDM.id 
          ? { ...order, status: "cancelled" }
          : order
      ));
      
      setPaginatedOrders(prev => prev.map(order => 
        order.id === selectedDM.id 
          ? { ...order, status: "cancelled" }
          : order
      ));

      // Clear orders cache since data has changed
      cacheUtils.clearOrdersCache(orgID);
      
      toast.success(`DM #${selectedDM.dmNumber} cancelled by ${isAdmin ? 'admin' : 'manager'}.`);
      setShowCancelModal(false);
      setSelectedDM(null);
    } catch (err) {
      console.error("Cancellation failed:", err);
      toast.error("Failed to cancel DM.");
    }
  };


  // Export functionality
  const handleExportExcel = async () => {
    setExporting(true);
    
    try {
      if (!dmFrom || !dmTo) {
        toast.warning("Please specify DM range (From and To) to export orders.");
        setExporting(false);
        return;
      }

      // Fetch ALL data within the DM range from Firestore
      const exportQuery = query(
        collection(db, "DELIVERY_MEMOS"),
        where("orgID", "==", orgID),
        where("dmNumber", ">=", parseInt(dmFrom)),
        where("dmNumber", "<=", parseInt(dmTo))
      );

      // Get all matching documents
      const exportSnapshot = await getDocs(exportQuery);
      const allExportData = exportSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || (doc.data().dmNumber === "Cancelled" ? "cancelled" : "active")
      }));

      if (allExportData.length === 0) {
        toast.warning("No orders found for the specified DM range. Please check your DM range.");
        setExporting(false);
        return;
      }

      // Show progress toast
      toast.info(`Found ${allExportData.length} orders in DM range ${dmFrom}-${dmTo}. Processing for export...`);

      // Apply text search filter in memory (for performance)
      let finalExportData = allExportData;
      if (dmFilter) {
        finalExportData = finalExportData.filter(order => 
          order.dmNumber?.toString().includes(dmFilter) ||
          order.clientName?.toLowerCase().includes(dmFilter.toLowerCase())
        );
      }

      if (finalExportData.length === 0) {
        toast.warning("No orders match the search filter. Please check your search terms.");
        setExporting(false);
        return;
      }

      // Sort data if needed
      if (sortOrder === "asc") {
        finalExportData.sort((a, b) => (a.dmNumber || 0) - (b.dmNumber || 0));
      } else {
        finalExportData.sort((a, b) => (b.dmNumber || 0) - (a.dmNumber || 0));
      }

      // Prepare data for export
      const excelData = finalExportData.map(order => ({
        'DM Number': order.dmNumber || '-',
        'Client Name': order.clientName || '-',
        'Product Name': order.productName || '-',
        'Quantity': order.productQuant || 0,
        'Unit Price': order.productUnitPrice || 0,
        'Total Amount': (order.productQuant || 0) * (order.productUnitPrice || 0),
        'Delivery Date': formatDate(order.deliveryDate),
        'Location/Region': order.regionName || '-',
        'Vehicle Number': order.vehicleNumber || '-',
        'Client Phone': order.clientPhoneNumber || '-',
        'Payment Schedule': order.paySchedule || '-',
        'Status': order.status || '-',
        'Payment Status': order.paymentStatus ? 'Paid' : 'Unpaid',
        'Created Date': order.createdAt ? formatDate(order.createdAt) : '-',
        'Updated Date': order.updatedAt ? formatDate(order.updatedAt) : '-'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = [
        { wch: 12 }, // DM Number
        { wch: 25 }, // Client Name
        { wch: 20 }, // Product Name
        { wch: 12 }, // Quantity
        { wch: 15 }, // Unit Price
        { wch: 15 }, // Total Amount
        { wch: 15 }, // Delivery Date
        { wch: 20 }, // Location/Region
        { wch: 15 }, // Vehicle Number
        { wch: 15 }, // Client Phone
        { wch: 20 }, // Payment Schedule
        { wch: 12 }, // Status
        { wch: 12 }, // Payment Status
        { wch: 15 }, // Created Date
        { wch: 15 }  // Updated Date
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      // Generate filename with DM range
      let filename = "Orders_Export";
      if (dmFrom && dmTo) {
        filename += `_DM${dmFrom}_to_DM${dmTo}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Exported ${finalExportData.length} orders to Excel successfully!`);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export orders to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setDmFilter("");
    setDmFrom("");
    setDmTo("");
    setStatusFilter("all");
    setSortOrder("desc");
    setStartDate("");
    setEndDate("");
    toast.info("All filters cleared");
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
    
    setSelectedDM(dm);
    setShowCancelModal(true);
  };

  // Filter orders
  const filteredOrders = paginatedOrders.filter(order => {
    const matchesFilter = !dmFilter || 
      order.dmNumber?.toString().includes(dmFilter) ||
      order.clientName?.toLowerCase().includes(dmFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    const matchesDateRange = (!startDate || !endDate) || 
      (order.deliveryDate && 
       new Date(order.deliveryDate) >= new Date(startDate) && 
       new Date(order.deliveryDate) <= new Date(endDate));
    
    const matchesDmRange = (!dmFrom || !dmTo) || 
      (order.dmNumber && 
       order.dmNumber >= parseInt(dmFrom) && 
       order.dmNumber <= parseInt(dmTo));
    
    return matchesFilter && matchesStatus && matchesDateRange && matchesDmRange;
  });

  // DataTable columns configuration
  const columns = [
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
          status={row.status === "cancelled" ? "error" : "success"}
          variant={row.status === "cancelled" ? "error" : "success"}
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
            {!canCancel && row.status !== "cancelled" && (isAdmin || isManager) && (
              <div className="text-xs text-gray-400 text-center">
                {isManager && !isToday ? "Today only" : "No access"}
              </div>
            )}
          </div>
        );
      }
    }
  ];

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
  if (!selectedOrganization) {
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

  // No wallet state
  if (!wallet) {
    navigate("/");
    return null;
  }

  return (
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
            onChange={(e) => setDmFilter(e.target.value)}
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
                onChange={(e) => setDmFilter(e.target.value)}
            />
            
            <SelectField
              label="📊 Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "cancelled", label: "Cancelled" }
              ]}
            />
            
            <SelectField
              label="🔽 Sort"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
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
                onChange={(e) => setDmFrom(e.target.value)}
            />
            
            <InputField
              label="📉 To DM"
                type="number"
              placeholder="DM #"
                value={dmTo}
                onChange={(e) => setDmTo(e.target.value)}
            />
            
            <DatePicker
              label="📅 Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
            />
            
            <DatePicker
              label="📅 End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            value={filteredOrders.length}
            valueColor="#00c3ff"
            icon="📋"
          />
          <SummaryCard
            title="💰 Total Value"
            value={formatINR(filteredOrders.reduce((sum, order) => 
              sum + ((order.productQuant || 0) * (order.productUnitPrice || 0)), 0
            ))}
            valueColor="#32D74B"
            icon="💵"
          />
          <SummaryCard
            title="❌ Cancelled Orders"
            value={filteredOrders.filter(order => order.status === 'cancelled').length}
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
              data={filteredOrders}
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
                onClick={() => setCurrentPage(currentPage - 1)}
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
                onClick={() => setCurrentPage(currentPage + 1)}
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
        onClose={() => setShowCancelModal(false)}
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
  );
}
 
 export default OrdersDashboard;