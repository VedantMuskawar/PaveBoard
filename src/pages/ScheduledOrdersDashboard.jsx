import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, auth } from "../config/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  limit
} from "firebase/firestore";
import DMButtons from "../components/DMButtons";
import { generateDeliveryMemo, cancelDeliveryMemo } from "../components/DeliveryMemo";
import { ErrorBoundary } from "../components/ui";
import { useOrganization } from "../hooks/useOrganization";
// Removed cacheUtils import - using real-time listeners instead
import "./ScheduledOrdersDashboard.css";

// --- Local date helpers (avoid UTC shift) ---
const ymdLocal = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseYMDLocal = (yyyyMmDd) => {
  // yyyy-mm-dd -> local Date at 00:00:00.000
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') {
    return new Date(); // Return current date as fallback
  }
  
  const parts = yyyyMmDd.split("-");
  if (parts.length !== 3) {
    return new Date();
  }
  
  const [y, m, d] = parts.map(Number);
  
  // Validate date components
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return new Date();
  }
  
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

export default function ScheduledOrdersDashboard() {
  // Consolidated state management
  const [dashboardState, setDashboardState] = useState({
    orders: [],
    selectedDate: null,
    selectedVehicle: null,
    dateRange: [],
    loading: true,
    summary: { orders: 0, qty: 0, total: 0 },
    headerCondensed: false,
    actionLoading: {},
    dbReadCount: 0
  });
  
  const navigate = useNavigate();

  // Use organization hook for better organization management
  const { orgId } = useOrganization();

  // Destructure for easier access
  const {
    orders,
    selectedDate,
    selectedVehicle,
    dateRange,
    loading,
    summary,
    headerCondensed,
    actionLoading,
    dbReadCount
  } = dashboardState;

  // State update helpers
  const updateState = useCallback((updates) => {
    setDashboardState(prev => ({ ...prev, ...updates }));
  }, []);

  const setActionLoading = useCallback((actionId, isLoading) => {
    setDashboardState(prev => ({
      ...prev,
      actionLoading: {
        ...prev.actionLoading,
        [actionId]: isLoading
      }
    }));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      updateState({ headerCondensed: window.scrollY > 12 });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateState]);

  // Staggered reveal for order cards - optimized with useCallback
  const setupCardAnimations = useCallback(() => {
    const cards = document.querySelectorAll(".sch-card");
    if (!cards.length) return () => {};

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let timeoutIds = []; // Track timeouts for cleanup

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = prefersReduced ? 0 : (index++ % 10) * 40;
            const timeoutId = setTimeout(() => {
              if (el && el.classList) {
                el.classList.add("is-visible");
              }
            }, delay);
            timeoutIds.push(timeoutId);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    cards.forEach((c) => {
      if (c && c.classList) {
        c.classList.remove("is-visible");
        io.observe(c);
      }
    });

    return () => {
      io.disconnect();
      // Clear all pending timeouts
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []);



  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const today = new Date();
    const range = [];
    for (let i = -4; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      range.push(ymdLocal(d));
    }
    updateState({
      dateRange: range,
      selectedDate: ymdLocal(today)
    });
  }, [updateState]);

// Real-time orders fetching with Firestore listeners
const setupRealTimeListener = useCallback((date) => {
  if (!date || !orgId) return () => {};
  
  const start = parseYMDLocal(date);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, "SCH_ORDERS"),
    where("orgID", "==", orgId),
    where("deliveryDate", ">=", start),
    where("deliveryDate", "<=", end),
    orderBy("deliveryDate", "desc"),
    limit(100) // Reasonable limit to prevent performance issues with large datasets
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const ordersData = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, docID: doc.id };
    });
    
    setDashboardState(prev => {
      const newReadCount = prev.dbReadCount + 1;
      return {
        ...prev,
        orders: ordersData,
        loading: false,
        dbReadCount: newReadCount
      };
    });
  }, (error) => {
    updateState({ loading: false });
  });

  return unsubscribe;
}, [orgId]);

