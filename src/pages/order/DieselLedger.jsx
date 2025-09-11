import { useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";

// Import reusable UI components
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  SummaryCard,
  DataTable,
  Button,
  Modal,
  Card,
  LoadingState,
  EmptyState,
  ConfirmationModal,
  DateRangeFilter
} from "../../components/ui";

import "./DieselLedger.css";

// --- CONFIG: Move orgID to config/context
// Now using OrganizationContext instead of hardcoded config

// --- STYLES
const styles = {
  page: {
    background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
    minHeight: "100vh",
    paddingBottom: "2rem",
    color: "#f5f5f7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale"
  },
  header: {
    background: "rgba(20,20,22,0.6)",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "1.2rem",
    fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  },
  back: {
    fontSize: "0.95rem",
    cursor: "pointer",
    color: "#9ba3ae",
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(40,40,42,0.8), rgba(26,26,28,0.8))",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    userSelect: "none",
  },
  input: {
    height: "44px",
    padding: "0.55rem 0.9rem",
    width: "100%",
    background: "rgba(28,28,30,0.9)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    color: "#fff",
    fontSize: "16px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
    boxSizing: "border-box",
  },
  th: {
    padding: "12px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    textAlign: "center",
    fontWeight: 700,
    color: "#E5E7EB",
    fontSize: "0.98rem",
    background: "transparent"
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    textAlign: "center",
    color: "#EDEEF0",
    fontSize: "0.95rem"
  },
  button: {
    primary: {
      background: "linear-gradient(180deg, #0A84FF, #0066CC)",
      color: "#fff",
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 12,
      padding: "10px 16px",
      fontSize: "14px",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(10,132,255,0.25)",
      marginBottom: "0.5rem",
      transition: "transform 120ms ease, box-shadow 200ms ease",
    },
    settle: {
      background: "linear-gradient(180deg, #0A84FF, #0066CC)",
      color: "#fff",
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: "0.92rem",
      cursor: "pointer",
      boxShadow: "0 6px 18px rgba(10,132,255,0.22)",
      transition: "transform 120ms ease, box-shadow 200ms ease",
    },
    unsettle: {
      background: "linear-gradient(180deg, #FF453A, #C62D23)",
      color: "#fff",
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: "0.92rem",
      cursor: "pointer",
      boxShadow: "0 6px 18px rgba(255,69,58,0.22)",
      transition: "transform 120ms ease, box-shadow 200ms ease",
    },
    edit: {
      marginLeft: "0.5rem",
      background: "linear-gradient(180deg, rgba(44,44,46,0.9), rgba(36,36,38,0.9))",
      color: "#fff",
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 10,
      padding: "6px 10px",
      fontSize: "0.82rem",
      cursor: "pointer",
    },
    delete: {
      marginLeft: "0.5rem",
      background: "linear-gradient(180deg, #FF453A, #C62D23)",
      color: "#fff",
      fontWeight: 600,
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 10,
      padding: "6px 10px",
      fontSize: "0.82rem",
      cursor: "pointer"
    }
  },
  tableContainer: {
    background: "transparent",
    padding: "1rem",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.30)",
    overflowX: "auto",
    marginTop: "1rem",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  }
};

// --- DATE FORMATTING
function formatDate(dateObj) {
  if (!dateObj) return "";
  if (typeof dateObj === "string") {
    try {
      return new Date(dateObj).toLocaleDateString();
    } catch {
      return "";
    }
  }
  if (dateObj.toDate) {
    return dateObj.toDate().toLocaleDateString();
  }
  if (dateObj instanceof Date) {
    return dateObj.toLocaleDateString();
  }
  return "";
}

// --- SHARED STATE UPDATE UTILITY
function updateVoucherStates(setVouchers, setTotalUnpaidAmount, updatedVouchers) {
  setVouchers(updatedVouchers);
  const unpaidSum = updatedVouchers.reduce((acc, v) => v.paid ? acc : acc + (v.amount || 0), 0);
  setTotalUnpaidAmount(unpaidSum);
}

