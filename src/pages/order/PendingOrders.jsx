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
import { calculateEstimatedDeliveryTimes } from "../../utils/schedulingUtils";

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

  // Configurable quantity thresholds
  const QUANTITY_THRESHOLDS = [1500, 2500, 3000, 4000];

  // Fetch pending orders with real-time updates
  useEffect(() => {
    if (!selectedOrg?.orgID) return;

    const q = query(
      collection(db, "PENDING_SIMULATION"),
      where("orgID", "==", selectedOrg.orgID)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by simulatedDeliveryDate on the client side
        const sortedOrders = orders.sort((a, b) => {
          const dateA = a.simulatedDeliveryDate?.toDate ? a.simulatedDeliveryDate.toDate() : new Date(a.simulatedDeliveryDate?.seconds * 1000 || 0);
          const dateB = b.simulatedDeliveryDate?.toDate ? b.simulatedDeliveryDate.toDate() : new Date(b.simulatedDeliveryDate?.seconds * 1000 || 0);
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

  // Filter orders based on search text
  const filteredOrders = useMemo(() => {
    if (!searchText) return pendingOrders;
    
    return pendingOrders.filter(order => {
      const searchLower = searchText.toLowerCase();
      return (
        order.clientName?.toLowerCase().includes(searchLower) ||
        order.productName?.toLowerCase().includes(searchLower) ||
        order.vehicleNo?.toLowerCase().includes(searchLower) ||
        order.regionName?.toLowerCase().includes(searchLower)
      );
    });
  }, [pendingOrders, searchText]);

  // Calculate total weekly capacity from active vehicles
  const totalWeeklyCapacity = useMemo(() => {
    return vehicles.reduce((total, vehicle) => {
      if (!vehicle.weeklyCapacity) return total;
      const weeklyCap = Object.values(vehicle.weeklyCapacity).reduce((sum, cap) => sum + (cap || 0), 0);
      return total + weeklyCap;
    }, 0);
  }, [vehicles]);

  // Calculate estimated delivery times by quantity thresholds
  const estimatedDeliveryTimes = useMemo(() => {
    return calculateEstimatedDeliveryTimes(filteredOrders, vehicles, QUANTITY_THRESHOLDS);
  }, [filteredOrders, vehicles, QUANTITY_THRESHOLDS]);

  // Calculate summary data
  const summaryData = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + (order.productQuant || 0), 0);
    
    // Calculate per-vehicle utilization
    const vehicleUtilization = {};
    filteredOrders.forEach(order => {
      const vehicleNo = order.vehicleNo || "Unknown";
      if (!vehicleUtilization[vehicleNo]) {
        vehicleUtilization[vehicleNo] = { count: 0, quantity: 0 };
      }
      vehicleUtilization[vehicleNo].count++;
      vehicleUtilization[vehicleNo].quantity += order.productQuant || 0;
    });

    // Find earliest and latest delivery dates
    const deliveryDates = filteredOrders
      .map(order => order.simulatedDeliveryDate)
      .filter(date => date)
      .map(date => date.toDate ? date.toDate() : new Date(date.seconds * 1000))
      .sort((a, b) => a - b);

    const earliestDelivery = deliveryDates[0];
    const latestDelivery = deliveryDates[deliveryDates.length - 1];

    return {
      totalOrders,
      totalQuantity,
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
      key: 'vehicleNo',
      header: 'Vehicle No',
      align: 'center',
      icon: '🚛'
    },
    {
      key: 'vehicleType',
      header: 'Vehicle Type',
      align: 'center',
      icon: '🚜'
    },
    {
      key: 'simulatedDeliveryDate',
      header: 'Simulated Delivery',
      align: 'center',
      icon: '📅',
      render: (row) => formatDate(row.simulatedDeliveryDate)
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      icon: '📊',
      render: (row) => (
        <Badge 
          variant={row.status === "completed" ? "success" : "warning"}
        >
          {row.status === "completed" ? "Completed" : "Pending"}
        </Badge>
      )
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
        <LoadingState variant="inline" message="Loading pending orders..." icon="⏳" />
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
        <FilterBar.Search
          placeholder="Search orders..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: "300px" }}
        />
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
                <h3 style={{ color: "#00c3ff", fontWeight: "600", margin: 0 }}>Total Pending Orders</h3>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "0.25rem" }}>
                {summaryData.totalOrders}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                Orders awaiting delivery
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

          {/* Estimated Delivery Times by Quantity Thresholds */}
          <div style={{
            background: "rgba(20,20,22,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>⏱️</span>
              <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                Estimated Delivery Times by Quantity
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {estimatedDeliveryTimes.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    borderRadius: "12px",
                    padding: "1rem",
                    border: "2px solid",
                    transition: "all 0.2s ease",
                    ...(item.color === 'green' ? {
                      background: "rgba(34,197,94,0.1)",
                      borderColor: "rgba(34,197,94,0.3)"
                    } : item.color === 'orange' ? {
                      background: "rgba(251,191,36,0.1)",
                      borderColor: "rgba(251,191,36,0.3)"
                    } : item.color === 'red' ? {
                      background: "rgba(239,68,68,0.1)",
                      borderColor: "rgba(239,68,68,0.3)"
                    } : {
                      background: "rgba(107,114,128,0.1)",
                      borderColor: "rgba(107,114,128,0.3)"
                    })
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      ...(item.color === 'green' ? { color: "#22c55e" } :
                          item.color === 'orange' ? { color: "#fbbf24" } :
                          item.color === 'red' ? { color: "#ef4444" } :
                          { color: "#9ca3af" })
                    }}>
                      {item.range}
                    </div>
                    
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db", marginBottom: "0.25rem" }}>
                      Pending: {item.totalQuantity.toLocaleString()}
                    </div>
                    
                    <div style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      ...(item.color === 'green' ? { color: "#86efac" } :
                          item.color === 'orange' ? { color: "#fde68a" } :
                          item.color === 'red' ? { color: "#fca5a5" } :
                          { color: "#d1d5db" })
                    }}>
                      ETA: {item.estimatedDays === 0 ? 'N/A' : `${item.estimatedDays} day${item.estimatedDays === 1 ? '' : 's'}`}
                    </div>
                    
                    {item.estimatedDays > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                        {totalWeeklyCapacity > 0 ? `Based on ${totalWeeklyCapacity.toLocaleString()} weekly capacity` : 'No active vehicles'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
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
                  Vehicle Utilization
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
                Pending Orders
              </h2>
            </div>
            
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                  No Pending Orders Found
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
                  {searchText ? "No orders match your search criteria" : "No orders are currently pending"}
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
