import { useEffect, useState, useCallback, useMemo } from "react";
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
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

export default function ScheduledOrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [dateRange, setDateRange] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ orders: 0, qty: 0, total: 0 });
  const navigate = useNavigate();

  // Use the correct organization ID
  const orgId = "K4Q6vPOuTcLPtlcEwdw0";

  const [headerCondensed, setHeaderCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setHeaderCondensed(window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Staggered reveal for order cards
  useEffect(() => {
    const cards = document.querySelectorAll(".sch-card");
    if (!cards.length) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = prefersReduced ? 0 : (index++ % 10) * 40; // 0–360ms stagger
            setTimeout(() => el.classList.add("is-visible"), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    cards.forEach((c) => {
      c.classList.remove("is-visible");
      io.observe(c);
    });

    return () => io.disconnect();
  }, [orders]);


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
    setDateRange(range);
    setSelectedDate(ymdLocal(today));
  }, []);

// Real-time orders fetching with Firestore listeners
const setupRealTimeListener = useCallback((date) => {
  if (!date || !orgId) return () => {};
  
  const start = parseYMDLocal(date);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  console.log('🔄 Setting up real-time listener for date:', date);
  console.log('📅 Date range:', start.toISOString(), 'to', end.toISOString());

  const q = query(
    collection(db, "SCH_ORDERS"),
    where("orgID", "==", orgId),
    where("deliveryDate", ">=", start),
    where("deliveryDate", "<=", end),
    orderBy("deliveryDate", "desc"),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('📡 Real-time update received:', snapshot.docs.length, 'orders');
    console.log('📅 Query details:', {
      orgId: orgId,
      start: start.toISOString(),
      end: end.toISOString(),
      selectedDate: selectedDate
    });
    
    const ordersData = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📋 Sample order data:', {
        docId: doc.id,
        clientName: data.clientName,
        vehicleNumber: data.vehicleNumber,
        deliveryDate: data.deliveryDate,
        deliveryDateType: typeof data.deliveryDate,
        orgID: data.orgID
      });
      return { ...data, docID: doc.id };
    });
    
    console.log('✅ Setting orders:', ordersData.length, 'orders');
    setOrders(ordersData);
    setLoading(false);
  }, (error) => {
    console.error("❌ Real-time listener error:", error);
    setLoading(false);
  });

  return unsubscribe;
}, [orgId]);

