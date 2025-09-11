import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  startAfter
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { 
  Button,
  Card,
  Modal,
  Input,
  SelectField,
  ActionButton,
  DataTable,
  LoadingState,
  EmptyState,
  PageHeader,
  SectionCard,
  Badge,
  ConfirmationModal,
  DieselPage,
  FormModal,
  InputField,
  DatePicker,
  StatsCard,
  FilterBar
} from "../../components/ui";
import './ProcurementReport.css';

const ProcurementReports = ({ onBack }) => {
  // Auth context
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  // State
  const [activeTab, setActiveTab] = useState("quantity-tracking");
  const [vendors, setVendors] = useState([]);
  const [procurementEntries, setProcurementEntries] = useState([]);
  const [procurementLedger, setProcurementLedger] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [productionEntries, setProductionEntries] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Database read count tracking
  const [readCount, setReadCount] = useState(0);
  
  // Date range states
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Constants
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  const orgName = selectedOrg?.orgName || "LIT";
  
  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      return;
    }
  }, [selectedOrg]);

  // Effects
  useEffect(() => {
    if (selectedOrg) {
      fetchReportData();
    }
  }, [selectedOrg, startDate, endDate, selectedVendor]);

  // Check user role
  useEffect(() => {
    if (selectedOrg) {
      const userRole = selectedOrg.role || 0;
      const roleNumber = Number(userRole);
      
      setIsAdmin(roleNumber === 0);
      setIsManager(roleNumber === 1);
    }
  }, [selectedOrg]);

  // Fetch all report data
  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      // Fetch vendors
      const vendorsQuery = query(
        collection(db, "VENDORS"),
        where("orgID", "==", orgID),
        orderBy("name", "asc")
      );
      
      const vendorsUnsubscribe = onSnapshot(vendorsQuery, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendors(rows);
        setReadCount(prev => prev + 1);
      });

      // Fetch procurement entries
      const procurementQuery = query(
        collection(db, "PROCUREMENT_ENTRIES"),
        where("orgID", "==", orgID)
      );
      
      const procurementUnsubscribe = onSnapshot(procurementQuery, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProcurementEntries(rows);
        setReadCount(prev => prev + 1);
      });

      // Fetch procurement ledger
      const ledgerQuery = query(
        collection(db, "PROCUREMENT_LEDGER"),
        where("orgID", "==", orgID)
      );
      
      const ledgerUnsubscribe = onSnapshot(ledgerQuery, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProcurementLedger(rows);
        setReadCount(prev => prev + 1);
      });

      // Fetch expenses (for ledger integration)
      const expensesQuery = query(
        collection(db, "EXPENSES"),
        where("orgID", "==", orgID),
        where("expenseType", "in", ["RAW_MATERIAL", "CONSUMABLES"])
      );
      
      const expensesUnsubscribe = onSnapshot(expensesQuery, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExpenses(rows);
        setReadCount(prev => prev + 1);
      });

      // Fetch production entries (for quantity tracking)
      const productionQuery = query(
        collection(db, "PRODUCTION_ENTRIES"),
        where("orgID", "==", orgID)
      );
      
      const productionUnsubscribe = onSnapshot(productionQuery, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProductionEntries(rows);
        setReadCount(prev => prev + 1);
      });

      setIsLoading(false);

      // Return cleanup functions
      return () => {
        vendorsUnsubscribe();
        procurementUnsubscribe();
        ledgerUnsubscribe();
        expensesUnsubscribe();
        productionUnsubscribe();
      };
      
    } catch (error) {
      toast.error("Failed to fetch report data");
      setIsLoading(false);
    }
  };

  // Calculate period dates
  const getPeriodDates = () => {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
  };

  // Calculate quantity tracking for raw materials
  const calculateQuantityTracking = () => {
    const { startDate, endDate } = getPeriodDates();
    
    // Map raw material names to standardized categories
    const mapRawMaterialCategory = (itemName) => {
      const name = itemName.toLowerCase();
      if (name.includes('cement') || name.includes('cemento') || name.includes('simen')) {
        return 'Cement';
      } else if (name.includes('raw material 1') || name.includes('rm1') || name.includes('material 1')) {
        return 'Raw Material 1';
      } else if (name.includes('raw material 2') || name.includes('rm2') || name.includes('material 2')) {
        return 'Raw Material 2';
      } else {
        return itemName; // Keep original name if no match
      }
    };
    
    // Filter raw material procurements by period and vendor
    const periodProcurements = procurementEntries.filter(p => {
      const entryDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
      const dateMatch = entryDate >= startDate && entryDate <= endDate;
      const vendorMatch = !selectedVendor || p.vendorID === selectedVendor;
      
      return p.category === "RAW_MATERIAL" && dateMatch && vendorMatch;
    });

    // Filter production entries by period
    const periodProduction = productionEntries.filter(p => {
      const entryDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Group by standardized item categories
    const itemGroups = {};
    
    periodProcurements.forEach(procurement => {
      const standardizedName = mapRawMaterialCategory(procurement.itemName);
      if (!itemGroups[standardizedName]) {
        itemGroups[standardizedName] = {
          itemName: standardizedName,
          unit: procurement.unit || 'kg',
          totalProcured: 0,
          totalValue: 0,
          procurementCount: 0,
          vendors: new Set(),
          lastProcurement: null
        };
      }
      
      itemGroups[standardizedName].totalProcured += Number(procurement.quantity) || 0;
      itemGroups[standardizedName].totalValue += Number(procurement.totalAmount) || 0;
      itemGroups[standardizedName].procurementCount += 1;
      itemGroups[standardizedName].vendors.add(procurement.vendorName);
      
      if (!itemGroups[standardizedName].lastProcurement || 
          procurement.date > itemGroups[standardizedName].lastProcurement) {
        itemGroups[standardizedName].lastProcurement = procurement.date;
      }
    });

    // Calculate consumption from production entries
    const consumptionData = {};
    periodProduction.forEach(production => {
      // Map production entry raw materials to standardized categories
      if (production.rawMaterial1) {
        const standardizedName = mapRawMaterialCategory("Raw Material 1");
        if (!consumptionData[standardizedName]) {
          consumptionData[standardizedName] = 0;
        }
        consumptionData[standardizedName] += Number(production.rawMaterial1) || 0;
      }
      
      if (production.rawMaterial2) {
        const standardizedName = mapRawMaterialCategory("Raw Material 2");
        if (!consumptionData[standardizedName]) {
          consumptionData[standardizedName] = 0;
        }
        consumptionData[standardizedName] += Number(production.rawMaterial2) || 0;
      }
      
      if (production.cementBags) {
        const standardizedName = mapRawMaterialCategory("Cement");
        if (!consumptionData[standardizedName]) {
          consumptionData[standardizedName] = 0;
        }
        consumptionData[standardizedName] += Number(production.cementBags) || 0;
      }
    });

    // Convert to array and add consumption data
    const quantityReport = Object.values(itemGroups).map(item => ({
      ...item,
      vendors: Array.from(item.vendors).join(', '),
      totalConsumed: consumptionData[item.itemName] || 0,
      availableBalance: item.totalProcured - (consumptionData[item.itemName] || 0),
      consumptionRate: item.totalProcured > 0 ? 
        ((consumptionData[item.itemName] || 0) / item.totalProcured * 100).toFixed(1) : 0
    }));

    return quantityReport.sort((a, b) => b.totalValue - a.totalValue);
  };

  // Calculate ledger integration report
  const calculateLedgerReport = () => {
    const { startDate, endDate } = getPeriodDates();
    
    // Filter ledger entries by period and vendor
    const periodLedger = procurementLedger.filter(entry => {
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      const dateMatch = entryDate >= startDate && entryDate <= endDate;
      const vendorMatch = !selectedVendor || entry.vendorID === selectedVendor;
      
      return dateMatch && vendorMatch;
    });

    // Filter expenses by period and vendor (only raw material and consumables expenses)
    const periodExpenses = expenses.filter(expense => {
      const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
      const dateMatch = expenseDate >= startDate && expenseDate <= endDate;
      const vendorMatch = !selectedVendor || expense.vendorID === selectedVendor;
      const isRawMaterialExpense = expense.expenseType && (
        expense.expenseType === "RAW_MATERIAL_1" || 
        expense.expenseType === "RAW_MATERIAL_2" || 
        expense.expenseType === "CEMENT" || 
        expense.expenseType === "CONSUMABLES"
      );
      
      return dateMatch && vendorMatch && isRawMaterialExpense;
    });

    // Group by vendor
    const vendorGroups = {};
    
    // Process procurement ledger (credits)
    periodLedger.forEach(entry => {
      if (!vendorGroups[entry.vendorID]) {
        vendorGroups[entry.vendorID] = {
          vendorID: entry.vendorID,
          vendorName: entry.vendorName,
          totalCredits: 0,
          totalDebits: 0,
          netBalance: 0,
          transactionCount: 0,
          lastTransaction: null,
          categories: new Set()
        };
      }
      
      vendorGroups[entry.vendorID].totalCredits += Number(entry.amount) || 0;
      vendorGroups[entry.vendorID].transactionCount += 1;
      vendorGroups[entry.vendorID].categories.add(entry.category);
      
      if (!vendorGroups[entry.vendorID].lastTransaction || 
          entry.date > vendorGroups[entry.vendorID].lastTransaction) {
        vendorGroups[entry.vendorID].lastTransaction = entry.date;
      }
    });

    // Process expenses (debits)
    periodExpenses.forEach(expense => {
      if (!vendorGroups[expense.vendorID]) {
        vendorGroups[expense.vendorID] = {
          vendorID: expense.vendorID,
          vendorName: expense.vendorName || 'Unknown Vendor',
          totalCredits: 0,
          totalDebits: 0,
          netBalance: 0,
          transactionCount: 0,
          lastTransaction: null,
          categories: new Set()
        };
      }
      
      vendorGroups[expense.vendorID].totalDebits += Number(expense.amount) || 0;
      vendorGroups[expense.vendorID].transactionCount += 1;
      vendorGroups[expense.vendorID].categories.add(expense.expenseType);
      
      if (!vendorGroups[expense.vendorID].lastTransaction || 
          expense.date > vendorGroups[expense.vendorID].lastTransaction) {
        vendorGroups[expense.vendorID].lastTransaction = expense.date;
      }
    });

    // Calculate net balance and convert to array
    const ledgerReport = Object.values(vendorGroups).map(vendor => ({
      ...vendor,
      categories: Array.from(vendor.categories).join(', '),
      netBalance: vendor.totalCredits - vendor.totalDebits,
      balanceStatus: vendor.totalCredits - vendor.totalDebits >= 0 ? 'positive' : 'negative'
    }));

    return ledgerReport.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  };

  // Helper functions
  const currency = (n) => new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };


  const quantityReport = calculateQuantityTracking();
  const ledgerReport = calculateLedgerReport();

  if (isLoading) {
    return (
      <DieselPage>
        <PageHeader 
          title="Procurement Reports"
          onBack={onBack}
          role={isManager ? "manager" : "admin"}
        />
          <div className="main-container">
          <LoadingState message="Loading report data..." />
            </div>
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader 
        title="📊 Procurement Reports"
        onBack={onBack}
        role={isManager ? "manager" : "admin"}
        subtitle={`📊 Reads: ${readCount}`}
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-bold text-white">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
          
          <SelectField
            label="🏢 Vendor"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            options={[
              { value: "", label: "🏢 All Vendors" },
              ...vendors.map(v => ({ value: v.vendorID, label: v.name }))
            ]}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedVendor("");
              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, '0');
              const day = String(today.getDate()).padStart(2, '0');
              setStartDate(`${year}-${month}-${day}`);
              setEndDate(`${year}-${month}-${day}`);
            }}
            size="sm"
          >
            🗑️ Clear Filters
          </Button>
          
          <div className="text-sm text-slate-400">
            📊 Showing data from {startDate} to {endDate}
          </div>
        </div>
      </Card>

      {/* Main content container */}
      <div className="main-container">
          {/* Tabs */}
          <div className="tabs-container">
            {[
              ["quantity-tracking", "📏 Quantity Tracking (Raw Material 1, 2 & Cement)"],
              ["ledger-integration", "💰 Ledger Integration"],
            ].map(([key, label]) => (
              <div 
                key={key} 
                className={`tab ${activeTab === key ? 'active' : ''}`} 
                onClick={() => setActiveTab(key)}
              >
                {label}
              </div>
            ))}
          </div>

          {/* QUANTITY TRACKING TAB */}
          {activeTab === "quantity-tracking" && (
            <Card className="content-section">
              <div className="section-header">
                <div className="header-content-left">
                                <h3>📏 Raw Material Quantity Tracking</h3>
              <p className="section-description">
                Track procurement quantities, consumption, and available balance for Raw Material 1, Raw Material 2, and Cement
              </p>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Unit</th>
                      <th>Total Procured</th>
                      <th>Total Consumed</th>
                      <th>Available Balance</th>
                      <th>Total Value</th>
                      <th>Consumption Rate</th>
                      <th>Vendors</th>
                      <th>Last Procurement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quantityReport.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <EmptyState 
                            icon="📏"
                            title="No raw material data found"
                            description={`No raw material data found for the selected date range`}
                          />
                        </td>
                      </tr>
                    ) : (
                      quantityReport.map((item, index) => (
                        <tr key={index}>
                          <td className="item-name">{item.itemName}</td>
                          <td className="item-unit">{item.unit}</td>
                          <td className="quantity-procured">
                            <span className="quantity-value">{item.totalProcured.toFixed(2)}</span>
                          </td>
                          <td className="quantity-consumed">
                            <span className="quantity-value">{item.totalConsumed.toFixed(2)}</span>
                          </td>
                          <td className="available-balance">
                            <span className={`balance-value ${item.availableBalance >= 0 ? 'positive' : 'negative'}`}>
                              {item.availableBalance.toFixed(2)}
                            </span>
                          </td>
                          <td className="total-value">{currency(item.totalValue)}</td>
                          <td className="consumption-rate">
                            <span className={`rate-badge ${Number(item.consumptionRate) > 50 ? 'high' : 'medium'}`}>
                              {item.consumptionRate}%
                            </span>
                          </td>
                          <td className="vendors">{item.vendors}</td>
                          <td className="last-procurement">{formatDate(item.lastProcurement)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="summary-stats">
                <StatsCard
                  icon="📦"
                  title="Total Items"
                  value={quantityReport.length}
                />
                <StatsCard
                  icon="💰"
                  title="Total Value"
                  value={currency(quantityReport.reduce((sum, item) => sum + item.totalValue, 0))}
                />
                <StatsCard
                  icon="📏"
                  title="Total Quantity"
                  value={quantityReport.reduce((sum, item) => sum + item.totalProcured, 0).toFixed(2)}
                />
                  </div>
            </Card>
          )}

          {/* LEDGER INTEGRATION TAB */}
          {activeTab === "ledger-integration" && (
            <Card className="content-section">
              <div className="section-header">
                <div className="header-content-left">
                  <h3>💰 Ledger Integration Report</h3>
                  <p className="section-description">
                    Financial ledger showing credits (procurement) vs debits (expenses) by vendor
                  </p>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Total Credits</th>
                      <th>Total Debits</th>
                      <th>Net Balance</th>
                      <th>Transaction Count</th>
                      <th>Categories</th>
                      <th>Last Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerReport.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState 
                            icon="💰"
                            title="No ledger data found"
                            description={`No ledger data found for the selected date range`}
                          />
                        </td>
                      </tr>
                    ) : (
                      ledgerReport.map((vendor, index) => (
                        <tr key={index}>
                          <td className="vendor-name">{vendor.vendorName}</td>
                          <td className="credits">
                            <span className="credit-amount">{currency(vendor.totalCredits)}</span>
                          </td>
                          <td className="debits">
                            <span className="debit-amount">{currency(vendor.totalDebits)}</span>
                          </td>
                          <td className="net-balance">
                            <span className={`balance-value ${vendor.balanceStatus}`}>
                              {currency(vendor.netBalance)}
                            </span>
                          </td>
                          <td className="transaction-count">{vendor.transactionCount}</td>
                          <td className="categories">{vendor.categories}</td>
                          <td className="last-transaction">{formatDate(vendor.lastTransaction)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="summary-stats">
                <StatsCard
                  icon="🏢"
                  title="Total Vendors"
                  value={ledgerReport.length}
                />
                <StatsCard
                  icon="📈"
                  title="Total Credits"
                  value={currency(ledgerReport.reduce((sum, vendor) => sum + vendor.totalCredits, 0))}
                />
                <StatsCard
                  icon="📉"
                  title="Total Debits"
                  value={currency(ledgerReport.reduce((sum, vendor) => sum + vendor.totalDebits, 0))}
                />
                <StatsCard
                  icon="⚖️"
                  title="Net Balance"
                  value={currency(ledgerReport.reduce((sum, vendor) => sum + vendor.netBalance, 0))}
                />
                  </div>
            </Card>
          )}

          {/* Report Notes */}
          <Card className="report-notes">
            <div className="note-card">
              <div className="note-icon">💡</div>
              <div className="note-content">
                <h4>Report Information</h4>
                <ul>
                  <li><strong>Quantity Tracking:</strong> Raw Material 1, Raw Material 2, and Cement - tracks procurement vs consumption quantities</li>
                  <li><strong>Ledger Integration:</strong> Financial transactions from procurement entries and expenses</li>
                  <li><strong>Period Filtering:</strong> All data filtered by selected time period</li>
                  <li><strong>Vendor Filtering:</strong> Optional vendor-specific filtering for detailed analysis</li>
                </ul>
              </div>
            </div>
          </Card>
          </div>
    </DieselPage>
  );
};

export default ProcurementReports;