// --- TABLE ROW COMPONENT
function VoucherTableRow({ 
  v, 
  vouchers, 
  setVouchers, 
  setTotalUnpaidAmount, 
  setVoucherNo, 
  setDate, 
  setAmount, 
  setVehicleNo, 
  setEditingVoucher, 
  setShowEntryForm, 
  handleMarkPaid, 
  handleDelete,
  handleVerify,
  handleUnverify,
  setSelectedVoucher,
  setShowCancellationModal,
  isAdmin,
  isManager,
  pendingCancellationRequests
}) {
  // Determine if Unsettle should be available (only within 4 days of settlement)
  const paidAtDate = v?.paidAt?.toDate ? v.paidAt.toDate() : (v?.paidAt instanceof Date ? v.paidAt : null);
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  const canUnsettle = !v.paid || !paidAtDate ? true : (Date.now() - paidAtDate.getTime()) <= FOUR_DAYS_MS;
  return (
   <tr
    style={{
      background: "rgba(28,28,30,0.42)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      transition: "background-color 160ms ease, transform 120ms ease",
      cursor: "pointer",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)"
    }}
    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
    >
      <td style={styles.td}>{v.voucherNo}</td>
      <td style={styles.td}>{formatDate(v.date)}</td>
      <td style={styles.td}>{v.vehicleNo || "-"}</td>
      <td style={styles.td}>₹{v.amount?.toLocaleString()}</td>
      <td style={styles.td}>
         <span style={{
            backgroundColor: v.paid ? "rgba(50,215,75,0.14)" : "rgba(255,214,10,0.18)",
            color: v.paid ? "#32D74B" : "#8a6f00",
            padding: "4px 10px",
            borderRadius: "999px",
            border: v.paid ? "1px solid rgba(50,215,75,0.35)" : "1px solid rgba(255,214,10,0.45)",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.02em",
            userSelect: "none"
          }}>
          {v.paid ? "PAID" : "UNPAID"}
          </span>
      </td>
      <td style={styles.td}>
        <span style={{
          backgroundColor: v.verified ? "rgba(50,215,75,0.14)" : "rgba(255,69,58,0.18)",
          color: v.verified ? "#32D74B" : "#FF453A",
          padding: "4px 10px",
          borderRadius: "999px",
          border: v.verified ? "1px solid rgba(50,215,75,0.35)" : "1px solid rgba(255,69,58,0.45)",
          fontWeight: 700,
          fontSize: "0.85rem",
          letterSpacing: "0.02em",
          userSelect: "none"
        }}>
          {v.verified ? "VERIFIED" : "UNVERIFIED"}
        </span>
      </td>
      <td style={styles.td}>{v.chequeNo || "-"}</td>
      <td style={styles.td}>
        {/* Admin Actions */}
        {isAdmin && (
          <>
            {/* Verify/Unverify buttons */}
            {!v.verified ? (
              <button
                aria-label="Verify voucher"
                onClick={() => handleVerify(v.id)}
                style={{
                  ...styles.button.settle,
                  background: "linear-gradient(180deg, #28a745, #1e7e34)",
                  marginRight: "0.5rem"
                }}
                tabIndex={0}
              >
                <span role="img" aria-label="Verify">✅</span> Verify
              </button>
            ) : (
              <button
                aria-label="Unverify voucher"
                onClick={() => handleUnverify(v.id)}
                style={{
                  ...styles.button.settle,
                  background: "linear-gradient(180deg, #ffc107, #e0a800)",
                  color: "#000",
                  marginRight: "0.5rem"
                }}
                tabIndex={0}
              >
                <span role="img" aria-label="Unverify">⚠️</span> Unverify
              </button>
            )}
            
            {/* Settle/Unsettle buttons - Admin only */}
            {!v.paid ? (
              <button
                aria-label="Settle voucher"
                onClick={() => {
                  const chequeNo = prompt("Enter Cheque Number:");
                  if (chequeNo) handleMarkPaid(v.id, chequeNo);
                }}
                style={styles.button.settle}
                tabIndex={0}
              >
                <span role="img" aria-label="Settle">💸</span> Settle
              </button>
            ) : (
              <button
                aria-label="Unsettle voucher"
                onClick={async () => {
                  if (!window.confirm("Unsettle this voucher?")) return;
                  try {
                    await updateDoc(doc(db, "VEHICLE_VOUCHERS", v.id), {
                      paid: false,
                      paidAt: null,
                      chequeNo: ""
                    });
                    // Real-time listener will automatically update the UI
                    toast.success("Voucher unsettled successfully");
                  } catch (error) {
                    console.error("Error unsettling voucher:", error);
                    toast.error("Failed to unsettle voucher");
                  }
                }}
                style={styles.button.unsettle}
                tabIndex={0}
              >
                <span role="img" aria-label="Unsettle">❌</span> Unsettle
              </button>
            )}
            
            {/* Edit and Delete buttons for Admin */}
            <button
              aria-label="Edit voucher"
              onClick={() => {
                setVoucherNo(v.voucherNo);
                setDate(v.date?.toDate?.().toISOString().slice(0, 10) || "");
                setAmount(v.amount);
                setVehicleNo(v.vehicleNo);
                setEditingVoucher(v);
                setShowEntryForm(true);
              }}
              style={styles.button.edit}
              tabIndex={0}
            >
              <span role="img" aria-label="Edit">✏️</span> Edit
            </button>
            <button
              aria-label="Delete voucher"
              onClick={() => handleDelete(v.id)}
              style={styles.button.delete}
              tabIndex={0}
            >
              <span role="img" aria-label="Delete">🗑️</span> Delete
            </button>
          </>
        )}

        {/* Manager Actions - Only Edit and Delete for unverified and unpaid vouchers */}
        {isManager && !v.verified && !v.paid && (
          <>
            {/* Edit and Delete buttons for Manager - only for unverified and unpaid vouchers */}
            <button
              aria-label="Edit voucher"
              onClick={() => {
                setVoucherNo(v.voucherNo);
                setDate(v.date?.toDate?.().toISOString().slice(0, 10) || "");
                setAmount(v.amount);
                setVehicleNo(v.vehicleNo);
                setEditingVoucher(v);
                setShowEntryForm(true);
              }}
              style={styles.button.edit}
              tabIndex={0}
            >
              <span role="img" aria-label="Edit">✏️</span> Edit
            </button>
            <button
              aria-label="Delete voucher"
              onClick={() => handleDelete(v.id)}
              style={styles.button.delete}
              tabIndex={0}
            >
              <span role="img" aria-label="Delete">🗑️</span> Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

// --- ENTRY FORM MODAL COMPONENT
function EntryFormModal({
  show,
  onClose,
  onSubmit,
  voucherNo,
  setVoucherNo,
  date,
  setDate,
  amount,
  setAmount,
  vehicleNo,
  setVehicleNo,
  vehicleOptions,
  editingVoucher,
  validation,
  setValidation
}) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      top: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      zIndex: 9999,
      padding: "1rem",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      width: "100%",
      height: "100vh",
      overflow: "auto"
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)",
        padding: "2rem",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        maxWidth: "500px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        color: "#f3f3f3",
        position: "relative",
        transform: "translateY(0)",
        animation: "modalSlideIn 0.3s ease-out",
        margin: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: "#00c3ff", fontWeight: "bold" }}>
            {editingVoucher ? "Edit Diesel Voucher Entry" : "Add New Diesel Voucher Entry"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "26px",
              color: "#ff4444",
              cursor: "pointer",
              marginLeft: "1rem"
            }}
            title="Close"
            aria-label="Close entry form"
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#ccc" }}>Voucher No:</label><br />
            <input
          type="number"
          value={voucherNo}
          onChange={e => {
            setVoucherNo(e.target.value);
            setValidation(prev => ({ ...prev, voucherNo: "" }));
          }}
              style={styles.input}
          required
          aria-label="Voucher Number"
        />
            {validation?.voucherNo && <div style={{ color: "#ff4444", fontSize: "0.92em" }}>{validation.voucherNo}</div>}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#ccc" }}>Date:</label><br />
            <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
              style={styles.input}
          required
          aria-label="Date"
        />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#ccc" }}>Amount:</label><br />
            <input
          type="number"
          step="0.01"
          value={amount}
          onChange={e => {
            setAmount(e.target.value);
            setValidation(prev => ({ ...prev, amount: "" }));
          }}
              style={styles.input}
          required
          aria-label="Amount"
        />
            {validation?.amount && <div style={{ color: "#ff4444", fontSize: "0.92em" }}>{validation.amount}</div>}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "#ccc" }}>Vehicle No:</label><br />
          <select
            value={vehicleNo}
            onChange={e => {
              setVehicleNo(e.target.value);
              setValidation(prev => ({ ...prev, vehicleNo: "" }));
            }}
              style={styles.input}
            required
            aria-label="Vehicle Number"
          >
            <option value="">Select Vehicle</option>
            {vehicleOptions.map((v, i) => (
              <option key={i} value={v.vehicleNo}>{v.vehicleNo}</option>
            ))}
          </select>
            {validation?.vehicleNo && <div style={{ color: "#ff4444", fontSize: "0.92em" }}>{validation.vehicleNo}</div>}
        </div>
          <div style={{ textAlign: "right" }}>
            <button
            type="submit"
              style={{
                background: "#00c3ff",
                color: "#181c1f",
                fontWeight: "bold",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1.3rem",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,195,255,0.15)"
              }}
            aria-label="Submit entry"
          >
            Submit
            </button>
        </div>
      </form>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT
