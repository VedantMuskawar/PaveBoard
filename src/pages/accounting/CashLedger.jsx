import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../config/firebase";

// Import reusable UI components
import { 
  Button,
  Card,
  PageHeader,
  DatePicker,
  DataTable,
  LoadingState,
  EmptyState,
  SectionCard,
  StatsCard,
  Badge,
  Divider
} from "../../components/ui";

// Import CSS
import "./CashLedger.css";

const SCH_ORDERS = "SCH_ORDERS";
const TRANSACTIONS = "TRANSACTIONS";
const EXPENSES = "EXPENSES";

const formatINR = (x) => {
  if (x == null) return "-";
  return "₹" + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const CashLedger = ({ onBack }) => {
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  
  const handlePrint = () => window.print();
  
  // Approval system functions
  const saveApprovalToFirestore = async (newApprovedRows) => {
    if (!selectedOrg?.orgID) return;
    
    setIsApprovalLoading(true);
    
    const approvalData = {
      orgID: selectedOrg.orgID,
      date: selectedDate,
      approvedIndices: Array.from(newApprovedRows),
      totalRows: ledgerRows.length,
      approvedBy: user?.uid || 'unknown',
      approvedAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };
    
    try {
      if (approvalDocId) {
        // Update existing approval document
        await setDoc(doc(db, 'CASH_LEDGER_APPROVALS', approvalDocId), approvalData);
      } else {
        // Create new approval document
        const newDocId = `approval_${selectedOrg.orgID}_${selectedDate.replace(/-/g, '')}`;
        await setDoc(doc(db, 'CASH_LEDGER_APPROVALS', newDocId), approvalData);
        setApprovalDocId(newDocId);
      }
      
      setLastApprovalUpdate(new Date());
    } catch (error) {
      console.error('Error saving approval to Firestore:', error);
    } finally {
      setIsApprovalLoading(false);
    }
  };
  
  const handleRowApproval = async (index) => {
    const newApprovedRows = new Set(approvedRows);
    if (newApprovedRows.has(index)) {
      newApprovedRows.delete(index);
    } else {
      newApprovedRows.add(index);
    }
    setApprovedRows(newApprovedRows);
    
    // Update select all state
    if (newApprovedRows.size === ledgerRows.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
    
    // Save to Firestore for real-time updates
    await saveApprovalToFirestore(newApprovedRows);
  };
  
  const handleSelectAll = async () => {
    let newApprovedRows;
    if (selectAll) {
      newApprovedRows = new Set();
      setSelectAll(false);
    } else {
      newApprovedRows = new Set(ledgerRows.map((_, index) => index));
      setSelectAll(true);
    }
    setApprovedRows(newApprovedRows);
    
    // Save to Firestore for real-time updates
    await saveApprovalToFirestore(newApprovedRows);
  };
  
  const getApprovalStatus = () => {
    if (ledgerRows.length === 0) return "No entries to approve";
    if (approvedRows.size === ledgerRows.length) return "✅ All entries approved";
    if (approvedRows.size === 0) return "❌ No entries approved";
    return `⚠️ ${approvedRows.size} of ${ledgerRows.length} entries approved`;
  };
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [ledgerRows, setLedgerRows] = useState([]);
  const [approvedRows, setApprovedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [approvalDocId, setApprovalDocId] = useState(null);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [lastApprovalUpdate, setLastApprovalUpdate] = useState(null);

  // Load existing approvals and set up real-time listener
  useEffect(() => {
    if (!selectedOrg?.orgID || !selectedDate) return;
    
    const approvalDocId = `approval_${selectedOrg.orgID}_${selectedDate.replace(/-/g, '')}`;
    setApprovalDocId(approvalDocId);
    
    // Set up real-time listener for approval changes
    const unsubscribe = onSnapshot(
      doc(db, 'CASH_LEDGER_APPROVALS', approvalDocId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const approvedIndices = new Set(data.approvedIndices || []);
          setApprovedRows(approvedIndices);
          setSelectAll(approvedIndices.size === ledgerRows.length && ledgerRows.length > 0);
          
          // Update the last approval timestamp
          if (data.lastUpdated) {
            setLastApprovalUpdate(data.lastUpdated.toDate());
          }
        } else {
          // No approval document exists yet
          setApprovedRows(new Set());
          setSelectAll(false);
        }
      },
      (error) => {
        console.error('Error listening to approval changes:', error);
        // Fallback: reset approval state
        setApprovedRows(new Set());
        setSelectAll(false);
      }
    );
    
    return () => unsubscribe();
  }, [selectedOrg?.orgID, selectedDate, ledgerRows.length]);
  
  useEffect(() => {
    // Reset approval state when date changes
    setApprovedRows(new Set());
    setSelectAll(false);
    
    const fetchData = async () => {
      const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
      const startDate = new Date(selectedDate + "T00:00:00");
      const endDate = new Date(selectedDate + "T23:59:59");

      const ordersQuery = query(
        collection(db, SCH_ORDERS),
        where("orgID", "==", orgID),
        where("deliveryDate", ">=", startDate),
        where("deliveryDate", "<=", endDate)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        const mode = data.toAccount || "-";
        const amount = Math.round(data.paidAmount || (data.productQuant * data.productUnitPrice));
        return {
          type: "Order",
          date: data.deliveryDate?.toDate?.() || new Date(),
          particulars: `${data.clientName || "-"}`,
          expense: 0,
          income: mode === "CREDIT" ? 0 : amount,
          credit: mode === "CREDIT" ? amount : 0,
          mode,
        };
      });

      const transactionsQuery = query(
        collection(db, TRANSACTIONS),
        where("orgID", "==", orgID),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const mode = data.toAccount || "-";
        const amount = data.amount || 0;
        return {
          type: "Client Payment",
          date: data.date?.toDate?.() || new Date(),
          particulars: `${data.clientName || "-"}`,
          expense: 0,
          income: mode === "CREDIT" ? 0 : amount,
          credit: mode === "CREDIT" ? amount : 0,
          mode,
        };
      });

      const expensesQuery = query(
        collection(db, EXPENSES),
        where("orgID", "==", orgID),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          type: "Expense",
          date: data.date?.toDate?.() || new Date(),
          particulars: `${data.description || "-"}`,
          expense: data.amount || 0,
          income: 0,
          credit: 0,
          mode: data.toAccount || "-",
        };
      });

      const allRows = [...orders, ...transactions, ...expenses];
      allRows.sort((a, b) => a.date - b.date); // sort by date
      setLedgerRows(allRows);
    };

    fetchData();
  }, [selectedDate, selectedOrg]);

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  const totalExpense = ledgerRows.reduce((sum, r) => sum + (r.expense || 0), 0);
  const totalIncome = ledgerRows.reduce((sum, r) => sum + (r.income || 0), 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);
  const netCash = totalIncome - totalExpense;

  // Compute mode summary for Mode of Payment Distribution table
  const modeSummary = {};
  ledgerRows.forEach(row => {
    if (!modeSummary[row.mode]) {
      modeSummary[row.mode] = { order: 0, payment: 0, expense: 0 };
    }
    if (row.type === "Order") {
      modeSummary[row.mode].order += row.income || 0;
    } else if (row.type === "Client Payment") {
      modeSummary[row.mode].payment += row.income || 0;
    } else if (row.type === "Expense") {
      modeSummary[row.mode].expense += row.expense || 0;
    }
  });

  return (
    <div className="cash-ledger-container">
      <header className="cash-ledger-header">
        <div className="cash-ledger-back-button" onClick={handleBack}>←</div>
        <div>Cash Ledger</div>
        <div className={`cash-ledger-role-badge ${isAdmin ? 'admin' : 'manager'}`}>
          {isAdmin ? "👑 Admin" : "👔 Manager"}
        </div>
      </header>

      {/* Main content container with consistent spacing */}
      <div className="cash-ledger-main-content">
        <main className="cash-ledger-main-card">
        <div className="cash-ledger-date-picker-container">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="cash-ledger-date-picker"
          />
        </div>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={handlePrint}
            className="cash-ledger-print-button"
          >
            🖨️ Print Ledger
          </button>
        </div>
        <div className="cash-ledger-net-cash">
          🧾 Net Cash for the Day (CASH): {formatINR((modeSummary["CASH"]?.order || 0) + (modeSummary["CASH"]?.payment || 0) - (modeSummary["CASH"]?.expense || 0))}
        </div>
        
        {/* Approval Status Display */}
        <div className={`cash-ledger-approval-status ${approvedRows.size === ledgerRows.length && ledgerRows.length > 0 ? 'approved' : 'pending'}`}>
          <div>{getApprovalStatus()}</div>
          {isManager && (
            <div className="cash-ledger-approval-details">
              {approvedRows.size > 0 ? (
                <>
                  🔄 Real-time updates enabled • Last updated: {lastApprovalUpdate ? lastApprovalUpdate.toLocaleTimeString() : 'Just now'}
                </>
              ) : (
                <>
                  🔄 Waiting for admin approval • Real-time updates will show here
                </>
              )}
            </div>
          )}
        </div>

        <div className="cash-ledger-table-wrapper">
          <table className="cash-ledger-table">
            <thead>
              <tr>
                {isAdmin && (
                  <th>
                    <label className="cash-ledger-checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="cash-ledger-checkbox"
                      />
                      <span style={{ fontSize: "0.9rem" }}>All</span>
                    </label>
                  </th>
                )}
                <th>DATE</th>
                <th>PARTICULARS</th>
                <th>EXPENSE</th>
                <th>INCOME</th>
                <th>CREDIT</th>
                <th>MODE</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="empty-row">No entries found</td>
                </tr>
              )}
              {ledgerRows.map((row, index) => (
                <tr
                  key={index}
                  className={`${approvedRows.has(index) ? 'approved' : ''} ${
                    row.type === "Order" ? 'order-row' :
                    row.type === "Client Payment" ? 'payment-row' :
                    row.type === "Expense" ? 'expense-row' : ''
                  }`}
                >
                  {isAdmin && (
                    <td>
                      <div style={{ position: "relative" }}>
                        <input
                          type="checkbox"
                          checked={approvedRows.has(index)}
                          onChange={() => handleRowApproval(index)}
                          disabled={isApprovalLoading}
                          className="cash-ledger-checkbox"
                        />
                        {isApprovalLoading && (
                          <div className="cash-ledger-loading-indicator" />
                        )}
                      </div>
                    </td>
                  )}
                  <td>{row.date.toLocaleDateString()}</td>
                  <td>{row.particulars}</td>
                  <td>{row.expense ? formatINR(row.expense) : "-"}</td>
                  <td>{row.income ? formatINR(row.income) : "-"}</td>
                  <td>{row.credit ? formatINR(row.credit) : "-"}</td>
                  <td>{row.mode}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="footer-row">
                {isAdmin && <td></td>}
                <td><b>Total</b></td>
                <td><b>{formatINR(totalExpense)}</b></td>
                <td><b>{formatINR(totalIncome)}</b></td>
                <td><b>{formatINR(totalCredit)}</b></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mode of Payment Distribution Table */}
        <div className="cash-ledger-mode-distribution">
          <h3>Mode of Payment Distribution</h3>
          <div className="cash-ledger-table-wrapper">
            <table className="cash-ledger-table">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Order</th>
                  <th>Payment</th>
                  <th>Income</th>
                  <th>Expense</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(modeSummary).length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">No data available</td>
                  </tr>
                )}
                {Object.keys(modeSummary).map((mode, idx) => {
                  if (mode === "CREDIT") return null;
                  const order = modeSummary[mode].order;
                  const payment = modeSummary[mode].payment;
                  const expense = modeSummary[mode].expense;
                  const income = order + payment; // Income = Orders + Payment
                  const net = income - expense;
                  return (
                    <tr key={idx}>
                      <td>{mode}</td>
                      <td>{formatINR(order)}</td>
                      <td>{formatINR(payment)}</td>
                      <td>{formatINR(income)}</td>
                      <td>{formatINR(expense)}</td>
                      <td>{formatINR(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </main>
        </div>
    </div>
  );
};

export default CashLedger;