useEffect(() => {
  if (!selectedDate) return;
  
  setLoading(true);
  console.log('🔄 Setting up real-time listener for selected date:', selectedDate);
  
  const unsubscribe = setupRealTimeListener(selectedDate);
  
  // Cleanup listener when component unmounts or date changes
  return () => {
    console.log('🧹 Cleaning up real-time listener');
    unsubscribe();
  };
}, [selectedDate, setupRealTimeListener]);

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

  const formatTime = (ts) => {
    // Handle both Firestore timestamps and regular Date objects
    if (ts && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (ts instanceof Date) {
      return ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (typeof ts === 'string') {
      return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return '';
  };

  const filteredOrders = useMemo(() => {
    console.log('🔄 Starting filtering process:', {
      totalOrders: orders.length,
      selectedDate,
      selectedVehicle,
      ordersSample: orders.slice(0, 2).map(o => ({
        clientName: o.clientName,
        vehicleNumber: o.vehicleNumber,
        deliveryDate: o.deliveryDate,
        deliveryDateType: typeof o.deliveryDate
      }))
    });
    
    const filtered = orders.filter(o => {
      const orderDate = formatDateKey(o.deliveryDate);
      const matchesDate = orderDate === selectedDate;
      const matchesVehicle = !selectedVehicle || o.vehicleNumber === selectedVehicle;
      
      // Debug all orders for first few
      if (orders.indexOf(o) < 5) {
        console.log('🔍 Order filtering debug:', {
          dmNumber: o.dmNumber,
          clientName: o.clientName,
          deliveryDate: o.deliveryDate,
          orderDate,
          selectedDate,
          matchesDate,
          vehicleNumber: o.vehicleNumber,
          selectedVehicle,
          matchesVehicle,
          deliveryDateType: typeof o.deliveryDate,
          finalMatch: matchesDate && matchesVehicle
        });
      }
      
      return matchesDate && matchesVehicle;
    });
    
    console.log('📊 Filtering results:', {
      totalOrders: orders.length,
      filteredOrders: filtered.length,
      selectedDate,
      selectedVehicle,
      filteredSample: filtered.slice(0, 2).map(o => ({
        clientName: o.clientName,
        vehicleNumber: o.vehicleNumber
      }))
    });
    
    return filtered;
  }, [orders, selectedDate, selectedVehicle]);

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
    setSummary(summaryData);
  }, [summaryData]);

  // Debug vehicle filter changes and validate selected vehicle
  useEffect(() => {
    console.log('🚛 Vehicle filter changed:', {
      selectedVehicle,
      availableVehicles: vehicles,
      totalOrders: orders.length,
      filteredOrders: filteredOrders.length,
      selectedDate
    });
    
    // Validate that selected vehicle exists in available vehicles
    if (selectedVehicle && vehicles.length > 0 && !vehicles.includes(selectedVehicle)) {
      console.warn('⚠️ Selected vehicle not found in available vehicles, resetting filter');
      setSelectedVehicle(null);
    }
  }, [selectedVehicle, vehicles, orders.length, filteredOrders.length, selectedDate]);

  // Deduplicate orders by clientName, vehicleNumber, and deliveryDate before rendering
  const deduplicatedOrders = useMemo(() => {
    const uniqueOrdersMap = new Map();
    sortedOrders.forEach(order => {
      const key = `${order.clientName}-${order.vehicleNumber}-${formatDateKey(order.deliveryDate)}`;
      if (!uniqueOrdersMap.has(key)) {
        uniqueOrdersMap.set(key, order);
      } else {
        // If duplicate found, keep the one with the most recent data or DM number
        const existing = uniqueOrdersMap.get(key);
        if (order.dmNumber && !existing.dmNumber) {
          // Prefer order with DM number
          uniqueOrdersMap.set(key, order);
        } else if (order.dmNumber === "Cancelled" && existing.dmNumber !== "Cancelled") {
          // Prefer cancelled status
          uniqueOrdersMap.set(key, order);
        } else if (order.updatedAt && existing.updatedAt && order.updatedAt > existing.updatedAt) {
          // Prefer more recently updated
          uniqueOrdersMap.set(key, order);
        }
      }
    });
    return Array.from(uniqueOrdersMap.values());
  }, [sortedOrders, formatDateKey]);
  
  console.log('🔄 Deduplication results:', {
    sortedOrders: sortedOrders.length,
    deduplicatedOrders: deduplicatedOrders.length,
    sampleDeduplicated: deduplicatedOrders[0]
  });
  
  console.log('🎯 Rendering state:', {
    loading,
    ordersCount: orders.length,
    filteredCount: filteredOrders.length,
    deduplicatedCount: deduplicatedOrders.length,
    selectedDate,
    selectedVehicle
  });

  return (
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
                setSelectedDate(date);
                setSelectedVehicle(null);
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
          onClick={() => setSelectedVehicle(null)}
          className={`pill ${!selectedVehicle ? 'active' : ''}`}
        >
          🚛 All Vehicles
        </div>
        {vehicles.map(vehicle => (
          <div
            key={vehicle}
            onClick={() => setSelectedVehicle(vehicle)}
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
        {(() => {
          console.log('🎨 Render check:', { loading, deduplicatedOrdersLength: deduplicatedOrders.length, deduplicatedOrders });
          return null;
        })()}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-surface loading-skeleton" />
          ))
        ) : deduplicatedOrders.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#666' }}>
            No orders found for the selected date and vehicle filter.
          </div>
        ) : (
          <>
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '1rem' }}>
              🎯 DEBUG: Rendering {deduplicatedOrders.length} orders
            </div>
            {deduplicatedOrders.map((o, idx) => {
            // Determine card status class
            let cardStatusClass = "pending";
            if (o.deliveryStatus) {
              cardStatusClass = "delivered";
            } else if (o.dispatchStatus) {
              cardStatusClass = "dispatched";
            }
            
            const paymentLabel = !o.paymentStatus ? (o.paySchedule === "POD" ? "Pay on Delivery" : o.paySchedule === "PL" ? "Pay Later" : o.paySchedule) : o.toAccount || "—";

            return (
              <div
                key={`${o.docID || o.id || o.defOrderID || idx}-${o.clientName}-${o.vehicleNumber}-${o.deliveryDate?.seconds || o.deliveryDate}`}
                className={`order-card sch-card ${cardStatusClass}`}
              >
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
                      // readable on both backgrounds
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
                    {/* Show DMButtons if not delivered and no DM or DM is cancelled or dmNumber is not a number */}
                    {!o.deliveryStatus && (!o.dmNumber || o.dmNumber === "Cancelled" || typeof o.dmNumber !== "number") && <DMButtons order={o} />}
                    {/* Print DM button if dmNumber exists */}
                    {o.dmNumber && (
                      <button
                        onClick={() => window.open(`/print-dm/${o.dmNumber}`, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes')}
                        className="action-button button-neutral"
                      >
                        🖨️ Print DM
                      </button>
                    )}
                    {/* Cancel DM button if DM exists, is not Cancelled, and not delivered or dispatched */}
                    {!o.deliveryStatus && !o.dispatchStatus && o.dmNumber && o.dmNumber !== "Cancelled" && (
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          if (window.confirm("Are you sure you want to cancel this Delivery Memo?")) {
                            const originalText = btn.textContent;
                            btn.textContent = "Cancelling...";
                            btn.disabled = true;
                            btn.style.opacity = 0.6;
                            try {
                              const dmQuery = query(
                                collection(db, "DELIVERY_MEMOS"),
                                where("dmNumber", "==", o.dmNumber),
                                where("orgID", "==", orgId),
                              );

                              const snapshot = await getDocs(dmQuery);
                              if (!snapshot.empty) {
                                const dmDoc = snapshot.docs[0];
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
                                  cancelledAt: new Date()
                                });
                                // Mark dmNumber as "Cancelled" in SCH_ORDERS so UI reflects cancellation
                                await updateDoc(doc(db, "SCH_ORDERS", o.docID), {
                                  dmNumber: "Cancelled"
                                });
                                btn.textContent = "Cancelled ✅";
                              } else {
                                btn.textContent = "DM Not Found ❌";
                              }
                            } catch (error) {
                              console.error("Error cancelling DM:", error);
                              btn.textContent = "Error ❌";
                            } finally {
                              setTimeout(() => {
                                btn.textContent = originalText;
                                btn.disabled = false;
                                btn.opacity = 1;
                              }, 2000);
                            }
                          }
                        }}
                        className="action-button button-danger"
                      >
                        ❌ Cancel DM
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </>
        )}
      </div>
    </div>
  );
}