useEffect(() => {
  if (!selectedDate) return;
  
    updateState({ loading: true });
  const unsubscribe = setupRealTimeListener(selectedDate);
  
  // Cleanup listener when component unmounts or date changes
  return () => {
      if (unsubscribe) {
    unsubscribe();
      }
  };
  }, [selectedDate, setupRealTimeListener, updateState]);

  const formatDateKey = useCallback((ts) => {
    // Handle both Firestore timestamps and regular Date objects
    if (ts && typeof ts.toDate === 'function') {
      return ymdLocal(ts.toDate());
    } else if (ts instanceof Date) {
      return ymdLocal(ts);
    } else if (typeof ts === 'string') {
      return ymdLocal(new Date(ts));
    }
    return null;
  }, []);

  const formatTime = useCallback((ts) => {
    // Handle both Firestore timestamps and regular Date objects
    if (ts && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (ts instanceof Date) {
      return ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (typeof ts === 'string') {
      return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return '';
  }, []);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(o => {
      const orderDate = formatDateKey(o.deliveryDate);
      const matchesDate = orderDate === selectedDate;
      const matchesVehicle = !selectedVehicle || o.vehicleNumber === selectedVehicle;
      
      return matchesDate && matchesVehicle;
    });
    
    return filtered;
  }, [orders, selectedDate, selectedVehicle, formatDateKey]);

  // Sort filteredOrders: Pending first, then Dispatched, then Delivered
  const statusPriority = (o) => {
    if (o.deliveryStatus) return 2;      // Delivered last
    if (o.dispatchStatus) return 1;      // Dispatched middle
    return 0;                            // Pending first
  };
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => statusPriority(a) - statusPriority(b));
  }, [filteredOrders]);

  // Get all unique vehicles for the selected date
  const vehicles = useMemo(() => {
    if (!selectedDate) return [];
    return [...new Set(orders
      .filter(o => formatDateKey(o.deliveryDate) === selectedDate)
      .map(o => o.vehicleNumber)
      .filter(Boolean)
    )];
  }, [orders, selectedDate]);

  // Memoize summary calculation to prevent unnecessary recalculations
  const summaryData = useMemo(() => {
    if (!selectedDate) return { orders: 0, qty: 0, total: 0 };
    
    const filteredOrders = orders.filter(o => {
      const orderDate = formatDateKey(o.deliveryDate);
      const matchesDate = orderDate === selectedDate;
      const matchesVehicle = !selectedVehicle || o.vehicleNumber === selectedVehicle;
      return matchesDate && matchesVehicle;
    });
    
    const count = filteredOrders.length;
    const qty = filteredOrders.reduce((acc, o) => acc + (o.productQuant || 0), 0);
    const total = filteredOrders.reduce((acc, o) => acc + ((o.productQuant || 0) * (o.productUnitPrice || 0)), 0);
    
    return { orders: count, qty, total };
  }, [orders, selectedDate, selectedVehicle]);

  useEffect(() => {
    updateState({ summary: summaryData });
  }, [summaryData, updateState]);

  // Validate selected vehicle exists in available vehicles
  useEffect(() => {
    if (selectedVehicle && vehicles.length > 0 && !vehicles.includes(selectedVehicle)) {
      updateState({ selectedVehicle: null });
    }
  }, [selectedVehicle, vehicles]);

  // Deduplication: Only remove orders with identical docID (true database duplicates)
  // This allows multiple orders with same defOrderID but different time slots to show
  const deduplicatedOrders = useMemo(() => {
    const uniqueOrdersMap = new Map();
    
    sortedOrders.forEach(order => {
      // Use docID as the unique key - this is the actual database document ID
      const docID = order.docID || order.id;
      
      if (!uniqueOrdersMap.has(docID)) {
        uniqueOrdersMap.set(docID, order);
      } else {
        // Only log if we find actual database duplicates (shouldn't happen)
        if (process.env.NODE_ENV === 'development') {
        }
      }
    });
    
    return Array.from(uniqueOrdersMap.values());
  }, [sortedOrders]);

  // Use defOrderID for unique order identification with proper deduplication
  const ordersWithUniqueKeys = useMemo(() => {
    const result = deduplicatedOrders.map((order, index) => {
      // Create a more robust unique key combining multiple identifiers
      const baseKey = order.defOrderID || order.docID || order.id;
      const timeKey = order.dispatchStart?.seconds || order.deliveryDate?.seconds || index;
      const productKey = order.productName ? order.productName.substring(0, 10) : '';
      const quantityKey = order.productQuant || 0;
      
      // Combine multiple factors to ensure uniqueness even with same time slots
      const uniqueKey = baseKey 
        ? `${baseKey}-${timeKey}-${productKey}-${quantityKey}` 
        : `order-${index}-${productKey}`;
      
      return {
        ...order,
        uniqueKey
      };
    });
    
    return result;
  }, [deduplicatedOrders]);
  
  
  // Setup card animations after ordersWithUniqueKeys is defined
  useEffect(() => {
    const cleanup = setupCardAnimations();
    return cleanup;
  }, [ordersWithUniqueKeys.length, setupCardAnimations]);

  return (
    <ErrorBoundary>
    <div className="apple-font-stack" style={{
      background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
      minHeight: "100vh",
      color: "#f5f5f7",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      {/* Modern Header */}
      <header className={`header-background ${headerCondensed ? 'header-condensed' : 'header-normal'}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Link to="/home" style={{
            fontSize: "1.2rem",
            color: "#f5f5f7",
            textDecoration: "none",
            padding: "0.5rem 1rem",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            transition: "all 200ms ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            ← 
          </Link>
          <div style={{ 
            fontSize: "1.5rem", 
            fontWeight: 700, 
            letterSpacing: "0.2px",
            color: "#f5f5f7"
          }}>
            📅 Scheduled Orders
          </div>
          <div style={{ width: "120px" }}></div>
        </div>
      </header>

      {/* Date Picker - Modern Style */}
      <div className="date-picker-container" style={{
        top: headerCondensed ? 58 : 66,
      }}>
        {dateRange.map(date => {
          const d = new Date(date);
          return (
            <div
              key={date}
              onClick={() => {
                updateState({
                  selectedDate: date,
                  selectedVehicle: null
                });
              }}
              className={`pill ${date === selectedDate ? 'active' : ''}`}
            >
              <strong>{d.toLocaleString("en-US", { month: "short" })}</strong><br />
              {d.getDate()}<br />
              {d.toLocaleString("en-US", { weekday: "short" })}
            </div>
          );
        })}
      </div>

      {/* Vehicle Filter - Modern Style */}
      <div className="vehicle-filter-container">
        <div
          onClick={() => updateState({ selectedVehicle: null })}
          className={`pill ${!selectedVehicle ? 'active' : ''}`}
        >
          🚛 All Vehicles
        </div>
        {vehicles.map(vehicle => (
          <div
            key={vehicle}
            onClick={() => updateState({ selectedVehicle: vehicle })}
            className={`pill ${selectedVehicle === vehicle ? 'active' : ''}`}
          >
            🚚 {vehicle}
          </div>
        ))}
      </div>

      {/* Summary Stats - Clean & Modern */}
      <div className="summary-container">
        <div className="summary-item">
          <span className="summary-icon">📊</span>
          <span className="summary-number">{summary.orders}</span>
          <span className="summary-text">Orders</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-icon">🔢</span>
          <span className="summary-number">{summary.qty.toLocaleString()}</span>
          <span className="summary-text">Quantity</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-icon">💰</span>
          <span className="summary-number">₹{summary.total.toLocaleString()}</span>
          <span className="summary-text">Total Value</span>
        </div>
      </div>

      {/* Orders Grid - Fixed 4 Columns */}
      <div className="orders-grid">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-surface loading-skeleton" />
          ))
        ) : ordersWithUniqueKeys.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '3rem 2rem',
            background: 'rgba(28,28,30,0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#a1a1aa'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f5f5f7' }}>
              No Orders Found
            </h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.5' }}>
            No orders found for the selected date and vehicle filter.
            </p>
          </div>
        ) : (
          <>
            {ordersWithUniqueKeys.map((o, idx) => (
              <OrderCard 
                key={o.uniqueKey}
                order={o}
                formatTime={formatTime}
                actionLoading={actionLoading}
                setActionLoading={setActionLoading}
                orgId={orgId}
                updateState={updateState}
              />
            ))}
          </>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}

// Memoized OrderCard component for better performance
const OrderCard = memo(({ order: o, formatTime, actionLoading, setActionLoading, orgId, updateState }) => {
  // Determine card status class
  let cardStatusClass = "pending";
  if (o.deliveryStatus) {
    cardStatusClass = "delivered";
  } else if (o.dispatchStatus) {
    cardStatusClass = "dispatched";
  }
  
  const paymentLabel = !o.paymentStatus ? (o.paySchedule === "POD" ? "Pay on Delivery" : o.paySchedule === "PL" ? "Pay Later" : o.paySchedule) : o.toAccount || "—";
  

  return (
    <div className={`order-card sch-card ${cardStatusClass}`}>
      <div className="order-card-header">
        <div>
          <div className="sub-text" style={{ fontSize: "16px", marginBottom: "0.25rem" }}>
            🚚 Vehicle: {o.vehicleNumber || "-"}
          </div>
          <div className="sub-text" style={{ fontSize: "14px" }}>
            ⏰ {formatTime(o.dispatchStart)} - {formatTime(o.dispatchEnd)}
          </div>
        </div>
        <div style={{ textAlign: "right", fontWeight: 700, fontSize: "18px" }}>
          <div className="sub-text" style={{ fontSize: "16px", marginBottom: "0.25rem" }}>
            👤 {o.clientName}
          </div>
          <div className="sub-text" style={{ fontSize: "14px" }}>📞 {o.clientPhoneNumber}</div>
        </div>
      </div>
      <div className="order-card-details sub-text">
        <div style={{ marginBottom: "0.5rem" }}>📍 <strong>Region:</strong> {o.address}, {o.regionName}</div>
        <div style={{ marginBottom: "0.5rem" }}>📦 <strong>Product:</strong> {o.productName}</div>
        <div style={{ marginBottom: "0.5rem" }}>💰 <strong>Unit Price:</strong> ₹{o.productUnitPrice}</div>
        <div style={{ marginBottom: "0.5rem" }}>🔢 <strong>Quantity:</strong> {o.productQuant}</div>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{
            color: !o.paymentStatus ? "#FFD60A" : "#32D74B",
            fontWeight: 700,
            filter: o.dispatchStatus ? "brightness(0.8)" : undefined
          }}>
            💳 <strong>Payment:</strong> {paymentLabel}
          </span>
        </div>
        <div style={{ marginBottom: "0.5rem", fontSize: "16px", fontWeight: 700 }}>
          💰 <strong>Total:</strong> ₹{(o.productQuant * o.productUnitPrice).toLocaleString()}
        </div>
        {o.dmNumber && o.dmNumber !== "Cancelled" && typeof o.dmNumber === "number" && (
          <div style={{ marginBottom: "0.5rem" }}>
            📄 <strong>DM No:</strong>{" "}
            <a
              href={`/print-dm/${o.dmNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dm-link"
            >
              #{o.dmNumber}
            </a>
          </div>
        )}
        {o.dmNumber === "Cancelled" && (
          <div style={{ marginBottom: "0.5rem" }}>
            📄 <strong>DM:</strong> <span style={{ color: "#ff4444" }}>Cancelled</span>
          </div>
        )}
      </div>
      <div className="order-card-actions">
        <div className="order-card-actions-container">
          {/* Show DMButtons if not delivered/dispatched and no DM or DM is cancelled or dmNumber is not a number */}
          {!o.deliveryStatus && !o.dispatchStatus && (!o.dmNumber || o.dmNumber === "Cancelled" || typeof o.dmNumber !== "number") && (
            <DMButtons 
              order={o} 
              onActionLoading={setActionLoading}
            />
          )}
          {/* Print DM button if dmNumber exists and is not cancelled */}
          {o.dmNumber && o.dmNumber !== "Cancelled" && typeof o.dmNumber === "number" && (
            <button
              onClick={async () => {
                const actionId = `print-${o.docID}`;
                setActionLoading(actionId, true);
                try {
                  // Validate DM still exists and is active
                  const dmQuery = query(
                    collection(db, "DELIVERY_MEMOS"),
                    where("dmNumber", "==", o.dmNumber),
                    where("orgID", "==", orgId),
                    where("status", "==", "active")
                  );
                  const snapshot = await getDocs(dmQuery);
                  
                  if (snapshot.empty) {
                    alert("Delivery Memo not found or has been cancelled.");
                    return;
                  }
                  
                  const printWindow = window.open(`/print-dm/${o.dmNumber}`, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                  
                  if (!printWindow) {
                    alert("Please allow popups for this site to print delivery memos.");
                  }
                } catch (error) {
                  alert("Failed to open print window. Please try again.");
                } finally {
                  setActionLoading(actionId, false);
                }
              }}
              className="action-button button-neutral"
              disabled={actionLoading[`print-${o.docID}`]}
            >
              {actionLoading[`print-${o.docID}`] ? '⏳ Printing...' : '🖨️ Print DM'}
            </button>
          )}
          {/* Cancel DM button if DM exists, is not Cancelled, and not delivered or dispatched */}
          {!o.deliveryStatus && !o.dispatchStatus && o.dmNumber && o.dmNumber !== "Cancelled" && typeof o.dmNumber === "number" && (
            <button
              onClick={async () => {
                const actionId = `cancel-${o.docID}`;
                
                // Enhanced confirmation with order details
                const confirmMessage = `Are you sure you want to cancel Delivery Memo #${o.dmNumber} for ${o.clientName}?\n\nThis action cannot be undone.`;
                
                if (window.confirm(confirmMessage)) {
                  setActionLoading(actionId, true);
                  try {
                    // First, verify the DM still exists and is active
                    const dmQuery = query(
                      collection(db, "DELIVERY_MEMOS"),
                      where("dmNumber", "==", o.dmNumber),
                      where("orgID", "==", orgId),
                      where("status", "==", "active")
                    );

                    const snapshot = await getDocs(dmQuery);
                    if (snapshot.empty) {
                      alert("Delivery Memo not found or has already been cancelled.");
                      return;
                    }

                    const dmDoc = snapshot.docs[0];
                    const dmData = dmDoc.data();
                    
                    // Verify this is the correct DM for this order
                    if (dmData.orderID !== o.docID) {
                      alert("Delivery Memo does not match this order. Please refresh the page.");
                      return;
                    }

                    // Update DELIVERY_MEMOS collection
                    await updateDoc(doc(db, "DELIVERY_MEMOS", dmDoc.id), {
                      status: "cancelled",
                      clientName: "Cancelled",
                      vehicleNumber: "Cancelled",
                      regionName: "Cancelled",
                      productName: "Cancelled",
                      productQuant: "Cancelled",
                      productUnitPrice: "Cancelled",
                      toAccount: "Cancelled",
                      paySchedule: "Cancelled",
                      paymentStatus: "Cancelled",
                      dispatchStart: "Cancelled",
                      dispatchEnd: "Cancelled",
                      deliveryDate: "Cancelled",
                      dispatchedTime: "Cancelled",
                      deliveredTime: "Cancelled",
                      cancelledAt: new Date(),
                      cancelledBy: auth.currentUser?.uid || "unknown"
                    });
                    
                    // Update SCH_ORDERS collection
                    await updateDoc(doc(db, "SCH_ORDERS", o.docID), {
                      dmNumber: "Cancelled",
                      dmCancelledAt: new Date(),
                      dmCancelledBy: auth.currentUser?.uid || "unknown"
                    });
                    
                    alert(`Delivery Memo #${o.dmNumber} has been successfully cancelled.`);
                  } catch (error) {
                    if (error.code === 'permission-denied') {
                      alert("You don't have permission to cancel this delivery memo.");
                    } else if (error.code === 'not-found') {
                      alert("Delivery Memo not found. It may have already been cancelled.");
                    } else {
                      alert("Failed to cancel delivery memo. Please try again or contact support.");
                    }
                  } finally {
                    setActionLoading(actionId, false);
                  }
                }
              }}
              className="action-button button-danger"
              disabled={actionLoading[`cancel-${o.docID}`]}
            >
              {actionLoading[`cancel-${o.docID}`] ? '⏳ Cancelling...' : '❌ Cancel DM'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
