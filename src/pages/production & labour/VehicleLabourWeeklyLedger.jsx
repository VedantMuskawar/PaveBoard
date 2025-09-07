// Helper function to fetch cumulative wage for a driver-vehicle-date-org
async function fetchDriverVehicleWage(driverID, vehicleID, date, orgID) {
  console.log("[DEBUG] Running Firestore wage query for:", {
    driverID,
    vehicleID,
    date,
    orgID,
  });
  
  try {
    const wageQuery = query(
      collection(db, "WAGE_ENTRIES"),
      where("driverID", "==", driverID),
      where("vehicleID", "==", vehicleID),
      where("orgID", "==", orgID),
      where("date", "==", date)
    );
    const snapshot = await getDocs(wageQuery);
    console.log("[DEBUG] Fetched WAGE_ENTRIES docs:", snapshot.docs.map((doc) => doc.data()));
    let total = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      total += data.wageAmount || 0;
    });
    return total;
  } catch (err) {
    console.error("[DEBUG] Error fetching driver wage:", err);
    return 0;
  }
}

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore"; // For Firestore timestamp queries
import { db } from "../../config/firebase";
import html2pdf from 'html2pdf.js';
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../../contexts/OrganizationContext";
import { Button, Card, Input } from "../../components/ui";
import "./VehicleLabourWeeklyLedger.css";

