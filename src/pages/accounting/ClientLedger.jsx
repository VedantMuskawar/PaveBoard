import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  startAt,
  endAt
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { 
  Button,
  Card,
  Input,
  DataTable,
  Spinner,
  Badge,
  Modal,
  PageHeader,
  ExportButton,
  DateRangeFilter
} from "../../components/ui";
import "./ClientLedger.css";

function ClientLedger({ onBack }) {
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  const [searchInput, setSearchInput] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [highlightedClientId, setHighlightedClientId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTransactions, setClientTransactions] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [clientDMs, setClientDMs] = useState([]);
  const debounceTimer = useRef(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Expandable row state
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [readCount, setReadCount] = useState(0);
  const [negativeBalanceClients, setNegativeBalanceClients] = useState([]);
  const [loadingNegativeBalance, setLoadingNegativeBalance] = useState(false);


  // Fetch clients with negative balances
  const fetchNegativeBalanceClients = async () => {
    if (!selectedOrg?.orgID) return;
    
    setLoadingNegativeBalance(true);
    try {
      console.log('🔄 Fetching clients with negative balances for orgID:', selectedOrg.orgID);
      
      const q = query(
        collection(db, "CLIENTS"),
        where("orgID", "==", selectedOrg.orgID),
        where("totalBalance", "<", 0),
        orderBy("totalBalance", "asc") // Most negative first
      );
      
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Fetched negative balance clients:', clientsData.length);
      setNegativeBalanceClients(clientsData);
      setReadCount(prev => prev + snapshot.docs.length);
      
    } catch (error) {
      console.error('❌ Error fetching negative balance clients:', error);
    } finally {
      setLoadingNegativeBalance(false);
    }
  };

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      return;
    }
    
    // Fetch negative balance clients when organization is selected
    fetchNegativeBalanceClients();
  }, [selectedOrg]);

  useEffect(() => {
    const fetchDMs = async () => {
      if (!selectedClient || !selectedOrg?.orgID) return;
      try {
        setLoadingData(true);
        const q = query(
          collection(db, "DELIVERY_MEMOS"),
          where("orgID", "==", selectedOrg.orgID),
          where("clientID", "==", selectedClient.id)
        );
        const snapshot = await getDocs(q);
        const dms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReadCount(prev => prev + snapshot.docs.length);
        setClientDMs(dms);
        setLoadingData(false);
      } catch (error) {
        setLoadingData(false);
      }
    };
    fetchDMs();
  }, [selectedClient, selectedOrg]);
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedClient || !selectedOrg?.orgID) return;

      try {
        setLoadingData(true);
        const q = query(
          collection(db, "TRANSACTIONS"),
          where("orgID", "==", selectedOrg.orgID),
          where("clientID", "==", selectedClient.id),
          where("category", "==", "DEBIT")
        );

        const snapshot = await getDocs(q);
        const txns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReadCount(prev => prev + snapshot.docs.length);
        setClientTransactions(txns);
        setLoadingData(false);
      } catch (error) {
        setLoadingData(false);
      }
    };

    fetchTransactions();
  }, [selectedClient, selectedOrg]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedClient || !selectedOrg?.orgID) return;

      try {
        setLoadingData(true);
        const q = query(
          collection(db, "SCH_ORDERS"),
          where("orgID", "==", selectedOrg.orgID),
          where("clientID", "==", selectedClient.id)
        );

        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReadCount(prev => prev + snapshot.docs.length);
        setClientOrders(orders);
        setLoadingData(false);
      } catch (error) {
        setLoadingData(false);
      }
    };

    fetchOrders();
  }, [selectedClient, selectedOrg]);

  useEffect(() => {
    if (!selectedOrg?.orgID || searchInput.trim() === "") {
      setFilteredClients([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const fetchClients = async () => {
        try {
          setLoadingClients(true);
          const startText = searchInput;
          const endText = startText + "\uf8ff";
          const q = query(
            collection(db, "CLIENTS"),
            where("orgID", "==", selectedOrg.orgID),
            orderBy("name"),
            startAt(startText),
            endAt(endText)
          );

          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setReadCount(prev => prev + snapshot.docs.length);
          setFilteredClients(results);
          // highlight animation for matched rows
          if (results.length > 0) {
            setHighlightedClientId(results[0].id);
            setTimeout(() => setHighlightedClientId(null), 1500);
          }
          setLoadingClients(false);
        } catch (error) {
          setLoadingClients(false);
        }
      };

      fetchClients();
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, selectedOrg]);

  return (
    <div className="apple-font">
              {/* Header */}
        <header className="header-container">
        <div className="back-button" onClick={handleBack}>←</div>
        <div>Client Ledger</div>
        <div className={`role-badge ${isAdmin ? 'admin' : 'manager'}`}>
          {isAdmin ? "👑 Admin" : "👔 Manager"}
        </div>
      </header>

      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        {/* Search Bar */}
        <div className="search-container">
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search clients by name..."
          className="search-input"
        />
      </div>
      {loadingClients && (
        <div className="loading-spinner">
          <Spinner size="lg" />
        </div>
      )}

      {/* Search Results Cards */}
      {filteredClients.length > 0 && (
        <div className="clients-container">
          <div className="clients-grid">
            {filteredClients.map(client => (
              <Card 
                key={client.id}
                className={`client-card ${highlightedClientId === client.id ? 'highlighted' : ''}`}
                onClick={() => setSelectedClient(client)}
              >
                <div className="client-info">
                  <div className="client-name">{client.name}</div>
                  <div className="client-phone">{client.phoneNumber || "—"}</div>
                  <div className="client-balance">
                    ₹{client.totalBalance?.toLocaleString() || "0"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No results placeholder */}
      {
        !loadingClients && searchInput && filteredClients.length === 0 && (
          <div className="no-results">
            🔍 No clients found matching "{searchInput}".<br />Try another name or check spelling.
          </div>
        )
      }

      {/* Negative Balance Clients Table */}
      {!selectedClient && (
        <div className="negative-balance-section" style={{ marginTop: "2rem" }}>
          <div className="section-header" style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "1rem" 
          }}>
            <h2 style={{ 
              color: "#f5f5f7", 
              fontSize: "1.25rem", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              💸 Clients with Negative Balances
            </h2>
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#a1a1aa",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span>Total: {negativeBalanceClients.length}</span>
              <span>•</span>
              <span>₹{negativeBalanceClients.reduce((sum, client) => sum + Math.abs(client.totalBalance || 0), 0).toLocaleString()}</span>
            </div>
          </div>

          {loadingNegativeBalance ? (
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              padding: "2rem",
              background: "rgba(28,28,30,0.6)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <Spinner size="lg" />
              <span style={{ marginLeft: "1rem", color: "#a1a1aa" }}>Loading negative balance clients...</span>
            </div>
          ) : negativeBalanceClients.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem 2rem",
              background: "rgba(28,28,30,0.6)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#a1a1aa"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem", color: "#f5f5f7" }}>
                No Negative Balances
              </h3>
              <p style={{ fontSize: "1rem", lineHeight: "1.5" }}>
                All clients have positive or zero balances.
              </p>
            </div>
          ) : (
            <Card style={{ background: "rgba(28,28,30,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ padding: "1rem" }}>
                <DataTable
                  data={negativeBalanceClients.map(client => ({
                    id: client.id,
                    name: client.name || 'N/A',
                    phoneNumber: client.phoneNumber || 'N/A',
                    totalBalance: client.totalBalance || 0,
                    outstandingAmount: Math.abs(client.totalBalance || 0),
                    totalRevenue: client.totalRevenue || 0,
                    formattedBalance: `₹${Math.abs(client.totalBalance || 0).toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}`,
                    formattedRevenue: `₹${(client.totalRevenue || 0).toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}`
                  }))}
                  columns={[
                    { 
                      key: 'name', 
                      header: 'Client Name',
                      render: (client) => (
                        <div style={{ 
                          fontWeight: "600", 
                          color: "#f5f5f7",
                          cursor: "pointer"
                        }}
                        onClick={() => setSelectedClient(negativeBalanceClients.find(c => c.id === client.id))}
                        >
                          {client.name}
                        </div>
                      )
                    },
                    { 
                      key: 'phoneNumber', 
                      header: 'Phone Number',
                      render: (client) => (
                        <div style={{ color: "#a1a1aa" }}>
                          {client.phoneNumber}
                        </div>
                      )
                    },
                    { 
                      key: 'formattedBalance', 
                      header: 'Outstanding Amount',
                      align: 'right',
                      render: (client) => (
                        <div style={{ 
                          color: "#ff6b6b",
                          fontWeight: "700",
                          fontSize: "1rem"
                        }}>
                          -{client.formattedBalance}
                        </div>
                      )
                    },
                    { 
                      key: 'formattedRevenue', 
                      header: 'Total Revenue',
                      align: 'right',
                      render: (client) => (
                        <div style={{ 
                          color: "#51cf66",
                          fontWeight: "600"
                        }}>
                          {client.formattedRevenue}
                        </div>
                      )
                    }
                  ]}
                  onRowClick={(row) => {
                    const client = negativeBalanceClients.find(c => c.id === row.id);
                    if (client) {
                      setSelectedClient(client);
                    }
                  }}
                  className="negative-balance-table"
                  style={{ 
                    background: "transparent",
                    color: "#f5f5f7"
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      )}
        </div>

      {selectedClient && (() => {
        // Date filter helper
        const isInRange = (date) => {
          if (!date?.seconds) return false;
          const entryDate = new Date(date.seconds * 1000);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          if (start && entryDate < start) return false;
          if (end && entryDate > end) return false;
          return true;
        };
        // Build ledger rows, mapping dmNumber for orders
        const ledgerRows = [
          ...clientTransactions.map(txn => ({
            id: txn.id,
            date: txn.date,
            type: "transaction",
            debit: txn.amount,
            credit: 0,
            description: txn.toAccount,
            remarks: txn.remarks || ""
          })),
          ...clientOrders.map(order => {
            const amount = order.productQuant * order.productUnitPrice;
            const matchingDM = clientDMs.find(dm => dm.orderID === order.id);
            return {
              id: order.id,
              date: order.deliveryDate,
              type: "order",
              debit: order.toAccount !== "CREDIT" ? amount : 0,
              credit: order.toAccount !== "CREDIT" ? amount : order.toAccount === "CREDIT" ? amount : 0,
              productQuant: order.productQuant,
              productUnitPrice: order.productUnitPrice,
              dmNumber: matchingDM?.dmNumber,
              remarks: order.remarks || ""
            };
          })
        ]
        .filter(row => isInRange(row.date))
        .sort((a, b) => a.date?.seconds - b.date?.seconds);
        return (
          <div className="ledger-container">
            <div className="ledger-header">
              <Button
                variant="outline"
                onClick={() => setSelectedClient(null)}
                className="back-button"
              >
                ← Back to Client List
              </Button>
            </div>
            <div className="ledger-content">
              <div className="ledger-actions">
                <Button
                  onClick={() => window.print()}
                  variant="primary"
                  className="button-primary"
                >
                  📄 Export / Print
                </Button>
                <Button
                  onClick={() => {
                    const csvData = ledgerRows.map(e => ({
                      Date: new Date(e.date.seconds * 1000).toLocaleDateString("en-GB"),
                      Type: e.type,
                      Debit: e.debit || "",
                      Credit: e.credit || "",
                      Remarks: e.remarks || "",
                      Balance: ""
                    }));
                    const headers = Object.keys(csvData[0]).join(",");
                    const rows = csvData.map(obj => Object.values(obj).join(",")).join("\n");
                    const csv = `${headers}\n${rows}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `ledger_${selectedClient.name}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  variant="outline"
                  className="button-neutral"
                  style={{ marginLeft: "1rem" }}
                >
                  📁 Export CSV
                </Button>
              </div>
              <div className="ledger-print-section">
                <h3 className="ledger-title">
                  Ledger for {selectedClient.name}
                </h3>
                {/* Date range filter */}
                <div className="date-filter-container">
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="input-field"
                    placeholder="Start Date"
                  />
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="input-field"
                    placeholder="End Date"
                  />
                </div>
                <div className="sticky-summary">
                  <Card className="summary-card">
                    <div><strong>👤 Name:</strong> {selectedClient.name}</div>
                    <div><strong>📞 Phone:</strong> {selectedClient.phoneNumber || "—"}</div>
                    <div><strong>📊 Balance:</strong> ₹{selectedClient.totalBalance?.toLocaleString() || "0"}</div>
                    <div><strong>🧾 Orders:</strong> {clientOrders.length} | <strong>💸 Transactions:</strong> {clientTransactions.length}</div>
                    <div><strong>📊 Firestore Reads:</strong> {readCount}</div>
                  </Card>
                </div>
                {loadingData && (
                  <div className="loading-spinner" style={{ margin: "2rem 0" }}>
                    <Spinner size="xl" />
                  </div>
                )}
                {!loadingData && (
                  <>
                  <Card className="table-card">
                    <DataTable
                      data={(() => {
                        let runningBalance = 0;
                        return ledgerRows.map((entry, index) => {
                          runningBalance += (entry.debit || 0) - (entry.credit || 0);
                          return {
                            id: entry.id,
                            date: new Date(entry.date?.seconds * 1000).toLocaleDateString("en-GB"),
                            dmNumber: entry.dmNumber || "-",
                            quantity: entry.productQuant ?? "-",
                            rate: entry.productUnitPrice !== undefined ? `₹${entry.productUnitPrice.toFixed(2)}` : "-",
                            debit: entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : "-",
                            credit: entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : "-",
                            balance: `₹${runningBalance.toLocaleString()}`,
                            type: entry.type === "order" ? "🧾 Order" : "💸 Payment",
                            remarks: entry.remarks || "-",
                            runningBalance: runningBalance,
                            entry: entry
                          };
                        });
                      })()}
                      columns={[
                        { key: 'date', header: 'Date' },
                        { key: 'dmNumber', header: 'DM No.' },
                        { key: 'quantity', header: 'Quantity' },
                        { key: 'rate', header: 'Rate' },
                        { key: 'debit', header: 'Debit' },
                        { key: 'credit', header: 'Credit' },
                        { key: 'balance', header: 'Balance' },
                        { key: 'type', header: 'Type' },
                        { key: 'remarks', header: 'Remarks' }
                      ]}
                      onRowClick={(row) => setExpandedRowId(prev => prev === row.id ? null : row.id)}
                      className="data-table"
                    />
                  </Card>
                  <Card className="summary-totals">
                    <div className="summary-row">
                      <span className="summary-label">Total Debit</span>
                      <span className="summary-value">
                        ₹{ledgerRows.reduce((sum, entry) => sum + (entry.debit || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Total Credit</span>
                      <span className="summary-value">
                        ₹{ledgerRows.reduce((sum, entry) => sum + (entry.credit || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Difference (Debit - Credit)</span>
                      <span className={`summary-value ${
                        (() => {
                          const totalDebit = ledgerRows.reduce((sum, entry) => sum + (entry.debit || 0), 0);
                          const totalCredit = ledgerRows.reduce((sum, entry) => sum + (entry.credit || 0), 0);
                          const diff = totalDebit - totalCredit;
                          return diff < 0 ? 'negative' : diff > 0 ? 'positive' : '';
                        })()
                      }`}>
                        ₹{(() => {
                          const totalDebit = ledgerRows.reduce((sum, entry) => sum + (entry.debit || 0), 0);
                          const totalCredit = ledgerRows.reduce((sum, entry) => sum + (entry.credit || 0), 0);
                          return (totalDebit - totalCredit).toLocaleString();
                        })()}
                      </span>
                    </div>
                  </Card>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Loader overlay */}
      {loadingData && (
        <div className="loader-overlay">
          <Spinner size="xl" />
        </div>
      )}
    </div>
  );
}


export default ClientLedger;