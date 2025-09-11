import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp, deleteDoc, updateDoc, doc, writeBatch, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../../contexts/OrganizationContext";
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  Button,
  Card,
  Input,
  LoadingState,
  EmptyState
} from "../../components/ui";
import { toast } from "react-hot-toast";
import "./VehicleLabourEntry.css";

// ---- Apple-like shared styles (inspired by Orders.jsx) ----
const appleFontStack = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

const VLabourEntry = ({ onBack }) => {
  const navigate = useNavigate();
  const { selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Get organization ID from context
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  
  // Check if entry can be discarded based on role and date
  const canDiscardEntry = (memo) => {
    if (isAdmin) return true; // Admins can always discard
    
    if (isManager) {
      // Managers can only discard entries within 3 days from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const entryDate = new Date(selectedDate);
      entryDate.setHours(0, 0, 0, 0);
      
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      return entryDate >= threeDaysAgo;
    }
    
    return false; // Other roles cannot discard
  };
  
  // Get discard restriction message for managers
  const getDiscardRestrictionMessage = (memo) => {
    if (isAdmin) return null;
    
    if (isManager) {
      const today = new Date();
      const entryDate = new Date(selectedDate);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      if (entryDate < threeDaysAgo) {
        const daysUntilDiscard = Math.ceil((threeDaysAgo - entryDate) / (1000 * 60 * 60 * 24));
        return `Managers can only discard entries which are within 3 days from today. This entry can be discarded in ${daysUntilDiscard} day(s).`;
      }
    }
    
    return null;
  };
  

  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [memos, setMemos] = useState([]);
  const [vehicleWages, setVehicleWages] = useState([]);
  const [labourOptions, setLabourOptions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("All");
  const [sortBy, setSortBy] = useState("dmNumber");
  const [labourSelections, setLabourSelections] = useState({});
  const [confirmedLabours, setConfirmedLabours] = useState({});

  // Database read counter
  const [readCount, setReadCount] = useState(0);
  
  // Check if organization is selected
  useEffect(() => {
    if (!orgID) {
      return;
    }
  }, [orgID]);
  


  useEffect(() => {
    const fetchMemos = async () => {
      if (!orgID) {
        return;
      }
      
      let totalReads = 0;
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      try {
        // First, let's check if there are any delivery memos for this org at all
        const allMemosQuery = query(
          collection(db, "DELIVERY_MEMOS"),
          where("orgID", "==", orgID)
        );
        const allMemosSnap = await getDocs(allMemosQuery);
        
        // Use the already fetched memos and filter by date in JavaScript to avoid index issues
        const filteredMemos = allMemosSnap.docs.filter(doc => {
          const data = doc.data();
          const memoDate = data.deliveryDate || data.dispatchStart || data.createdAt;
          if (!memoDate) return false;
          
          const memoDateObj = memoDate.toDate ? memoDate.toDate() : new Date(memoDate);
          return memoDateObj >= dateStart && memoDateObj <= dateEnd;
        });
        
        
        // Fetch wage entries for org (avoiding composite index)
        const wageEntriesQuery = query(
          collection(db, "WAGES_ENTRIES"),
          where("orgID", "==", orgID)
        );
        const allWageEntriesSnap = await getDocs(wageEntriesQuery);
        
        // Filter wage entries by date in JavaScript
        const filteredWageEntries = allWageEntriesSnap.docs.filter(doc => {
          const data = doc.data();
          const entryDate = data.date;
          if (!entryDate) return false;
          
          const entryDateObj = entryDate.toDate ? entryDate.toDate() : new Date(entryDate);
          return entryDateObj >= dateStart && entryDateObj <= dateEnd;
        });
        
        
        // Parallel fetch for other collections
        const [vehicleWagesSnap, employeesSnap] = await Promise.all([
          getDocs(collection(db, "VEHICLE_WAGES")),
          getDocs(query(
            collection(db, "employees"),
            where("orgID", "==", orgID),
            where("employeeTags", "array-contains-any", ["loader", "unloader"]),
            where("isActive", "==", true)
          ))
        ]);
        
        totalReads = allMemosSnap.size + vehicleWagesSnap.size + employeesSnap.size + allWageEntriesSnap.size;
        
        // Process delivery memos (using filtered results)
        const memosData = filteredMemos.map(doc => ({ id: doc.id, ...doc.data() }));
        setMemos(memosData);

        // Process vehicle wages
        const wageData = vehicleWagesSnap.docs.map(doc => doc.data());
        setVehicleWages(wageData);

        // Process employees (migrated from LABOURS)
        const employeeOptions = employeesSnap.docs.map(doc => ({
          id: doc.id,
          labourID: doc.data().labourID,
          name: doc.data().name,
          ...doc.data()
        }));
        setLabourOptions(employeeOptions);

        // Process wage entries (using filtered results)
        const wageData2 = filteredWageEntries.map(doc => ({ id: doc.id, ...doc.data() }));
        const grouped = {};
        wageData2.forEach(entry => {
          const batchID = entry.assignedBatchID;
          if (!grouped[batchID]) grouped[batchID] = [];
          grouped[batchID].push({
            name: entry.labourName,
            id: entry.labourID,
            wage: entry.wageAmount,
            role: entry.labourType
          });
        });
        setConfirmedLabours(grouped);
        
        const savedMap = {};
        Object.keys(grouped).forEach(batchID => {
          savedMap[batchID] = { saved: true, confirmed: true };
        });
        setLabourSelections(savedMap);
        
        setReadCount(totalReads);
      } catch (error) {
        console.error("Error fetching labour data:", error);
      }
    };

    fetchMemos();
  }, [selectedDate, orgID]);

  return (
    <DieselPage>
      <PageHeader
        title="Vehicle Labour Entries"
        onBack={onBack || (() => window.history.back())}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      >
        <div style={{ 
          fontSize: "0.8rem", 
          color: "#9ba3ae",
          padding: "2px 6px",
          borderRadius: "4px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          📊 {readCount} reads
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <FilterBar.Actions>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "200px" }}
          />
        </FilterBar.Actions>
      </FilterBar>

      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <Card style={{
          padding: "1.25rem 1.25rem",
          margin: "1.5rem auto 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          borderRadius: "20px",
          maxWidth: "1100px"
        }}>
          
          {/* Role-based Access Info */}
          {!isAdmin && (
            <div style={{
              padding: "0.75rem",
              background: "rgba(10,132,255,0.1)",
              border: "1px solid rgba(10,132,255,0.3)",
              borderRadius: "8px",
              color: "#0A84FF",
              fontSize: "0.85rem",
              textAlign: "center",
              marginTop: "0.5rem"
            }}>
              <strong>Manager Access:</strong> You can only discard entries older than 3 days from today.
              {(() => {
                const today = new Date();
                const entryDate = new Date(selectedDate);
                const threeDaysAgo = new Date(today);
                threeDaysAgo.setDate(today.getDate() - 3);
                
                if (entryDate > threeDaysAgo) {
                  const daysUntilDiscard = Math.ceil((entryDate - threeDaysAgo) / (1000 * 60 * 60 * 24));
                  return ` Current entry can be discarded in ${daysUntilDiscard} day(s).`;
                } else {
                  return " Current entry can be discarded.";
                }
              })()}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem 1.25rem",
              alignItems: "end"
            }}
          >
            <div>
              <label className="label-field">Vehicle Filter</label>
              <select
                className="apple-select input-field"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <option value="All">All Vehicles</option>
                {[...new Set(memos.map(m => m.vehicleNumber))].map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Sort By</label>
              <select
                className="apple-select input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="dmNumber">Sort by DM Number</option>
                <option value="vehicleNumber">Sort by Vehicle Number</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Split Content Area */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "2rem",
          padding: "0 2rem",
          color: "white",
          flexWrap: "wrap"
        }}
      >
        {/* Left Placeholder Section (1 part) */}
        <Card 
          className="glass-panel" 
          style={{
            flex: 1,
            minWidth: "300px",
            maxWidth: "calc(33% - 1rem)",
            flexGrow: 1,
            fontFamily: appleFontStack
          }}
        >
          <h3 style={{ marginBottom: "1rem", color: "#00c3ff" }}>Wage Summary</h3>
          <table className="apple-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #555", paddingBottom: "0.5rem" }}>Labour</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #555", paddingBottom: "0.5rem" }}>No. of Trips</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #555", paddingBottom: "0.5rem" }}>Cumulative Amount</th>
              </tr>
            </thead>
            <tbody>
              {
                Object.entries(
                  Object.values(confirmedLabours)
                    .flat()
                    .reduce((acc, curr) => {
                      const key = curr.id;
                      if (!acc[key]) {
                        acc[key] = { name: curr.name, count: 0, total: 0 };
                      }
                      acc[key].count += 1;
                      acc[key].total += curr.wage;
                      return acc;
                    }, {})
                ).map(([id, { name, count, total }]) => (
                  <tr key={id}>
                    <td>{name}</td>
                    <td style={{ textAlign: "center" }}>{count}</td>
                    <td style={{ textAlign: "right" }}>₹{(total / 100).toFixed(2)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Card>

        {/* Right Cards Section (2 parts) */}
        <Card 
          className="glass-panel" 
          style={{
            flex: 2,
            minWidth: "600px",
            maxWidth: "calc(67% - 1rem)",
            flexGrow: 2,
            fontFamily: appleFontStack
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", justifyContent: "flex-start" }}>
            {memos
              .filter(m =>
                (selectedVehicle === "All" || m.vehicleNumber === selectedVehicle) &&
                (!m.status || m.status.toLowerCase() !== "cancelled")
              )
              .sort((a, b) => {
                if (sortBy === "dmNumber") {
                  return (a.dmNumber || 0) - (b.dmNumber || 0);
                } else {
                  return (a.vehicleNumber || "").localeCompare(b.vehicleNumber || "");
                }
              })
              .map((memo) => {
                const matchingWage = vehicleWages.find(
                  wage => wage.unitCount === memo.productQuant
                );
                // Add isConfirmed variable
                const isConfirmed = labourSelections[memo.id]?.confirmed;
                return (
                  <div
                    key={memo.id}
                    className={`apple-card${labourSelections[memo.id]?.saved ? " saved" : ""}${labourSelections[memo.id]?.confirmed ? " confirmed" : ""}`}
                    style={{
                      background: "#222",
                      padding: "1rem",
                      borderRadius: "10px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                      flex: "1 1 260px",
                      maxWidth: "320px",
                      minWidth: "250px",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s",
                      cursor: "default",
                      position: "relative",
                      border: labourSelections[memo.id]?.saved ? "2px solid #00ff99" : "1px solid #333",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <div style={{
                      background: "#1a1a1a",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      lineHeight: "1.5",
                      fontSize: "0.95rem"
                    }}>
                      <div style={{ fontWeight: "bold", color: "#00c3ff", marginBottom: "0.5rem" }}>
                        DM #{memo.dmNumber}
                      </div>
                      <div><strong>Client:</strong> {memo.clientName}</div>
                      <div><strong>Qty:</strong> {memo.productQuant.toLocaleString()} bricks</div>
                      <div><strong>Vehicle:</strong> {memo.vehicleNumber}</div>
                      <div><strong>Region:</strong> {memo.regionName}</div>
                      {matchingWage && (
                        <div
                          className="glass-badge"
                          style={{
                            background: "#2b2b2b",
                            border: "1px solid #00c3ff",
                            borderRadius: "6px",
                            marginTop: "0.75rem",
                            padding: "0.5rem",
                            color: "#00ffcc",
                            fontWeight: "bold",
                            textAlign: "center"
                          }}
                        >
                          Total Wage: ₹{matchingWage.totalWage.toLocaleString()}
                        </div>
                      )}
                      <div style={{ marginTop: "0.75rem" }}>
                        {!labourSelections[memo.id]?.confirmed && (
                          <>
                            <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Assign Labours:</label>
                            <select
                              multiple
                              id={`loaderSelect-${memo.id}`}
                              className="apple-select"
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "6px",
                                background: "#1f1f1f",
                                color: "white",
                                border: "1px solid #555",
                                marginTop: "0.5rem",
                              }}
                            >
                              {labourOptions.map(labour => (
                                <option key={labour.id} value={labour.labourID}>
                                  {labour.name} ({labour.labourID})
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: "0.75rem" }}>
                        {!labourSelections[memo.id]?.confirmed && (
                          <label style={{ display: "flex", alignItems: "center", fontSize: "0.9rem" }}>
                            <input
                              type="checkbox"
                              checked={labourSelections[memo.id]?.showUnloaderSelect || false}
                              onChange={(e) => {
                                setLabourSelections(prev => ({
                                  ...prev,
                                  [memo.id]: {
                                    ...prev[memo.id],
                                    showUnloaderSelect: e.target.checked
                                  }
                                }));
                              }}
                              style={{ marginRight: "0.5rem" }}
                            />
                            Different Unloaders?
                          </label>
                        )}
                      </div>
                      {labourSelections[memo.id]?.showUnloaderSelect && !labourSelections[memo.id]?.confirmed && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Assign Unloaders:</label>
                          <select
                            multiple
                            id={`unloaderSelect-${memo.id}`}
                            className="apple-select"
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              borderRadius: "6px",
                              background: "#1f1f1f",
                              color: "white",
                              border: "1px solid #555",
                              marginTop: "0.5rem",
                            }}
                          >
                            {labourOptions.map(labour => (
                              <option key={labour.id} value={labour.labourID}>
                                {labour.name} ({labour.labourID})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {labourSelections[memo.id]?.saved ? null : (
                        <Button
                          variant={labourSelections[memo.id]?.confirmed ? "success" : "primary"}
                          className="w-full mt-4"
                          onClick={async () => {
                            if (!labourSelections[memo.id]?.confirmed) {
                              const loaders = Array.from(
                                document.querySelector(`#loaderSelect-${memo.id}`)?.selectedOptions || []
                              ).map(opt => opt.value);
                              const unloaders = labourSelections[memo.id]?.showUnloaderSelect
                                ? Array.from(
                                    document.querySelector(`#unloaderSelect-${memo.id}`)?.selectedOptions || []
                                  ).map(opt => opt.value)
                                : loaders;

                              const totalWageRupees = vehicleWages.find(w => w.unitCount === memo.productQuant)?.totalWage || 0;
                              const totalWage = Math.round(totalWageRupees * 100); // Convert rupees to paise
                              const loaderPool = Math.floor(totalWage / 2);
                              const unloaderPool = totalWage - loaderPool; // Ensure total adds up correctly
                              const numLoaders = loaders.length;
                              const numUnloaders = unloaders.length;
                              const loaderWage = numLoaders > 0 ? Math.floor(loaderPool / numLoaders) : 0;
                              const unloaderWage = numUnloaders > 0 ? Math.floor(unloaderPool / numUnloaders) : 0;
                              

                              const loaderRows = loaders.map(labourID => {
                                const labour = labourOptions.find(l => l.labourID === labourID);
                                return {
                                  name: labour?.name || labourID,
                                  id: labourID,
                                  wage: loaderWage,
                                  role: "loader"
                                };
                              });
                              const unloaderRows = unloaders.map(labourID => {
                                const labour = labourOptions.find(l => l.labourID === labourID);
                                return {
                                  name: labour?.name || labourID,
                                  id: labourID,
                                  wage: unloaderWage,
                                  role: "unloader"
                                };
                              });

                              let rows;
                              if (!labourSelections[memo.id]?.showUnloaderSelect) {
                                rows = loaders.map(labourID => {
                                  const labour = labourOptions.find(l => l.labourID === labourID);
                                  return {
                                    name: labour?.name || labourID,
                                    id: labourID,
                                    wage: Math.floor(loaderWage + unloaderWage),
                                    role: "both"
                                  };
                                });
                              } else {
                                const merged = {};
                                [...loaderRows, ...unloaderRows].forEach(entry => {
                                  if (!merged[entry.id]) {
                                    merged[entry.id] = { ...entry };
                                  } else {
                                    merged[entry.id].wage = Math.floor(merged[entry.id].wage + entry.wage);
                                    merged[entry.id].role = "both";
                                  }
                                });
                                rows = Object.values(merged);
                              }

                              setConfirmedLabours(prev => ({
                                ...prev,
                                [memo.id]: rows
                              }));
                              setLabourSelections(prev => ({
                                ...prev,
                                [memo.id]: {
                                  ...prev[memo.id],
                                  confirmed: true
                                }
                              }));
                            } else {
                              // Save logic: Use batch write operation like ProductionService
                              const entries = confirmedLabours[memo.id] || [];
                              const assignedBatchID = memo.id;
                              const category = "Vehicle";
                              const createdAt = serverTimestamp();
                              const date = Timestamp.fromDate(new Date(selectedDate));
                              const orgID = memo.orgID;
                              const unitCount = memo.productQuant;
                              const vehicleID = memo.vehicleNumber;
                              const vehicleType = memo.type || "";

                              try {
                                const batch = writeBatch(db);
                                
                                // First, get all employee documents we need to update
                                const employeeUpdatePromises = entries.map(async (entry) => {
                                  const employeeRef = query(collection(db, "employees"), where("labourID", "==", entry.id));
                                  const employeeSnap = await getDocs(employeeRef);
                                  return { entry, employeeSnap };
                                });
                                
                                const employeeData = await Promise.all(employeeUpdatePromises);
                                
                                // Create wage entries and update balances in batch
                                for (const { entry, employeeSnap } of employeeData) {
                                  const wageEntryRef = doc(collection(db, "WAGES_ENTRIES"));
                                  const wageEntry = {
                                    assignedBatchID,
                                    category,
                                    createdAt,
                                    updatedAt: createdAt,
                                    date,
                                    entryID: `${assignedBatchID}_${entry.id}`,
                                    labourID: entry.id,
                                    labourName: entry.name,
                                    labourType: entry.role === "both"
                                      ? "Loader-Unloader"
                                      : entry.role === "loader"
                                      ? "Loader"
                                      : "Unloader",
                                    orgID,
                                    unitCount,
                                    vehicleID,
                                    vehicleType,
                                    wageAmount: entry.wage
                                  };
                                  
                                  batch.set(wageEntryRef, wageEntry);
                                  
                                  // Update EMPLOYEE currentBalance using increment (like ProductionService)
                                  employeeSnap.forEach((docSnap) => {
                                    const employeeDocRef = doc(db, "employees", docSnap.id);
                                    batch.update(employeeDocRef, {
                                      currentBalance: increment(entry.wage),
                                      updatedAt: serverTimestamp()
                                    });
                                    
                                    // Update account balance if employee has an account
                                    const employeeData = docSnap.data();
                                    if (employeeData.accountId) {
                                      const accountRef = doc(db, "employeeaccounts", employeeData.accountId);
                                      batch.update(accountRef, {
                                        currentBalance: increment(entry.wage),
                                        updatedAt: serverTimestamp()
                                      });
                                    }
                                  });
                                }
                                
                                // Commit all operations atomically
                                await batch.commit();
                                
                                setLabourSelections(prev => ({
                                  ...prev,
                                  [memo.id]: {
                                    ...prev[memo.id],
                                    saved: true
                                  }
                                }));
                              } catch (err) {
                                console.error("Failed to save wage entries:", err);
                                toast.error("Failed to save wage entries");
                              }
                            }
                          }}
                        >
                          {labourSelections[memo.id]?.confirmed ? "Save Entries" : "Confirm Wage Entry"}
                        </Button>
                      )}

                      {labourSelections[memo.id]?.saved && (
                        <div>
                          {/* Discard Button with Role-based Access Control */}
                          {canDiscardEntry(memo) ? (
                            <Button
                              variant="danger"
                              className="w-full mt-4"
                              onClick={async () => {
                                if (!window.confirm("Are you sure you want to discard this wage entry? This action cannot be undone.")) {
                                  return;
                                }
                                
                                // Delete entries using batch write operation (like ProductionService)
                                const entries = confirmedLabours[memo.id] || [];
                                
                                try {
                                  const batch = writeBatch(db);
                                  
                                  // First, get all wage entries and employee data we need to process
                                  const wageEntryPromises = entries.map(async (entry) => {
                                    const q = query(
                                      collection(db, "WAGES_ENTRIES"),
                                      where("entryID", "==", `${memo.id}_${entry.id}`)
                                    );
                                    const snap = await getDocs(q);
                                    
                                    const employeeRef = query(collection(db, "employees"), where("labourID", "==", entry.id));
                                    const employeeSnap = await getDocs(employeeRef);
                                    
                                    return { snap, employeeSnap };
                                  });
                                  
                                  const wageData = await Promise.all(wageEntryPromises);
                                  
                                  // Process deletions and balance reversions
                                  for (let i = 0; i < entries.length; i++) {
                                    const entry = entries[i];
                                    const { snap, employeeSnap } = wageData[i];
                                    
                                    snap.forEach((docRef) => {
                                      const wageAmount = docRef.data().wageAmount || 0;
                                      
                                      // Delete wage entry
                                      batch.delete(docRef.ref);
                                      
                                      // Revert employee balance using increment (subtract)
                                      employeeSnap.forEach((docSnap) => {
                                        const employeeDocRef = doc(db, "employees", docSnap.id);
                                        batch.update(employeeDocRef, {
                                          currentBalance: increment(-wageAmount),
                                          updatedAt: serverTimestamp()
                                        });
                                        
                                        // Revert account balance if employee has an account
                                        const employeeData = docSnap.data();
                                        if (employeeData.accountId) {
                                          const accountRef = doc(db, "employeeaccounts", employeeData.accountId);
                                          batch.update(accountRef, {
                                            currentBalance: increment(-wageAmount),
                                            updatedAt: serverTimestamp()
                                          });
                                        }
                                      });
                                    });
                                  }
                                  
                                  // Commit all operations atomically
                                  await batch.commit();
                                } catch (e) {
                                  console.error("Failed to discard wage entries:", e);
                                  toast.error("Failed to discard wage entries");
                                }
                                setLabourSelections(prev => ({
                                  ...prev,
                                  [memo.id]: {}
                                }));
                                setConfirmedLabours(prev => ({
                                  ...prev,
                                  [memo.id]: []
                                }));
                              }}
                            >
                              {isAdmin ? "🗑️ Discard" : "🗑️ Discard (Manager)"}
                            </Button>
                          ) : (
                            <div style={{
                              marginTop: "1rem",
                              padding: "0.75rem",
                              background: "rgba(255, 68, 68, 0.1)",
                              border: "1px solid rgba(255, 68, 68, 0.3)",
                              borderRadius: "6px",
                              color: "#ff4444",
                              fontSize: "0.85rem",
                              textAlign: "center"
                            }}>
                              {getDiscardRestrictionMessage(memo)}
                            </div>
                          )}
                        </div>
                      )}

                      {confirmedLabours[memo.id]?.length > 0 && (
                        <div style={{ marginTop: "0.75rem", background: "#1b1b1b", borderRadius: "6px", padding: "0.5rem" }}>
                          <table className="apple-table" style={{ width: "100%", color: "white", fontSize: "0.9rem" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left" }}>Labour</th>
                                <th style={{ textAlign: "right" }}>Wage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {confirmedLabours[memo.id].map(labour => (
                                <tr key={labour.id}>
                                  <td>{labour.name}</td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                  >
                                    ₹{(labour.wage / 100).toFixed(2)}
                                    {!labourSelections[memo.id]?.saved && (
                                      <span
                                        style={{
                                          marginLeft: "0.5rem",
                                          cursor: "pointer",
                                          color: "#ff5555",
                                          fontWeight: "bold"
                                        }}
                                        onClick={() => {
                                          setConfirmedLabours(prev => {
                                            const updated = prev[memo.id].filter(l => l.id !== labour.id);
                                            const newConfirmed = { ...prev, [memo.id]: updated };
                                            
                                            // If all labours are removed, revert to confirmation state
                                            if (updated.length === 0) {
                                              setLabourSelections(sel => ({
                                                ...sel,
                                                [memo.id]: {
                                                  ...sel[memo.id],
                                                  confirmed: false
                                                }
                                              }));
                                            }
                                            return newConfirmed;
                                          });
                                        }}
                                      >
                                        ×
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </DieselPage>
  );
};

export default VLabourEntry;