const VLabourLedger = ({ onBack }) => {
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Get organization ID from context
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  
  const [labours, setLabours] = useState([]);
  const [visibleCount, setVisibleCount] = useState(() => {
    const count = labours.length;
    return count > 0 ? count : 7;
  });
  const visibleLabours = labours;
  const [wageEntries, setWageEntries] = useState([]);
  const [labourPayments, setLabourPayments] = useState([]);
  const [savedWageEntries, setSavedWageEntries] = useState([]); // For fetched WAGE_ENTRIES
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const handleRefreshBalances = async () => {
    try {
      setIsRefreshingBalances(true);
      const laboursSnapshot = await getDocs(collection(db, "LABOURS"));
      const allLabours = laboursSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(labour => Array.isArray(labour.tags) && (labour.tags.includes("Loader") || labour.tags.includes("Unloader")));

      const laboursWithBalance = allLabours.map(labour => ({
        ...labour,
        balance: typeof labour.currentBalance === 'number' ? labour.currentBalance : 0,
      }));

      setLabours(laboursWithBalance);
    } catch (err) {
      console.error("[RefreshBalances] Failed to refresh LABOURS:", err);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  useEffect(() => {
    const fetchLabours = async () => {
      const laboursSnapshot = await getDocs(collection(db, "LABOURS"));
      console.log("LABOURS read count:", laboursSnapshot.size);
      const allLabours = laboursSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(
          labour =>
            Array.isArray(labour.tags) &&
            (labour.tags.includes("Loader") || labour.tags.includes("Unloader"))
        );

      // Apply date filter to WAGE_ENTRIES
      const startTimestamp = Timestamp.fromDate(new Date(selectedDate));
      const endTimestamp = Timestamp.fromDate(new Date(endDate));
      const wageQuery = query(
        collection(db, "WAGE_ENTRIES"),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp)
      );
      const wageSnapshot = await getDocs(wageQuery);
      console.log("WAGE_ENTRIES read count (in fetchLabours):", wageSnapshot.size);
      const paymentSnapshot = await getDocs(collection(db, "LABOUR_PAYMENTS"));
      console.log("LABOUR_PAYMENTS read count (in fetchLabours):", paymentSnapshot.size);

      // Fetch all saved WAGE_ENTRIES for this period
      const savedEntriesSnapshot = await getDocs(wageQuery);
      const savedEntries = savedEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedWageEntries(savedEntries);

      // Use the stored currentBalance from LABOURS collection as the source of truth
      const laboursWithBalance = allLabours.map(labour => ({
        ...labour,
        // Use the stored currentBalance from LABOURS collection as the source of truth
        balance: typeof labour.currentBalance === 'number' ? labour.currentBalance : 0,
      }));

      setLabours(laboursWithBalance);
      setWageEntries(wageSnapshot.docs.map(doc => doc.data()));
      setLabourPayments(paymentSnapshot.docs.map(doc => doc.data()));
    };

    fetchLabours();
  }, []);

  // Removed useEffects for fetching WAGE_ENTRIES and LABOUR_PAYMENTS


  let lastRenderedDate = "";
  // Track running payment totals for each labourID
  let runningPayments = {};

  // Date formatting helper
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getFullYear()}`;
  };

  // Helper to format various date types (Firestore Timestamp, ISO string, Date)
  const getFormattedDate = (input) => {
    if (!input) return "";
    if (input.seconds) return new Date(input.seconds * 1000).toISOString().split("T")[0]; // Firestore Timestamp
    if (typeof input === "string") return input.split("T")[0]; // ISO string
    if (input instanceof Date) return input.toISOString().split("T")[0];
    return "";
  };

  // Fetch DELIVERY_MEMOS for trip count
  const [deliveryMemos, setDeliveryMemos] = useState([]);
  useEffect(() => {
    const fetchDMs = async () => {
      const startTimestamp = Timestamp.fromDate(new Date(selectedDate));
      const endTimestamp = Timestamp.fromDate(new Date(endDate));
      const dmQuery = query(
        collection(db, "DELIVERY_MEMOS"),
        where("deliveryDate", ">=", startTimestamp),
        where("deliveryDate", "<=", endTimestamp)
      );
      const dmSnapshot = await getDocs(dmQuery);
      console.log("DELIVERY_MEMOS read count:", dmSnapshot.size);
      const data = dmSnapshot.docs.map(doc => doc.data());
      setDeliveryMemos(data);
    };
    fetchDMs();
  }, [selectedDate, endDate]);

  // Print PDF handler using html2pdf.js
  const handlePrintPDF = () => {
    const element = document.getElementById('printable-ledger');
    const opt = {
      margin: 0.5,
      filename: `VehicleLabourLedger_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // Export Excel handler using xlsx
  const handleExportExcel = () => {
    const table = document.querySelector("#printable-ledger table");
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table, { sheet: "Vehicle Labour Ledger" });
    XLSX.writeFile(wb, `VehicleLabourLedger_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="apple-root">
      <header className="apple-header">
        <div className="back-button" onClick={onBack || (() => window.history.back())}>←</div>
        <div>Vehicle Labour Ledger</div>
        <div className={`role-badge ${isAdmin ? 'admin' : 'manager'}`}>
          {isAdmin ? "👑 Admin" : "👔 Manager"}
        </div>
      </header>
      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <Card className="filter-card">
          <div>
            <label style={{ color: "#fff", marginRight: "1rem" }}>From:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="apple-date"
            />
            <label style={{ color: "#fff", marginLeft: "2rem", marginRight: "1rem" }}>To:</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="apple-date"
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto", alignItems: "center" }}>
            <Button
              onClick={handleRefreshBalances}
              disabled={isRefreshingBalances}
              variant="primary"
              loading={isRefreshingBalances}
            >
              {isRefreshingBalances ? "Refreshing…" : "Refresh balances"}
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="primary"
            >
              Export Excel
            </Button>
          </div>
        </Card>
      </div>
      {/* Printable container starts here */}
      <div id="printable-ledger">
        <Card className="table-wrapper glass-panel">
          <div style={{
            display: "block",
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "nowrap",
            scrollbarColor: "#333 #1f1f1f",
            scrollbarWidth: "thin",
            position: "relative"
          }}>
            <table className="ledger-table">
              <thead>
                <tr style={{ position: "sticky", top: 0, zIndex: 5, background: "#232a2f", height: "38px" }}>
                  <th className="sticky-col">Date</th>
                  <th className="sticky-col">Vehicle No</th>
                  <th className="sticky-col">No. of Trips</th>
                  {visibleLabours.map((labour, index) => (
                    <th key={index} className="table-cell">
                      {labour.name}
                    </th>
                  ))}
                </tr>
                <tr style={{ position: "sticky", top: "38px", zIndex: 4, background: "#232a2f", height: "38px" }}>
                  <th className="sticky-col" colSpan={3}>Balance →</th>
                  {visibleLabours.map((labour, index) => (
                    <th key={index} className="table-cell balance">
                      ₹{(labour.currentBalance || 0).toLocaleString()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 1. Flatten wage entry groups
                  const wageRows = Object.entries(
                    wageEntries
                      .filter(entry => {
                        const entryDate = new Date(entry.date.seconds * 1000);
                        const formatted = entryDate.toISOString().split("T")[0];
                        return formatted >= selectedDate && formatted <= endDate;
                      })
                      .reduce((acc, entry) => {
                        const entryDate = new Date(entry.date.seconds * 1000).toISOString().split("T")[0];
                        const key = `${entry.vehicleID || entry.vehicleNo}_${entryDate}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(entry);
                        return acc;
                      }, {})
                  ).map(([key, entries]) => {
                    const [vehicleNumber, formattedDate] = key.split("_");
                    return {
                      type: "wage",
                      date: formattedDate,
                      vehicleNumber,
                      entries,
                    };
                  });
                  // 2. Flatten payment groups (group by date, but not by vehicle)
                  const paymentRows = Object.entries(
                    labourPayments
                      .filter(p => {
                        const ts = p.paymentDate || p.date;
                        if (!ts || !ts.seconds) return false;
                        const dateStr = new Date(ts.seconds * 1000).toISOString().split("T")[0];
                        return dateStr >= selectedDate && dateStr <= endDate;
                      })
                      .reduce((acc, p) => {
                        const ts = p.paymentDate || p.date;
                        const dateStr = new Date(ts.seconds * 1000).toISOString().split("T")[0];
                        const key = `${dateStr}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(p);
                        return acc;
                      }, {})
                  ).map(([date, payments]) => ({
                    type: "payment",
                    date,
                    payments,
                  }));
                  // 3. Combine and sort
                  const combinedRows = [...wageRows, ...paymentRows];
                  combinedRows.sort((a, b) => new Date(b.date) - new Date(a.date));
                  // 4. Track running payment totals for each labourID for "payment" rows
                  let lastRenderedDate = "";
                  let runningPayments = {};
                  return combinedRows.map((rowObj, idx) => {
                    const rowBg = idx % 2 === 0 ? "#1a1a1a" : "#202020";
                  if (rowObj.type === "wage") {
                    const { vehicleNumber, date: formattedDate, entries } = rowObj;
                    // Calculate number of trips: each unique orderID for that vehicle on that date counts as one trip
                    const uniqueOrderIDs = new Set(
                      entries
                        .filter(entry => entry.vehicleNo === vehicleNumber && getFormattedDate(entry.date) === formattedDate)
                        .map(entry => entry.orderID)
                    );
                    const trips = uniqueOrderIDs.size;
                      // For each labour, sum all wages for this vehicle and date (even if multiple orders)
                      const labourWages = visibleLabours.map(labour => {
                        // Find all wage entries matching vehicleNumber, formattedDate, and this labour
                        const matchingEntries = wageEntries.filter(
                          entry =>
                            (entry.vehicleID === vehicleNumber || entry.vehicleNo === vehicleNumber) &&
                            getFormattedDate(entry.date) === formattedDate &&
                            entry.labourID === labour.labourID
                        );
                        const totalWage = matchingEntries.reduce((sum, entry) => sum + (Number(entry.wageAmount) || 0), 0);
                        return (
                          <td key={labour.labourID}>
                            {totalWage > 0 ? totalWage.toFixed(0) : 0}
                          </td>
                        );
                      });
                      const paymentTotals = visibleLabours.map(labour => {
                        const total = labourPayments
                          .filter(p =>
                            p.labourID === labour.labourID &&
                            p.vehicleNumber === vehicleNumber &&
                            (() => {
                              const ts = p.paymentDate || p.date;
                              if (!ts || !ts.seconds) return false;
                              return new Date(ts.seconds * 1000).toISOString().split("T")[0] === formattedDate;
                            })()
                          )
                          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
                        return total;
                      });
                      // Row hover effect
                      let trProps = {};
                      trProps.onMouseEnter = e => (e.currentTarget.style.backgroundColor = "#232a2f");
                      trProps.onMouseLeave = e => (e.currentTarget.style.backgroundColor = rowBg);
                      // Render date cell logic: show date only for first row of group
                      const dateCell = (
                        <td
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            color: "#eee",
                            background: rowBg,
                            borderBottom: "1px solid #232a2f",
                            borderLeft: "1px solid #333",
                            minWidth: "140px",
                            maxWidth: "140px",
                            position: "sticky",
                            left: "0px",
                            backgroundColor: rowBg,
                            zIndex: 2,
                            borderRight: "2px solid #444",
                            boxShadow: "2px 0 4px rgba(0,0,0,0.3)"
                          }}
                        >
                          {lastRenderedDate !== formattedDate ? formatDate(formattedDate) : ""}
                        </td>
                      );
                      lastRenderedDate = formattedDate;
                      return (
                        <React.Fragment key={`wage_${vehicleNumber}_${formattedDate}`}>
                          <tr {...trProps} style={{ backgroundColor: rowBg }}>
                            {React.cloneElement(dateCell, { className: "sticky-col", style: { ...dateCell.props.style, left: "0px" } })}
                            <td className="sticky-col" style={{ left: "120px", backgroundColor: rowBg }}>{vehicleNumber}</td>
                            <td className="sticky-col" style={{ left: "240px", backgroundColor: rowBg }}>{trips}</td>
                            {labourWages}
                          </tr>
                          {paymentTotals.some(amt => amt > 0) && (
                            <tr style={{ backgroundColor: rowBg }}>
                              <td className="sticky-col" style={{ left: "0px", backgroundColor: rowBg }}></td>
                              <td className="sticky-col" style={{ left: "120px", backgroundColor: rowBg }} colSpan={2}>Total Paid</td>
                              {paymentTotals.map((amt, i) => (
                                <td key={i} style={{
                                  color: "#66ff66",
                                  background: "#142d14",
                                  backgroundColor: "#142d14",
                                  fontStyle: "italic",
                                  borderTop: "1px solid #333",
                                  padding: "10px 8px",
                                  textAlign: "center",
                                  borderBottom: "1px solid #232a2f"
                                }}>{amt}</td>
                              ))}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    } else if (rowObj.type === "payment") {
                      const { date: formattedDate, payments } = rowObj;
                      const hasMatchingEntry = (labourID, wageAmount) =>
                        wageEntries.some(entry => {
                          const d = new Date(entry.date.seconds * 1000).toISOString().split("T")[0];
                          return d === formattedDate && entry.labourID === labourID && entry.wageAmount === wageAmount;
                        });
                      const allMatched = payments.every(p => hasMatchingEntry(p.labourID, p.wageAmount));
                      if (allMatched) return null;
                      const row = visibleLabours.map(labour => {
                        const total = payments
                          .filter(p => {
                            const ts = p.paymentDate || p.date;
                            const d = new Date(ts.seconds * 1000).toISOString().split("T")[0];
                            return p.labourID === labour.labourID && d === formattedDate;
                          })
                          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
                        return total;
                      });
                      const updatedBalances = visibleLabours.map(labour => {
                        const labourID = labour.labourID;
                        const previousPaid = runningPayments[labourID] || 0;
                        const justPaid = payments
                          .filter(p => p.labourID === labourID)
                          .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
                        const newBalance = labour.balance - previousPaid - justPaid;
                        runningPayments[labourID] = previousPaid + justPaid;
                        return newBalance;
                      });
                      let trProps = {};
                      trProps.onMouseEnter = e => (e.currentTarget.style.backgroundColor = "#232a2f");
                      trProps.onMouseLeave = e => (e.currentTarget.style.backgroundColor = rowBg);
                      const dateCell = (
                        <td
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            color: "#eee",
                            background: rowBg,
                            borderBottom: "1px solid #232a2f",
                            borderLeft: "1px solid #333",
                            minWidth: "140px",
                            maxWidth: "140px",
                            position: "sticky",
                            left: "0px",
                            backgroundColor: rowBg,
                            zIndex: 2,
                            borderRight: "2px solid #444",
                            boxShadow: "2px 0 4px rgba(0,0,0,0.3)"
                          }}
                        >
                          {lastRenderedDate !== formattedDate ? formatDate(formattedDate) : ""}
                        </td>
                      );
                      lastRenderedDate = formattedDate;
                      return (
                        <React.Fragment key={`paymentgroup_${formattedDate}`}>
                          <tr key={`balance_after_${formattedDate}`} className="balance-row" style={{ backgroundColor: rowBg }}>
                            <td className="sticky-col" style={{ left: "0px", backgroundColor: rowBg }}></td>
                            <td className="sticky-col" style={{ left: "120px", backgroundColor: rowBg }}>Balance After</td>
                            <td className="sticky-col" style={{ left: "240px", backgroundColor: rowBg }}>-</td>
                            {updatedBalances.map((bal, i) => (
                              <td
                                key={i}
                                style={{
                                  fontWeight: "bold",
                                  color: bal < 0 ? "#ff6b6b" : "#00c3ff",
                                  backgroundColor: bal < 0 ? "#402020" : "#1c2233",
                                  textTransform: "none",
                                  fontSize: "0.92rem",
                                  borderBottom: "none",
                                  borderTop: "1px solid #333",
                                  minWidth: "140px",
                                  maxWidth: "140px",
                                  padding: "10px 8px",
                                  textAlign: "center"
                                }}
                              >
                                {bal}
                              </td>
                            ))}
                          </tr>
                          <tr key={`payment_${formattedDate}`} {...trProps} style={{ backgroundColor: rowBg }}>
                            {React.cloneElement(dateCell, { className: "sticky-col", style: { ...dateCell.props.style, left: "0px" } })}
                            <td className="sticky-col" style={{ left: "120px", backgroundColor: rowBg }}>Payment</td>
                            <td className="sticky-col" style={{ left: "240px", backgroundColor: rowBg }}>-</td>
                            {row.map((amt, i) => (
                              <td
                                key={i}
                                style={{
                                  color: "#66ff66",
                                  background: "#142d14",
                                  backgroundColor: "#142d14",
                                  fontStyle: "italic",
                                  borderTop: "1px solid #333",
                                  padding: "10px 8px",
                                  textAlign: "center",
                                  borderBottom: "1px solid #232a2f"
                                }}
                              >
                                {amt}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      );
                    }
                    return null;
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="balance-row">
                  <td className="sticky-col" style={{ left: "0px" }}>Opening Balance</td>
                  <td className="sticky-col" style={{ left: "120px" }}></td>
                  <td className="sticky-col" style={{ left: "240px" }}></td>
                  {visibleLabours.map((labour, index) => (
                    <td key={index}>{labour.openingBalance || 0}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
            {/* Fade effect on right edge */}
            <div className="fade-edge" />
          </div>
        </Card>
      </div>
      {/* Other UI components or content go here */}
    </div>
  );
};

export default VLabourLedger;