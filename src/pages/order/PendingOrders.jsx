import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { 
  Button,
  Card,
  DataTable,
  Input,
  PageHeader,
  SectionCard,
  Badge,
  LoadingState,
  EmptyState,
  FilterBar,
  SummaryCard,
  DieselPage
} from "../../components/ui";
import "./PendingOrders.css";

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}
import { 
  scheduleDeliveries,
  formatDeliveryDate, 
  calculateDaysUntilDelivery, 
  getDeliveryStatus,
} from "../../utils/enhancedDeliveryScheduler";

const PendingOrders = ({ onBack }) => {
  const { selectedOrganization: selectedOrg } = useOrganization();
  const { user } = useAuth();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  const [pendingOrders, setPendingOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [schedulingData, setSchedulingData] = useState({
    assignedOrders: [],
    deliveryStats: null,
    totalWeeklyCapacity: 0,
    startDate: null
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);


  // Fetch pending orders with real-time updates
  useEffect(() => {
    if (!selectedOrg?.orgID) return;

    const q = query(
      collection(db, "DEF_ORDERS"),
      where("orgID", "==", selectedOrg.orgID),
      where("orderCount", ">", 0) // Only get orders with pending quantities
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by deliveryDate on the client side
        const sortedOrders = orders.sort((a, b) => {
          const dateA = a.deliveryDate?.toDate ? a.deliveryDate.toDate() : new Date(a.deliveryDate?.seconds * 1000 || 0);
          const dateB = b.deliveryDate?.toDate ? b.deliveryDate.toDate() : new Date(b.deliveryDate?.seconds * 1000 || 0);
          return dateA - dateB;
        });
        
        setPendingOrders(sortedOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching pending orders:", error);
        toast.error("Failed to fetch pending orders");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedOrg?.orgID]);

  // Initialize scheduling data without automatic calculation
  useEffect(() => {
    setSchedulingData({
      assignedOrders: pendingOrders,
      deliveryStats: null,
      totalWeeklyCapacity: 0,
      startDate: null
    });
  }, [pendingOrders]);

  // Fetch vehicles for capacity calculations
  useEffect(() => {
    if (!selectedOrg?.orgID) return;

    const q = query(
      collection(db, "VEHICLES"),
      where("orgID", "==", selectedOrg.orgID),
      where("status", "==", "Active")
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const vehiclesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVehicles(vehiclesData);
      },
      (error) => {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to fetch vehicles");
      }
    );

    return () => unsubscribe();
  }, [selectedOrg?.orgID]);

  // Filter and sort orders based on search text and delivery dates
  const filteredOrders = useMemo(() => {
    let orders = schedulingData.assignedOrders;
    
    // Apply search filter if search text exists
    if (searchText) {
      orders = orders.filter(order => {
        const searchLower = searchText.toLowerCase();
        return (
          order.clientName?.toLowerCase().includes(searchLower) ||
          order.productName?.toLowerCase().includes(searchLower) ||
          order.regionName?.toLowerCase().includes(searchLower) ||
          order.vehicleNo?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Sort by estimated delivery date if available
    return orders.sort((a, b) => {
      const dateA = a.estimatedDeliveryDate;
      const dateB = b.estimatedDeliveryDate;
      
      // If both have delivery dates, sort by date
      if (dateA && dateB) {
        const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
        const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
        return timeA - timeB;
      }
      
      // If only one has delivery date, prioritize it
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      
      // If neither has delivery date, maintain original order
      return 0;
    });
  }, [schedulingData.assignedOrders, searchText]);

  // Use total weekly capacity from scheduling data
  const totalWeeklyCapacity = schedulingData.totalWeeklyCapacity;

  // Use delivery stats from scheduling data
  const deliveryStats = schedulingData.deliveryStats;

  // Manual calculation trigger function
  const handleCalculateDeliveryDates = useCallback(async () => {
    if (pendingOrders.length === 0) {
      toast.error("No orders available for calculation");
      return;
    }

    if (vehicles.length === 0) {
      toast.error("No vehicles available for calculation");
      return;
    }

    setIsCalculating(true);
    try {
      console.log("🚀 Manual calculation triggered");
      const schedulingResult = scheduleDeliveries(pendingOrders, vehicles);
      setSchedulingData(schedulingResult);
      setLastCalculated(new Date());
      toast.success("Delivery dates calculated successfully!");
    } catch (error) {
      console.error("Error calculating delivery dates:", error);
      toast.error("Failed to calculate delivery dates");
    } finally {
      setIsCalculating(false);
    }
  }, [pendingOrders, vehicles]);

  // Calculate summary data
  const summaryData = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + (order.productQuant || 0), 0);
    
    // Calculate per-region and per-vehicle utilization
    const regionUtilization = {};
    const vehicleUtilization = {};
    filteredOrders.forEach(order => {
      // Region utilization
      const region = order.regionName || "Unknown";
      if (!regionUtilization[region]) {
        regionUtilization[region] = { count: 0, quantity: 0 };
      }
      regionUtilization[region].count++;
      regionUtilization[region].quantity += order.productQuant || 0;
      
      // Vehicle utilization
      const vehicle = order.vehicleNo || "Not Assigned";
      if (!vehicleUtilization[vehicle]) {
        vehicleUtilization[vehicle] = { count: 0, quantity: 0, type: order.vehicleType || 'Unknown' };
      }
      vehicleUtilization[vehicle].count++;
      vehicleUtilization[vehicle].quantity += order.productQuant || 0;
    });

    // Find earliest and latest delivery dates
    const deliveryDates = filteredOrders
      .map(order => order.deliveryDate)
      .filter(date => date)
      .map(date => date.toDate ? date.toDate() : new Date(date.seconds * 1000))
      .sort((a, b) => a - b);

    const earliestDelivery = deliveryDates[0];
    const latestDelivery = deliveryDates[deliveryDates.length - 1];

    return {
      totalOrders,
      totalQuantity,
      regionUtilization,
      vehicleUtilization,
      earliestDelivery,
      latestDelivery
    };
  }, [filteredOrders]);

  // Format date helper
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


  // DataTable columns
  const columns = useMemo(() => [
    {
      key: 'clientName',
      header: 'Client',
      align: 'left',
      icon: '🏢'
    },
    {
      key: 'productName',
      header: 'Product',
      align: 'left',
      icon: '📦'
    },
    {
      key: 'productQuant',
      header: 'Quantity',
      align: 'right',
      icon: '📊'
    },
    {
      key: 'regionName',
      header: 'Region',
      align: 'left',
      icon: '📍'
    },
    {
      key: 'vehicleNo',
      header: 'Assigned Vehicle',
      align: 'center',
      icon: '🚛',
      render: (row) => row.vehicleNo || 'Not Assigned'
    },
    {
      key: 'vehicleType',
      header: 'Vehicle Type',
      align: 'center',
      icon: '🚜',
      render: (row) => row.vehicleType || 'N/A'
    },
    {
      key: 'estimatedDeliveryDate',
      header: 'Estimated Delivery',
      align: 'center',
      icon: '📅',
      render: (row) => {
        if (!row.estimatedDeliveryDate) return 'N/A';
        const daysUntil = calculateDaysUntilDelivery(row.estimatedDeliveryDate);
        const status = getDeliveryStatus(daysUntil);
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: status.color === 'red' ? '#ef4444' : 
                    status.color === 'orange' ? '#f97316' :
                    status.color === 'yellow' ? '#eab308' :
                    status.color === 'green' ? '#22c55e' :
                    status.color === 'blue' ? '#3b82f6' : '#9ca3af'
            }}>
              {formatDeliveryDate(row.estimatedDeliveryDate)}
            </div>
            {daysUntil !== null && (
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {daysUntil === 0 ? 'Today' : 
                 daysUntil === 1 ? 'Tomorrow' : 
                 `${daysUntil} days`}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'orderCount',
      header: 'Pending Orders',
      align: 'center',
      icon: '📋',
      render: (row) => (
        <Badge 
          variant={row.orderCount > 0 ? "warning" : "success"}
        >
          {row.orderCount || 0}
        </Badge>
      )
    },
    {
      key: 'createdTime',
      header: 'Created Time',
      align: 'center',
      icon: '🕒',
      render: (row) => {
        if (!row.createdTime) return 'N/A';
        try {
          const date = row.createdTime.toDate ? row.createdTime.toDate() : new Date(row.createdTime.seconds * 1000);
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#fff' }}>
                {date.toLocaleDateString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {date.toLocaleTimeString()}
              </div>
            </div>
          );
        } catch (error) {
          return 'Invalid Date';
        }
      }
    }
  ], []);

  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());

  if (loading) {
    return (
      <DieselPage>
        <PageHeader
          onBack={handleBack}
          role={isAdmin ? "admin" : "manager"}
          roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
        />
        <LoadingState variant="inline" message="Loading orders..." icon="⏳" />
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader
        onBack={handleBack}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      />
      
      {/* Filter Bar */}
      <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
          <FilterBar.Search
            placeholder="Search orders by client, product, region, or vehicle..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          
          <Button
            onClick={handleCalculateDeliveryDates}
            disabled={isCalculating || pendingOrders.length === 0 || vehicles.length === 0}
            variant="primary"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minWidth: "200px"
            }}
          >
            {isCalculating ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Calculating...
              </>
            ) : (
              <>
                ⚡ Calculate Delivery Dates
              </>
            )}
          </Button>
          
          {lastCalculated && (
            <div style={{
              fontSize: "0.875rem",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span>🕒</span>
              <span>Last calculated: {lastCalculated.toLocaleTimeString()}</span>
            </div>
          )}
          
          <Button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            variant="outline"
            style={{
              background: "rgba(55,65,81,0.5)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem"
            }}
          >
            {showDebugInfo ? "🔍 Hide Debug" : "🔍 Show Debug"}
          </Button>
        </div>
      </FilterBar>
      
      {/* Main Content Container */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem", width: "100%", boxSizing: "border-box" }}>
        <div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" style={{ margin: "1.5rem 0" }}>
            {/* Total Pending Orders Card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(0,195,255,0.1) 0%, rgba(0,195,255,0.05) 100%)",
              border: "1px solid rgba(0,195,255,0.2)",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>📊</span>
                <h3 style={{ color: "#00c3ff", fontWeight: "600", margin: 0 }}>Total Orders</h3>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "0.25rem" }}>
                {summaryData.totalOrders}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                Orders with pending quantities
              </div>
            </div>

            {/* Total Quantity Card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(50,215,75,0.1) 0%, rgba(50,215,75,0.05) 100%)",
              border: "1px solid rgba(50,215,75,0.2)",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>📦</span>
                <h3 style={{ color: "#32D74B", fontWeight: "600", margin: 0 }}>Total Quantity</h3>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "0.25rem" }}>
                {summaryData.totalQuantity.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                Units pending delivery
              </div>
            </div>
          </div>

          {/* Debug Information Panel */}
          {showDebugInfo && (
            <div style={{
              background: "rgba(20,20,22,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>🔍</span>
                <h3 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                  Debug Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div style={{
                  background: "rgba(55,65,81,0.5)",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                    Total Orders
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff" }}>
                    {schedulingData.assignedOrders.length}
                  </div>
                </div>
                
                <div style={{
                  background: "rgba(55,65,81,0.5)",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                    Assigned Orders
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#22c55e" }}>
                    {schedulingData.assignedOrders.filter(order => order.assignedVehicle).length}
                  </div>
                </div>
                
                <div style={{
                  background: "rgba(55,65,81,0.5)",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                    Unassigned Orders
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#ef4444" }}>
                    {schedulingData.assignedOrders.filter(order => !order.assignedVehicle).length}
                  </div>
                </div>
              </div>
              
              {/* Delivery Date Distribution */}
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ color: "#fff", fontSize: "1rem", marginBottom: "0.5rem" }}>
                  Delivery Date Distribution
                </h4>
                <div style={{
                  background: "rgba(55,65,81,0.3)",
                  borderRadius: "8px",
                  padding: "1rem",
                  maxHeight: "200px",
                  overflowY: "auto"
                }}>
                  {(() => {
                    const dateDistribution = schedulingData.assignedOrders
                      .filter(order => order.estimatedDeliveryDate)
                      .reduce((acc, order) => {
                        const date = order.estimatedDeliveryDate.toISOString().split('T')[0];
                        if (!acc[date]) {
                          acc[date] = { count: 0, orders: [] };
                        }
                        acc[date].count++;
                        acc[date].orders.push(order);
                        return acc;
                      }, {});
                    
                    return Object.entries(dateDistribution)
                      .sort(([a], [b]) => new Date(a) - new Date(b))
                      .map(([date, data]) => (
                        <div key={date} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0",
                          borderBottom: "1px solid rgba(255,255,255,0.1)"
                        }}>
                          <span style={{ color: "#fff", fontSize: "0.875rem" }}>
                            {new Date(date).toLocaleDateString('en-IN', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span style={{ color: "#22c55e", fontWeight: "bold" }}>
                            {data.count} orders
                          </span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* New Summary Stats: Estimated Delivery Time by Product Quantity Thresholds */}
          <div style={{
            background: "rgba(20,20,22,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>⚡</span>
                <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                  Estimated Delivery Time by Product Quantity Thresholds
                </h2>
              </div>
              
              {schedulingData.startDate && (
                <div style={{
                  fontSize: "0.875rem",
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(55,65,81,0.5)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <span>📅</span>
                  <span>Scheduling from: {schedulingData.startDate.toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {deliveryStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div style={{
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "2px solid #10b981",
                  background: "rgba(16, 185, 129, 0.1)"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      color: "#10b981"
                    }}>
                      {deliveryStats.totalOrderCount}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>
                      Total Orders
                    </div>
                  </div>
                </div>
                
                <div style={{
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "2px solid #3b82f6",
                  background: "rgba(59, 130, 246, 0.1)"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      color: "#3b82f6"
                    }}>
                      {deliveryStats.totalPendingQuantity.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>
                      Total Quantity
                    </div>
                  </div>
                </div>
                
                <div style={{
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "2px solid #f59e0b",
                  background: "rgba(245, 158, 11, 0.1)"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      color: "#f59e0b"
                    }}>
                      {deliveryStats.totalWeeklyCapacity}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>
                      Weekly Capacity
                    </div>
                  </div>
                </div>
                
                <div style={{
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "2px solid #ef4444",
                  background: "rgba(239, 68, 68, 0.1)"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      color: "#ef4444"
                    }}>
                      {deliveryStats.estimatedDays || 'N/A'}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>
                      Est. Days
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "rgba(55,65,81,0.3)",
                borderRadius: "12px",
                border: "2px dashed rgba(255,255,255,0.2)"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
                <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                  No Delivery Estimates Yet
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
                  Click the "Calculate Delivery Dates" button to see estimated delivery times and scheduling
                </p>
                <Button
                  onClick={handleCalculateDeliveryDates}
                  disabled={isCalculating || pendingOrders.length === 0 || vehicles.length === 0}
                  variant="primary"
                  style={{
                    background: "linear-gradient(135deg, #0A84FF, #0066CC)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.75rem 1.5rem",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    cursor: pendingOrders.length === 0 || vehicles.length === 0 ? "not-allowed" : "pointer",
                    opacity: pendingOrders.length === 0 || vehicles.length === 0 ? 0.5 : 1
                  }}
                >
                  {isCalculating ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: "12px",
                        height: "12px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }} />
                      Calculating...
                    </div>
                  ) : (
                    "⚡ Calculate Delivery Dates"
                  )}
                </Button>
              </div>
            )}
            
            {totalWeeklyCapacity === 0 && (
              <div style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", color: "#fbbf24", marginBottom: "0.5rem" }}>
                  <span style={{ marginRight: "0.5rem" }}>⚠️</span>
                  <span style={{ fontWeight: "500" }}>No Active Vehicles</span>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#fde68a", margin: 0 }}>
                  Estimated delivery times cannot be calculated without active vehicles. 
                  Please ensure vehicles are marked as "Active" in Vehicle Management.
                </p>
              </div>
            )}
          </div>


          {/* Region Utilization */}
          {Object.keys(summaryData.regionUtilization).length > 0 && (
            <div style={{
              background: "rgba(20,20,22,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>📍</span>
                <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                  Region Distribution
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summaryData.regionUtilization).map(([region, data]) => (
                  <div key={region} style={{
                    background: "rgba(55,65,81,0.5)",
                    borderRadius: "12px",
                    padding: "1rem",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "600", color: "#fff" }}>{region}</span>
                      <span style={{
                        background: "rgba(59,130,246,0.2)",
                        color: "#60a5fa",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "500"
                      }}>
                        {data.count} orders
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                      Total Quantity: {data.quantity.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Utilization */}
          {Object.keys(summaryData.vehicleUtilization).length > 0 && (
            <div style={{
              background: "rgba(20,20,22,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>🚛</span>
                <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                  Vehicle Assignment & Utilization
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summaryData.vehicleUtilization).map(([vehicleNo, data]) => (
                  <div key={vehicleNo} style={{
                    background: "rgba(55,65,81,0.5)",
                    borderRadius: "12px",
                    padding: "1rem",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "600", color: "#fff" }}>{vehicleNo}</span>
                      <span style={{
                        background: "rgba(59,130,246,0.2)",
                        color: "#60a5fa",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "500"
                      }}>
                        {data.count} orders
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
                      Type: {data.type}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                      Total Quantity: {data.quantity.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div style={{
            background: "rgba(20,20,22,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>📋</span>
              <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                Orders with Pending Quantities
              </h2>
            </div>
            
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                  No Orders Found
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
                  {searchText ? "No orders match your search criteria" : "No orders have pending quantities"}
                </p>
                {searchText && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchText("")}
                    style={{ background: "rgba(55,65,81,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : schedulingData.assignedOrders.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "rgba(55,65,81,0.3)",
                borderRadius: "12px",
                border: "2px dashed rgba(255,255,255,0.2)"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
                <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                  No Delivery Dates Calculated
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
                  Click the "Calculate Delivery Dates" button to assign vehicles and calculate estimated delivery dates
                </p>
                <Button
                  onClick={handleCalculateDeliveryDates}
                  disabled={isCalculating || pendingOrders.length === 0 || vehicles.length === 0}
                  variant="primary"
                  style={{
                    background: "linear-gradient(135deg, #0A84FF, #0066CC)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.75rem 1.5rem",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    cursor: pendingOrders.length === 0 || vehicles.length === 0 ? "not-allowed" : "pointer",
                    opacity: pendingOrders.length === 0 || vehicles.length === 0 ? 0.5 : 1
                  }}
                >
                  {isCalculating ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: "12px",
                        height: "12px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }} />
                      Calculating...
                    </div>
                  ) : (
                    "⚡ Calculate Delivery Dates"
                  )}
                </Button>
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <DataTable
                  data={filteredOrders}
                  columns={columns}
                  className="pending-orders-table"
                  stickyHeader={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </DieselPage>
  );
};

export default PendingOrders;