function DieselLedger({ onBack }) {
  // --- State for total unpaid amount
  const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0);
  // --- Database read count tracking
  const [readCount, setReadCount] = useState(0);
  // --- Cache for unpaid amount calculation
  const [unpaidAmountCalculated, setUnpaidAmountCalculated] = useState(false);
  // --- Refs to prevent duplicate queries
  const isLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const initialLoadCompletedRef = useRef(false);
  // --- Fix: Define inputStyle for use in settle modal
  const inputStyle = {
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    width: "100%",
    marginBottom: "1rem",
  };
  const [vouchers, setVouchers] = useState([]);
  const [filterText, setFilterText] = useState(() => localStorage.getItem("dieselFilterText") || "");
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [voucherNo, setVoucherNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [validation, setValidation] = useState({});
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleFilterType, setSettleFilterType] = useState("date");
  const [settleFilterValue, setSettleFilterValue] = useState({ start: "", end: "" });
  const [settleChequeNo, setSettleChequeNo] = useState("");
  // Settle Vouchers modal states
  const [fromVoucher, setFromVoucher] = useState("");
  const [toVoucher, setToVoucher] = useState("");
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [paymentMode, setPaymentMode] = useState("");
  // --- Date range filter state (replaces filterDate/showDateFiltered)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isDateRangeActive, setIsDateRangeActive] = useState(false);
  // Pagination state - SIMPLIFIED
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Get organization and auth data first
  const { selectedOrganization: selectedOrg, isLoading: orgLoading } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const orgID = selectedOrg?.orgID || "";
  const navigate = useNavigate();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;

  // Constants
  const PAGE_SIZE = 50;

  // All hooks must be called before any conditional returns
  const handleMarkPaid = useCallback(async (voucherId, chequeNo) => {
    // Only admins can settle vouchers
    if (!isAdmin) {
      toast.error("Only admins can settle vouchers");
      return;
    }

    try {
      await updateDoc(doc(db, "VEHICLE_VOUCHERS", voucherId), {
        paid: true,
        paidAt: Timestamp.now(),
        chequeNo
      });
      // Real-time listener will automatically update the UI
      toast.success("Voucher settled successfully");
    } catch (error) {
      toast.error("Failed to settle voucher");
    }
  }, [isAdmin]);

  const handleVerify = useCallback(async (voucherId) => {
    try {
      await updateDoc(doc(db, "VEHICLE_VOUCHERS", voucherId), {
        verified: true,
        verifiedAt: Timestamp.now(),
        verifiedBy: user?.uid,
        verifiedByName: selectedOrg?.member?.name || user?.displayName || 'Admin'
      });
      // Real-time listener will automatically update the UI
      toast.success("Voucher verified successfully");
    } catch (error) {
      toast.error("Failed to verify voucher");
    }
  }, [user, selectedOrg]);

  const handleUnverify = useCallback(async (voucherId) => {
    if (!window.confirm("Are you sure you want to unverify this voucher? This will prevent managers from settling it.")) {
      return;
    }

    try {
      await updateDoc(doc(db, "VEHICLE_VOUCHERS", voucherId), {
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
        verifiedByName: null
      });
      // Real-time listener will automatically update the UI
      toast.success("Voucher unverified successfully");
    } catch (error) {
      toast.error("Failed to unverify voucher");
    }
  }, []);

  const handleDelete = useCallback(async (voucherId) => {
    if (!window.confirm("Are you sure you want to delete this voucher?")) return;
    
    try {
      await deleteDoc(doc(db, "VEHICLE_VOUCHERS", voucherId));
      // Real-time listener will automatically update the UI
      toast.success("Voucher deleted successfully");
    } catch (error) {
      toast.error("Failed to delete voucher");
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setValidation(errors);
    if (Object.keys(errors).length > 0) return;
    
    const numericAmount = parseFloat(amount);
    try {
      if (editingVoucher) {
        const docRef = doc(db, "VEHICLE_VOUCHERS", editingVoucher.id);
        await updateDoc(docRef, {
          voucherNo,
          date: Timestamp.fromDate(new Date(date)),
          amount: numericAmount,
          vehicleNo
        });
      } else {
        await addDoc(collection(db, "VEHICLE_VOUCHERS"), {
          voucherNo,
          date: Timestamp.fromDate(new Date(date)),
          amount: numericAmount,
          vehicleNo,
          paid: false,
          verified: false, // New vouchers are unverified by default
          orgID
        });
      }
      setShowEntryForm(false);
      setVoucherNo("");
      setDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setVehicleNo("");
      setEditingVoucher(null);
      setValidation({});
      // Real-time listener will automatically update the UI
      toast.success(editingVoucher ? "Voucher updated successfully" : "Voucher added successfully");
    } catch (err) {
      toast.error("Failed to save voucher");
    }
  }, [voucherNo, date, amount, vehicleNo, editingVoucher, orgID]);

  // Memoize filtered vouchers for better performance
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v =>
      v.voucherNo?.toString().includes(filterText.trim())
    );
  }, [filterText, vouchers]);
  
  // Memoize data table data
  const tableData = useMemo(() => {
    const filteredByDateRange = isDateRangeActive
      ? filteredVouchers.filter(v => {
          const vDate = v.date?.toDate?.();
          return vDate && vDate >= new Date(startDate) && vDate <= new Date(endDate + "T23:59:59");
        })
      : filteredVouchers;
      
      return [...filteredByDateRange].sort((a, b) => {
                const dateA = a.date?.toDate?.() || new Date(0);
                const dateB = b.date?.toDate?.() || new Date(0);
                const dateComparison = dateB - dateA;
                if (dateComparison === 0) {
                  return (b.voucherNo || 0) - (a.voucherNo || 0);
                }
                return dateComparison;
      });
  }, [filteredVouchers, isDateRangeActive, startDate, endDate]);
  
  // Memoize summary data
  const summaryData = useMemo(() => {
    const filteredByDateRange = isDateRangeActive
      ? filteredVouchers.filter(v => {
          const vDate = v.date?.toDate?.();
          return vDate && vDate >= new Date(startDate) && vDate <= new Date(endDate + "T23:59:59");
        })
      : filteredVouchers;
    return {
      label: "Total Amount",
      value: `₹${filteredByDateRange.reduce((acc, v) => acc + (v.amount || 0), 0).toLocaleString()}`
    };
  }, [filteredVouchers, isDateRangeActive, startDate, endDate]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes modalSlideIn {
        from { 
          opacity: 0; 
          transform: translateX(-50%) translateY(-20px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateX(-50%) translateY(0) scale(1); 
        }
      }
    `;
    document.head.appendChild(style);
  }, []);


  // Redirect to organization selector if no organization is selected (only after loading is complete)
  useEffect(() => {
    if (!orgLoading && (!selectedOrg || !orgID)) {
      navigate("/select-organization");
    }
  }, [selectedOrg, orgID, navigate, orgLoading]);


  // Load vouchers with pagination - FOR PAGINATION ONLY
  const loadVouchers = useCallback(async (page = 1, reset = false) => {
    if (!orgID || isLoadingRef.current) {
      console.log('🚫 Skipped: No orgID or already loading');
      return;
    }
    
    // Skip if this is initial load (handled by useEffect)
    if (page === 1 && reset && !initialLoadCompletedRef.current) {
      console.log('🚫 Skipped: Initial load handled by useEffect');
      return;
    }
    
    // Debounce: prevent calls within 1000ms of each other
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 1000) {
      console.log('🚫 Debounced: Too soon since last load');
      return;
    }
    lastLoadTimeRef.current = now;

    console.log(`🔄 Loading vouchers: page ${page}, reset: ${reset}`);
    isLoadingRef.current = true;
    setLoading(true);
    const dieselRef = collection(db, "VEHICLE_VOUCHERS");
    
    try {
      // Get data for current page using proper Firestore pagination with indexes
      let dataQuery;
      if (page === 1) {
        dataQuery = query(
      dieselRef,
      where("orgID", "==", orgID),
          orderBy("date", "desc"),
          limit(PAGE_SIZE + 1)
        );
      } else {
        if (!lastVisible) {
          console.error("No lastVisible document for pagination");
          return;
        }
        
        dataQuery = query(
          dieselRef,
          where("orgID", "==", orgID),
          orderBy("date", "desc"),
          startAfter(lastVisible),
          limit(PAGE_SIZE + 1)
        );
      }
      
      const snapshot = await getDocs(dataQuery);
      const docs = snapshot.docs;
      const hasMorePages = docs.length > PAGE_SIZE;
      const pageData = hasMorePages ? docs.slice(0, PAGE_SIZE) : docs;
      
      if (pageData.length > 0) {
        setLastVisible(pageData[pageData.length - 1]);
      }
      
      const voucherData = pageData.map(doc => ({ id: doc.id, ...doc.data() }));
      setVouchers(voucherData);
      
      setCurrentPage(page);
      setHasMore(hasMorePages);
      
      console.log(`📊 Pagination: ${docs.length} reads (page ${page})`);
      
    } catch (error) {
      console.error("Error loading vouchers:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [orgID, lastVisible]); // Only essential dependencies
  
  // Load initial data - COMPLETELY STABILIZED
  useEffect(() => {
    if (!orgID) return;
    
    // Prevent multiple initial loads
    if (initialLoadCompletedRef.current) {
      console.log('🚫 Initial load already completed, skipping');
      return;
    }
    
    console.log('🚀 Initial data load triggered');
    initialLoadCompletedRef.current = true;
    
    // Direct function call instead of using loadVouchers callback
    const loadInitialData = async () => {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      setLoading(true);
      
      try {
        const dieselRef = collection(db, "VEHICLE_VOUCHERS");
        const dataQuery = query(
        dieselRef,
        where("orgID", "==", orgID),
        orderBy("date", "desc"),
          limit(PAGE_SIZE + 1)
        );
        
        const snapshot = await getDocs(dataQuery);
        const docs = snapshot.docs;
        const hasMorePages = docs.length > PAGE_SIZE;
        const pageData = hasMorePages ? docs.slice(0, PAGE_SIZE) : docs;
        
        if (pageData.length > 0) {
          setLastVisible(pageData[pageData.length - 1]);
        }
        
        const voucherData = pageData.map(doc => ({ id: doc.id, ...doc.data() }));
        setVouchers(voucherData);
        
        // Calculate unpaid amount
        const unpaidSum = voucherData.reduce((acc, v) => v.paid ? acc : acc + (v.amount || 0), 0);
      setTotalUnpaidAmount(unpaidSum);
        
        setCurrentPage(1);
        setHasMore(hasMorePages);
        
        console.log(`📊 Initial load: ${docs.length} reads, ₹${unpaidSum.toLocaleString()} unpaid`);
        
    } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        isLoadingRef.current = false;
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    // Cleanup function to reset refs when orgID changes
    return () => {
      hasLoadedDataRef.current = false;
      vehiclesLoadedRef.current = false;
      isLoadingRef.current = false;
      initialLoadCompletedRef.current = false;
    };
  }, [orgID]); // Only depend on orgID

  // Load next page
  const loadNextPage = useCallback(() => {
    if (hasMore && !loading) {
      loadVouchers(currentPage + 1, false);
    }
  }, [hasMore, loading, currentPage, loadVouchers]);
  
  // Load previous page
  const loadPreviousPage = useCallback(() => {
    if (currentPage > 1 && !loading) {
      loadVouchers(currentPage - 1, true);
    }
  }, [currentPage, loading, loadVouchers]);
  
  // Go to specific page - SIMPLIFIED
  const goToPage = useCallback((page) => {
    if (page >= 1 && !loading) {
      loadVouchers(page, true);
    }
  }, [loading, loadVouchers]);
  
  // Refresh current page
  const refreshPage = useCallback(() => {
    if (!loading) {
      loadVouchers(currentPage, true);
    }
  }, [currentPage, loading, loadVouchers]);
  
    
  // Update localStorage when filter text changes
  useEffect(() => {
    localStorage.setItem("dieselFilterText", filterText);
  }, [filterText]);

  // Load vehicles only once when component mounts - FIXED CACHING
  const vehiclesLoadedRef = useRef(false);
  useEffect(() => {
    if (orgID && vehicleOptions.length === 0 && !vehiclesLoadedRef.current) {
      vehiclesLoadedRef.current = true;
      const fetchVehicles = async () => {
        try {
          // Use indexed query: status + orgID (if vehicles have orgID field)
          // If vehicles don't have orgID, just use status index
          const q = query(
            collection(db, "VEHICLES"), 
            where("status", "==", "Active"),
            limit(50) // Limit to prevent excessive reads
          );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());
        setVehicleOptions(data);
          
          // Track database reads for vehicles query (separate count)
          console.log(`📊 Vehicle Query: ${snap.docs.length} reads`);
        } catch (error) {
          console.error("Error loading vehicles:", error);
        }
      };
      fetchVehicles();
    }
  }, [orgID]); // Removed vehicleOptions.length dependency

  // Conditional rendering logic - moved after all hooks to prevent hooks order violation
  if (orgLoading) {
    return (
      <div style={styles.page}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
          <div style={{ color: "#8e8e93" }}>Loading organization data...</div>
        </div>
      </div>
    );
  }

  if (!selectedOrg || !orgID) {
    return (
      <div style={styles.page}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
          <div style={{ color: "#8e8e93" }}>Redirecting to organization selector...</div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={styles.page}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "#8e8e93" }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  // --- FORM VALIDATION
  function validateForm() {
    const errors = {};
    if (!voucherNo || isNaN(Number(voucherNo)) || Number(voucherNo) <= 0) {
      errors.voucherNo = "Voucher No. must be a positive number.";
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amount = "Amount must be a positive number.";
    }
    if (!vehicleNo) {
      errors.vehicleNo = "Please select a vehicle.";
    }
    return errors;
  }

  // --- Support Functions for Settle Vouchers Modal ---
  const handlePrintPreview = async () => {
    // Query unpaid vouchers within range
    if (!fromVoucher || !toVoucher) return;
    const from = parseInt(fromVoucher);
    const to = parseInt(toVoucher);
    if (isNaN(from) || isNaN(to) || from > to) {
      setSettlementPreview({ html: `<div style="color:#ff4444;">Invalid voucher range</div>` });
      return;
    }
    // Find vouchers from state (unpaid, in range)
    const selected = vouchers
      .filter(v => !v.paid && v.voucherNo >= from && v.voucherNo <= to)
      .sort((a, b) => {
        // Primary sort by date (oldest first for settlement)
        const dateA = a.date?.toDate?.() || new Date(0);
        const dateB = b.date?.toDate?.() || new Date(0);
        const dateComparison = dateA - dateB;
        
        // Secondary sort by voucherNo (ascending) if dates are equal
        if (dateComparison === 0) {
          return (a.voucherNo || 0) - (b.voucherNo || 0);
        }
        return dateComparison;
      });
    if (selected.length === 0) {
      setSettlementPreview({ html: `<div style="color:#ff4444;">No unpaid vouchers in this range.</div>` });
      return;
    }
    const total = selected.reduce((sum, v) => sum + (v.amount || 0), 0);
    // Compose printable HTML
    const html = `
      <div>
        <div style="font-weight:bold;font-size:1.1em;text-align:center;margin-bottom:0.4em;">Settlement Statement</div>
        <div style="text-align:center;margin-bottom:0.6em;">Voucher No ${from} to ${to}</div>
        <table style="width:100%;border-collapse:collapse;font-size:0.97em;">
          <thead>
            <tr>
              <th style="border:1px solid #aaa;padding:4px;">Voucher No</th>
              <th style="border:1px solid #aaa;padding:4px;">Date</th>
              <th style="border:1px solid #aaa;padding:4px;">Vehicle No</th>
              <th style="border:1px solid #aaa;padding:4px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${selected.map(v => `
              <tr>
                <td style="border:1px solid #aaa;padding:4px;text-align:center;">${v.voucherNo}</td>
                <td style="border:1px solid #aaa;padding:4px;text-align:center;">${formatDate(v.date)}</td>
                <td style="border:1px solid #aaa;padding:4px;text-align:center;">${v.vehicleNo}</td>
                <td style="border:1px solid #aaa;padding:4px;text-align:right;">${v.amount?.toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div style="margin-top:0.7em;text-align:right;font-weight:bold;">Total Unpaid Amount: ₹${total.toLocaleString()}</div>
        <div style="margin-top:1.7em;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Signature:</span>
            <span>Date: ${new Date().toLocaleDateString()}</span>
          </div>
          <div style="border-top:1px solid #888;width:60%;margin-top:2.2em;"></div>
        </div>
      </div>
    `;
    setSettlementPreview({ html, selected, total });
    // Also open print preview in new window
    const printable = `
      <html>
        <head>
          <title>Settlement Statement</title>
          <style>
            body { font-family: 'Segoe UI',sans-serif; margin:1cm; color:#000; }
            h1 { text-align:center; }
            table { width:100%; border-collapse:collapse; margin-bottom:1cm; }
            th, td { border:1px solid #222; padding:8px; text-align:center; }
            th { background:#f2f2f2; }
            .total { font-weight:bold; text-align:right; }
          </style>
        </head>
        <body>
          <h1>Settlement Statement</h1>
          <div style="text-align:center;margin-bottom:0.6em;">Voucher No ${from} to ${to}</div>
          <table>
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Date</th>
                <th>Vehicle No</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${selected.map(v => `
                <tr>
                  <td>${v.voucherNo}</td>
                  <td>${v.date?.toDate()?.toLocaleDateString()}</td>
                  <td>${v.vehicleNo}</td>
                  <td>${v.amount?.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Total Unpaid Amount: ₹${total.toLocaleString()}</div>
          <div style="margin-top:2cm;">
            <table style="width:100%;border:none;">
              <tr>
                <td style="border:none;text-align:left;">
                  <div>Authorized Signature:</div>
                  <div style="margin-top:40px;border-top:1px solid #000;width:60%;"></div>
                </td>
                <td style="border:none;text-align:right;">
                  <div>Date: ${new Date().toLocaleDateString()}</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;
    // Open print preview
    const win = window.open("", "_blank");
    win.document.write(printable);
    win.document.close();
    win.print();
  };

  const handleSettlementSubmit = async () => {
    // Only admins can perform bulk settlement
    if (!isAdmin) {
      toast.error("Only admins can perform bulk settlement");
      return;
    }
    
    // Use writeBatch to mark all as paid (no expense recording)
    if (!settlementPreview || !settlementPreview.selected || !paymentMode) return;
    const { selected, total } = settlementPreview;
    if (!selected.length) return;
    const batch = writeBatch(db);
    const now = Timestamp.now();
    for (const v of selected) {
      batch.update(doc(db, "VEHICLE_VOUCHERS", v.id), {
        paid: true,
        paidAt: now,
        chequeNo: paymentMode
      });
    }
    await batch.commit();
    // Update local state
    const updated = vouchers.map(v => {
      if (selected.some(sel => sel.id === v.id)) {
        return { ...v, paid: true, paidAt: new Date(), chequeNo: paymentMode };
      }
      return v;
    });
    setVouchers(updated);
    setFilteredVouchers(updated);
    setTotalUnpaidAmount(updated.reduce((acc, v) => v.paid ? acc : acc + (v.amount || 0), 0));
    setShowSettleModal(false);
    setFromVoucher("");
    setToVoucher("");
    setSettlementPreview(null);
    setPaymentMode("");
    // Show success toast
    toast.success("Vouchers settled successfully");
  };

return (
  <DieselPage>
    <PageHeader
      onBack={onBack || (() => window.history.back())}
      role={isAdmin ? "admin" : "manager"}
      roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
    />
    {/* Filter Bar */}
    <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
      <FilterBar.Actions>
          <Button
            variant="primary"
            onClick={() => setShowEntryForm(true)}
          size="md"
          >
          ➕ Add New Entry
          </Button>
          {isAdmin && (
            <Button
              variant="success"
              onClick={() => setShowSettleModal(true)}
              size="md"
            >
            💸 Settle Vouchers
            </Button>
          )}
      </FilterBar.Actions>
      
      <FilterBar.Search
          placeholder="Search Voucher No."
          value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{ width: "200px" }}
        />
    </FilterBar>
    
    {/* Main Content Container */}
    <div style={{ marginTop: "1.5rem", padding: "0 2rem", width: "100%", boxSizing: "border-box" }}>
      {loading ? (
        <LoadingState variant="inline" message="Loading vouchers..." icon="⏳" />
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" style={{ margin: "1.5rem 0" }}>
            {/* Total Unpaid Amount Card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,68,68,0.1) 0%, rgba(255,68,68,0.05) 100%)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: "16px",
              padding: "1.5rem",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(255,68,68,0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,68,68,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,68,68,0.1)";
            }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{
                  fontSize: "2rem",
                  marginRight: "0.75rem",
                  background: "rgba(255,68,68,0.1)",
                  padding: "0.5rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,68,68,0.2)"
                }}>
                  💰
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#9ba3ae",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Total Unpaid Amount
                  </h3>
                </div>
              </div>
              <div style={{
                fontSize: "2rem",
                fontWeight: "700",
                color: "#ff4444",
                textShadow: "0 2px 4px rgba(255,68,68,0.3)"
              }}>
                ₹{totalUnpaidAmount.toLocaleString()}
              </div>
            </div>
            
            {/* Verification Status Card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(50,215,75,0.1) 0%, rgba(50,215,75,0.05) 100%)",
              border: "1px solid rgba(50,215,75,0.2)",
              borderRadius: "16px",
              padding: "1.5rem",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(50,215,75,0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(50,215,75,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(50,215,75,0.1)";
            }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{
                  fontSize: "2rem",
                  marginRight: "0.75rem",
                  background: "rgba(50,215,75,0.1)",
                  padding: "0.5rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(50,215,75,0.2)"
                }}>
                  ✅
                </div>
              <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#9ba3ae",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Verification Status
                  </h3>
                </div>
              </div>
              
              <div style={{ marginBottom: "1rem" }}>
                <div style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#32D74B",
                  marginBottom: "0.5rem"
                }}>
                  {vouchers.filter(v => !v.paid && v.verified).length} Verified
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{
                  background: "rgba(255,69,58,0.1)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,69,58,0.2)",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "0.8rem",
                    color: "#9ba3ae",
                    marginBottom: "0.25rem"
                  }}>
                    Unverified
                  </div>
                  <div style={{
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    color: "#FF453A"
                  }}>
                  {vouchers.filter(v => !v.paid && !v.verified).length}
            </div>
                </div>
                
                <div style={{
                  background: "rgba(0,195,255,0.1)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(0,195,255,0.2)",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "0.8rem",
                    color: "#9ba3ae",
                    marginBottom: "0.25rem"
                  }}>
                    Total Unpaid
                  </div>
                  <div style={{
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    color: "#00c3ff"
                  }}>
                {vouchers.filter(v => !v.paid).length}
            </div>
              </div>
              </div>
            </div>
          </div>
          {/* Table container with improved styling */}
          <Card style={{ marginTop: "1rem" }}>
            {/* Date Range Filter Section */}
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              startLabel="Start Date"
              endLabel="End Date"
            />
            
            <div style={{ gap: "1rem", marginBottom: "1.1rem" }}>
              <Button
                variant="primary"
                onClick={() => setIsDateRangeActive(true)}
                size="sm"
              >
                Filter
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDateRangeActive(false)}
                size="sm"
              >
                Clear
              </Button>
            </div>
            {/* Data Table */}
            <DataTable
              columns={[
                { key: 'voucherNo', header: 'Voucher No' },
                { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
                { key: 'vehicleNo', header: 'Vehicle No', render: (row) => row.vehicleNo || "-" },
                { key: 'amount', header: 'Amount', render: (row) => `₹${row.amount?.toLocaleString()}` },
                { 
                  key: 'status', 
                  header: 'Status', 
                  render: (row) => (
                    <span style={{
                      backgroundColor: row.paid ? "rgba(50,215,75,0.14)" : "rgba(255,214,10,0.18)",
                      color: row.paid ? "#32D74B" : "#8a6f00",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: row.paid ? "1px solid rgba(50,215,75,0.35)" : "1px solid rgba(255,214,10,0.45)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.02em",
                      userSelect: "none"
                    }}>
                      {row.paid ? "PAID" : "UNPAID"}
                    </span>
                  )
                },
                { 
                  key: 'verification', 
                  header: 'Verification', 
                  render: (row) => (
                    <span style={{
                      backgroundColor: row.verified ? "rgba(50,215,75,0.14)" : "rgba(255,69,58,0.18)",
                      color: row.verified ? "#32D74B" : "#FF453A",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: row.verified ? "1px solid rgba(50,215,75,0.35)" : "1px solid rgba(255,69,58,0.45)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.02em",
                      userSelect: "none"
                    }}>
                      {row.verified ? "VERIFIED" : "UNVERIFIED"}
                    </span>
                  )
                },
                { key: 'chequeNo', header: 'Cheque No', render: (row) => row.chequeNo || "-" },
                { 
                  key: 'actions', 
                  header: 'Actions', 
                  render: (row) => (
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                      {/* Admin Actions */}
                      {isAdmin && (
                        <>
                          {/* Verify/Unverify buttons */}
                          {!row.verified ? (
                            <Button
                              variant="settle"
                              onClick={() => handleVerify(row.id)}
                              size="sm"
                            >
                              ✅ Verify
                            </Button>
                          ) : (
                            <Button
                              variant="unsettle"
                              onClick={() => handleUnverify(row.id)}
                              size="sm"
                            >
                              ❌ Unverify
                            </Button>
                          )}
                          
                          {/* Settle/Unsettle buttons - Admin only */}
                          {!row.paid ? (
                            <Button
                              variant="settle"
                              onClick={() => {
                                const chequeNo = prompt("Enter Cheque Number:");
                                if (chequeNo) handleMarkPaid(row.id, chequeNo);
                              }}
                              size="sm"
                            >
                              💸 Settle
                            </Button>
                          ) : (
                            <Button
                              variant="unsettle"
                              onClick={async () => {
                                if (!window.confirm("Unsettle this voucher?")) return;
                                try {
                                  await updateDoc(doc(db, "VEHICLE_VOUCHERS", row.id), {
                                    paid: false,
                                    paidAt: null,
                                    chequeNo: ""
                                  });
                                  toast.success("Voucher unsettled successfully");
                                } catch (error) {
                                  toast.error("Failed to unset voucher");
                                }
                              }}
                              size="sm"
                            >
                              🔄 Unsettle
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Edit and Delete buttons - Admin always, Manager only for unverified and unpaid */}
                      {(isAdmin || (isManager && !row.verified && !row.paid)) && (
                        <>
                          <Button
                            variant="edit"
                            onClick={() => {
                              setVoucherNo(row.voucherNo);
                              setDate(row.date?.toDate?.() || new Date());
                              setAmount(row.amount);
                              setVehicleNo(row.vehicleNo);
                              setEditingVoucher(row);
                              setShowEntryForm(true);
                            }}
                            size="sm"
                          >
                            ✏️ Edit
                          </Button>
                          
                          <Button
                            variant="delete"
                            onClick={() => handleDelete(row.id)}
                            size="sm"
                          >
                            🗑️ Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )
                }
              ]}
              data={tableData}
              showSummary={true}
              summaryData={summaryData}
              emptyMessage="No vouchers found for the selected date range"
            />
            
                  {/* Pagination Controls */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    gap: "1rem", 
                    marginTop: "1.5rem",
                    padding: "1rem",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <Button
                      variant="outline"
                      onClick={loadPreviousPage}
                      disabled={currentPage === 1 || loading}
                      size="sm"
                    >
                      ← Previous
                    </Button>
                    
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem",
                      color: "#f5f5f7",
                      fontSize: "0.9rem"
                    }}>
                      <span>Page</span>
                      <input
                        type="number"
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1) {
                            goToPage(page);
                          }
                        }}
                        min="1"
                        style={{
                          width: "60px",
                          padding: "0.25rem 0.5rem",
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          color: "#f5f5f7",
                          textAlign: "center"
                        }}
                        disabled={loading}
                      />
                      <span>page</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={loadNextPage}
                      disabled={!hasMore || loading}
                      size="sm"
                    >
                      Next →
                    </Button>
                    
                <Button
                  variant="primary"
                      onClick={refreshPage}
                      disabled={loading}
                      size="sm"
                      >
                      🔄 Refresh
                </Button>
                  </div>
                  
                  {/* Pagination Info */}
                  <div style={{ 
                    textAlign: "center", 
                    marginTop: "0.5rem",
                    color: "#9ba3ae",
                    fontSize: "0.85rem"
                  }}>
                    Showing {vouchers.length} vouchers on page {currentPage}
                  </div>
                  
          </Card>
          </div>
      )}
    </div>
      {/* End table container */}

      {/* Modals */}
      <EntryFormModal
        show={showEntryForm}
        onClose={() => {
          setShowEntryForm(false);
          setEditingVoucher(null);
          setValidation({});
        }}
        onSubmit={handleSubmit}
        voucherNo={voucherNo}
        setVoucherNo={setVoucherNo}
        date={date}
        setDate={setDate}
        amount={amount}
        setAmount={setAmount}
        vehicleNo={vehicleNo}
        setVehicleNo={setVehicleNo}
        vehicleOptions={vehicleOptions}
        editingVoucher={editingVoucher}
        validation={validation}
        setValidation={setValidation}
      />
      
      {showSettleModal && (
        <div style={{
          position: "fixed",
          top: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 1000,
          padding: "1rem",
          width: "100%",
          height: "100vh",
          overflow: "auto"
        }}>
          <div style={{
            background: "#1f1f1f",
            padding: "2rem",
            borderRadius: "14px",
            boxShadow: "0 6px 32px rgba(0,0,0,0.45)",
            maxWidth: "600px",
            width: "100%",
            color: "#f3f3f3",
            margin: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ color: "#00c3ff", fontWeight: "bold", marginTop: 0 }}>Settle Unpaid Vouchers</h3>
              <button
                onClick={() => setShowSettleModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "26px",
                  color: "#ff4444",
                  cursor: "pointer"
                }}
                title="Close"
                aria-label="Close settle modal"
              >
                ×
              </button>
            </div> 
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: "#ccc" }}>Filter By:</label>
              <select
                value={settleFilterType}
                onChange={e => setSettleFilterType(e.target.value)}
                style={inputStyle}
              >
                <option value="date">Date</option>
                <option value="voucher">Voucher No</option>
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              {settleFilterType === "date" ? (
                <>
                  <label style={{ color: "#ccc" }}>Start Date:</label>
                  <input
                    type="date"
                    value={settleFilterValue.start || ""}
                    onChange={e =>
                      setSettleFilterValue({ ...settleFilterValue, start: e.target.value })
                    }
                    style={inputStyle}
                  />
                  <label style={{ marginTop: "0.5rem", display: "block", color: "#ccc" }}>End Date:</label>
                  <input
                    type="date"
                    value={settleFilterValue.end || ""}
                    onChange={e =>
                      setSettleFilterValue({ ...settleFilterValue, end: e.target.value })
                    }
                    style={inputStyle}
                  />
                </>
              ) : (
                <>
                  <label style={{ color: "#ccc" }}>Voucher No. Range:</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="number"
                      placeholder="From"
                      value={settleFilterValue.start || ""}
                      onChange={e =>
                        setSettleFilterValue({ ...settleFilterValue, start: e.target.value })
                      }
                      style={inputStyle}
                    />
                    <span style={{ color: "#ccc" }}>to</span>
                    <input
                      type="number"
                      placeholder="To"
                      value={settleFilterValue.end || ""}
                      onChange={e =>
                        setSettleFilterValue({ ...settleFilterValue, end: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Cumulative amount for filtered vouchers */}
            {(settleFilterValue.start && settleFilterValue.end) && (
              <div style={{ 
                color: "#00ffcc", 
                marginBottom: "1rem",
                padding: "0.5rem",
                background: "rgba(0,255,204,0.1)",
                borderRadius: "6px",
                border: "1px solid rgba(0,255,204,0.3)"
              }}>
                Total Amount: ₹{vouchers
                  .filter(v => {
                    if (v.paid) return false;
                    if (settleFilterType === "date") {
                      const d = v.date?.toDate?.();
                      const start = new Date(settleFilterValue.start);
                      const end = new Date(settleFilterValue.end);
                      end.setHours(23, 59, 59, 999);
                      return d && d >= start && d <= end;
                    } else if (settleFilterType === "voucher") {
                      return (
                        v.voucherNo >= parseInt(settleFilterValue.start) &&
                        v.voucherNo <= parseInt(settleFilterValue.end)
                      );
                    }
                    return false;
                  })
                  .reduce((acc, v) => acc + (v.amount || 0), 0)
                  .toLocaleString()}
              </div>
            )}

            {/* Generate PDF Ledger Button */}
            {(settleFilterType === "date" && settleFilterValue.start && settleFilterValue.end) ||
              (settleFilterType === "voucher" && settleFilterValue.start && settleFilterValue.end) ? (
              <button
                style={{
                  background: "#007bff",
                  color: "white",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  marginBottom: "1rem"
                }}
                onClick={() => {
                  let filtered = [];
                  let subtitle = "";
                  if (settleFilterType === "date") {
                    filtered = vouchers.filter(v => {
                      if (v.paid) return false;
                      const d = v.date?.toDate?.();
                      const start = new Date(settleFilterValue.start);
                      const end = new Date(settleFilterValue.end);
                      end.setHours(23, 59, 59, 999);
                      return d && d >= start && d <= end;
                    });
                    subtitle = `Period: ${settleFilterValue.start} to ${settleFilterValue.end}`;
                  } else if (settleFilterType === "voucher") {
                    filtered = vouchers.filter(v => {
                      if (v.paid) return false;
                      return (
                        v.voucherNo >= parseInt(settleFilterValue.start) &&
                        v.voucherNo <= parseInt(settleFilterValue.end)
                      );
                    });
                    subtitle = `Voucher No. Range: ${settleFilterValue.start} to ${settleFilterValue.end}`;
                  }

                  const totalAmount = filtered.reduce((acc, v) => acc + (v.amount || 0), 0);
                  const ledgerHTML = `
                    <html>
                      <head>
                        <style>
                          body {
                            font-family: 'Segoe UI', sans-serif;
                            margin: 1cm;
                            padding: 0;
                            background: #fff;
                            color: #000;
                          }
                          h1 {
                            text-align: center;
                            margin-bottom: 0.5cm;
                            font-size: 24px;
                          }
                          .subtitle {
                            text-align: center;
                            margin-bottom: 1cm;
                            font-size: 16px;
                          }
                          table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 1cm;
                          }
                          th, td {
                            border: 1px solid #000;
                            padding: 8px;
                            text-align: center;
                          }
                          th {
                            background-color: #f2f2f2;
                          }
                          .total {
                            font-weight: bold;
                            text-align: right;
                            padding-top: 10px;
                          }
                          footer {
                            text-align: center;
                            font-size: 12px;
                            margin-top: 2cm;
                            color: #777;
                          }
                        </style>
                      </head>
                      <body>
                        <h1>Vehicle Diesel Ledger</h1>
                        <div class="subtitle">${subtitle}</div>
                        <table>
                          <thead>
                            <tr>
                              <th>Voucher No</th>
                              <th>Date</th>
                              <th>Vehicle No</th>
                              <th>Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filtered.map(v => `
                              <tr>
                                <td>${v.voucherNo}</td>
                                <td>${v.date?.toDate()?.toLocaleDateString()}</td>
                                <td>${v.vehicleNo}</td>
                                <td>${v.amount?.toLocaleString()}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                        <div class="total">Total Amount: ₹${totalAmount.toLocaleString()}</div>
                        <div style="margin-top: 2cm;">
                          <table style="width: 100%; border: none;">
                            <tr>
                              <td style="border: none; text-align: left;">
                                <div>Authorized Signature:</div>
                                <div style="margin-top: 40px; border-top: 1px solid #000; width: 60%;"></div>
                              </td>
                              <td style="border: none; text-align: right;">
                                <div>Date: ${new Date().toLocaleDateString()}</div>
                              </td>
                            </tr>
                          </table>
                        </div>
                        <footer>Generated on ${new Date().toLocaleString()}</footer>
                      </body>
                    </html>
                  `;

                  const win = window.open("", "_blank");
                  win.document.write(ledgerHTML);
                  win.document.close();
                  win.print();
                }}
              >
                📄 Generate PDF Ledger
              </button>
            ) : null}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: "#ccc" }}>Payment Reference (Cheque No/UPI Ref/etc.):</label>
              <input
                type="text"
                value={settleChequeNo}
                onChange={e => setSettleChequeNo(e.target.value)}
                style={inputStyle}
                placeholder="Enter payment reference"
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                style={{
                  background: "#28a745",
                  color: "white",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  flex: 1
                }}
                onClick={async () => {
                  if (
                    !settleChequeNo ||
                    !settleFilterValue.start ||
                    !settleFilterValue.end
                  ) {
                    toast.error("Please fill all required fields");
                    return;
                  }
                  
                  const filtered = vouchers.filter(v => {
                    if (v.paid) return false;
                    if (settleFilterType === "date") {
                      const d = v.date?.toDate?.();
                      const start = new Date(settleFilterValue.start);
                      const end = new Date(settleFilterValue.end);
                      end.setHours(23, 59, 59, 999);
                      return d && d >= start && d <= end;
                    } else if (settleFilterType === "voucher") {
                      return (
                        v.voucherNo >= parseInt(settleFilterValue.start) &&
                        v.voucherNo <= parseInt(settleFilterValue.end)
                      );
                    }
                    return false;
                  });

                  if (filtered.length === 0) {
                    toast.error("No unpaid vouchers found in the selected range");
                    return;
                  }

                  // Only admins can perform bulk settlement
                  if (!isAdmin) {
                    toast.error("Only admins can perform bulk settlement");
                    return;
                  }

                  try {
                    for (const v of filtered) {
                      await updateDoc(doc(db, "VEHICLE_VOUCHERS", v.id), {
                        paid: true,
                        paidAt: Timestamp.now(),
                        chequeNo: settleChequeNo
                      });
                    }

                    // Real-time listener will automatically update the UI
                    toast.success(`${filtered.length} vouchers settled successfully`);
                    setShowSettleModal(false);
                    setSettleFilterValue({ start: "", end: "" });
                    setSettleChequeNo("");
                  } catch (error) {
                    toast.error("Failed to settle vouchers");
                  }
                }}
              >
                💸 Settle Selected
              </button>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid #ccc",
                  color: "#ccc",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  flex: 1
                }}
                onClick={() => {
                  setShowSettleModal(false);
                  setSettleFilterValue({ start: "", end: "" });
                  setSettleChequeNo("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
  </DieselPage>
);
}

export default DieselLedger;
