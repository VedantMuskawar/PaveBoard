import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-hot-toast";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";

// Import services
import { LedgerService } from "../../services/ledgerService";

// Import UI components
import { 
  Button,
  Card,
  Input,
  DataTable,
  Spinner,
  Badge,
  Modal,
  ExportButton,
  DateRangeFilter
} from "../../components/ui";
import * as XLSX from "xlsx";

import './LedgerPage.css';

function LedgerPage({ onBack }) {
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg } = useOrganization();
  const { user } = useAuth();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  
  // Get organization details
  const orgID = selectedOrg?.orgID;

  // State management
  const [searchInput, setSearchInput] = useState('');
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [highlightedEntityId, setHighlightedEntityId] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [dbReadCount, setDbReadCount] = useState(0);
  const debounceTimer = useRef(null);
  
  // Search enhancements
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      return;
    }
  }, [selectedOrg]);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('ledgerSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Generate search suggestions from history
  useEffect(() => {
    if (searchInput.length >= 1 && searchHistory.length > 0) {
      const suggestions = searchHistory
        .filter(term => term.toLowerCase().includes(searchInput.toLowerCase()))
        .slice(0, 5);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchInput, searchHistory]);

  // Search for employees and accounts with debouncing and caching
  useEffect(() => {
    if (!selectedOrg?.orgID || searchInput.trim() === "") {
      setFilteredEntities([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const fetchEntities = async () => {
        try {
          console.log(`🔍 Starting search for: "${searchInput}" with orgID: ${orgID}`);
          setLoadingEntities(true);
          setShowSuggestions(false);
          
          // Add to search history
          const trimmedInput = searchInput.trim();
          if (trimmedInput && !searchHistory.includes(trimmedInput)) {
            const newHistory = [trimmedInput, ...searchHistory].slice(0, 10);
            setSearchHistory(newHistory);
            localStorage.setItem('ledgerSearchHistory', JSON.stringify(newHistory));
          }
          
          setDbReadCount(prev => prev + 2); // 2 reads: employees + accounts
          
          // Debug search
          await LedgerService.debugSearch(orgID, searchInput);
          
          const results = await LedgerService.searchEmployeesAndAccounts(orgID, searchInput);
          console.log(`📊 Search completed. Found ${results.length} results:`, results);
          setFilteredEntities(results);
          
          // highlight animation for matched rows
          if (results.length > 0) {
            setHighlightedEntityId(results[0].id);
            setTimeout(() => setHighlightedEntityId(null), 1500);
          }
          setLoadingEntities(false);
        } catch (error) {
          console.error("❌ Search error:", error);
          toast.error("Failed to search employees and accounts");
          setLoadingEntities(false);
        }
      };

      fetchEntities();
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, selectedOrg, orgID, searchHistory]);


  // Handle entity selection
  const handleEntitySelect = useCallback(async (entity) => {
    setSelectedEntity(entity);
    await loadLedgerData(entity);
  }, []);

  // Load ledger data with read counting
  const loadLedgerData = useCallback(async (entity) => {
    if (!entity) return;

    setLoadingData(true);
    setError(null);

    try {
      let data;
      const readCount = entity.type === 'employee' ? 3 : 4; // Employee: 3 reads, Account: 4+ reads
      setDbReadCount(prev => prev + readCount);
      
      if (entity.type === 'employee') {
        data = await LedgerService.getEmployeeLedger(entity.id, orgID);
      } else {
        data = await LedgerService.getAccountLedger(entity.id, orgID);
      }
      
      setLedgerData(data);
    } catch (err) {
      setError("Failed to load ledger data");
      toast.error("Failed to load ledger data");
    } finally {
      setLoadingData(false);
    }
  }, [orgID]);



  // Handle export
  const handleExport = useCallback(() => {
    if (!ledgerData || !selectedEntity) return;
    
    try {
      LedgerService.exportToCSV(ledgerData.entries, ledgerData.summary, selectedEntity.name);
      toast.success("Ledger exported successfully");
    } catch (error) {
      toast.error("Failed to export ledger");
    }
  }, [ledgerData, selectedEntity]);

  // Handle search suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
    setSearchInput(suggestion);
    setShowSuggestions(false);
  }, []);

  // Clear search cache
  const handleClearCache = useCallback(() => {
    LedgerService.clearSearchCache();
    toast.success("Search cache cleared");
  }, []);

  // Clear search history
  const handleClearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('ledgerSearchHistory');
    toast.success("Search history cleared");
  }, []);

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedEntity(null);
    setSearchInput('');
    setFilteredEntities([]);
    setLedgerData(null);
    setError(null);
    setDbReadCount(0);
    setShowSuggestions(false);
  }, []);

  // Export balances function
  const handleExportBalances = useCallback(async () => {
    if (!orgID) {
      toast.error("Organization not selected");
      return;
    }

    try {
      setLoadingData(true);
      console.log('🔄 Starting balance export...');

      // Import Firestore functions
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');

      // Fetch all employees
      const employeesQuery = query(
        collection(db, "employees"),
        where("orgID", "==", orgID),
        where("isActive", "==", true)
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const employees = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${employees.length} active employees`);

      // Fetch all employee accounts
      const accountsQuery = query(
        collection(db, "employeeaccounts"),
        where("orgID", "==", orgID)
      );
      const accountsSnapshot = await getDocs(accountsQuery);
      const accounts = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${accounts.length} employee accounts`);

      // Prepare export data
      const exportData = [];

      // Add individual employees (those not in any account)
      const employeesInAccounts = new Set();
      accounts.forEach(account => {
        if (account.memberIds) {
          account.memberIds.forEach(memberId => {
            employeesInAccounts.add(memberId);
          });
        }
      });

      employees.forEach(employee => {
        if (!employeesInAccounts.has(employee.id)) {
          exportData.push({
            'S.No.': exportData.length + 1,
            'Name': employee.name || 'N/A',
            'Employee Tags': Array.isArray(employee.employeeTags) 
              ? employee.employeeTags.join(', ') 
              : (employee.employeeTags || 'N/A'),
            'Current Balance': employee.currentBalance ? (employee.currentBalance / 100).toFixed(2) : '0.00',
            'Type': 'Individual Employee',
            'Labour ID': employee.labourID || 'N/A'
          });
        }
      });

      // Add combined accounts
      accounts.forEach(account => {
        exportData.push({
          'S.No.': exportData.length + 1,
          'Name': account.name || 'N/A',
          'Employee Tags': 'Combined Account',
          'Current Balance': account.currentBalance ? (account.currentBalance / 100).toFixed(2) : '0.00',
          'Type': 'Combined Account',
          'Labour ID': `Account (${account.memberIds?.length || 0} members)`
        });
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 8 },   // S.No.
        { wch: 25 },  // Name
        { wch: 30 },  // Employee Tags
        { wch: 15 },  // Current Balance
        { wch: 18 },  // Type
        { wch: 20 }   // Labour ID
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Balances');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Employee_Balances_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      console.log(`✅ Exported ${exportData.length} employee/account records to Excel`);
      toast.success(`Exported ${exportData.length} employee/account balances to Excel`);

    } catch (error) {
      console.error('❌ Error exporting balances:', error);
      toast.error('Failed to export balances. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }, [orgID, toast]);

  return (
    <div className="apple-font">
      {/* Header */}
      <header className="header-container">
        <div className="back-button" onClick={handleBack}>←</div>
        <div>Unified Ledger</div>
        <div className={`role-badge ${isAdmin ? 'admin' : 'manager'}`}>
          {isAdmin ? "👑 Admin" : "👔 Manager"}
        </div>
      </header>

      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        {/* Export Balances Button */}
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <Button
            onClick={handleExportBalances}
            disabled={loadingData}
            className="export-balances-button"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              color: "white",
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loadingData ? "not-allowed" : "pointer",
              opacity: loadingData ? 0.7 : 1,
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
            }}
          >
            {loadingData ? (
              <>
                <Spinner size="sm" style={{ marginRight: "0.5rem" }} />
                Exporting...
              </>
            ) : (
              <>
                📊 Export Balances
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Controls */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Database Reads: <span className="font-semibold text-blue-600">{dbReadCount}</span>
            </div>
            <div className="text-sm text-gray-600">
              Cache: <span className="font-semibold text-green-600">Active</span>
            </div>
            <div className="text-sm text-gray-600">
              History: <span className="font-semibold text-purple-600">{searchHistory.length}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleClearCache} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              Clear Cache
            </Button>
            <Button 
              onClick={handleClearHistory} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              Clear History
            </Button>
            {dbReadCount > 0 && (
              <Button 
                onClick={() => setDbReadCount(0)} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                Reset Counter
              </Button>
            )}
          </div>
        </div>
        {/* Enhanced Search Bar */}
        <div className="search-container">
          <div className="relative">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search employees or accounts by name..."
              className="search-input"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="search-suggestions">
                <div className="suggestions-header">
                  <span className="text-xs text-gray-500">Recent searches</span>
                </div>
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="suggestion-item"
                  >
                    <span className="suggestion-icon">🕒</span>
                    <span className="suggestion-text">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {loadingEntities && (
          <div className="loading-spinner">
            <Spinner size="lg" />
          </div>
        )}

        {/* Search Results Cards */}
        {filteredEntities.length > 0 && (
          <div className="clients-container">
            <div className="clients-grid">
              {filteredEntities.map(entity => (
                <Card 
                  key={entity.id}
                  className={`client-card ${highlightedEntityId === entity.id ? 'highlighted' : ''}`}
                  onClick={() => handleEntitySelect(entity)}
                >
                  <div className="client-info">
                    <div className="client-name">{entity.name}</div>
                    <div className="client-phone">{entity.description || "—"}</div>
                    <div className="client-balance">
                      {entity.type === 'employee' ? '👤 Employee' : '🏢 Account'}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No results placeholder */}
        {
          !loadingEntities && searchInput && filteredEntities.length === 0 && (
            <div className="no-results">
              🔍 No entities found matching "{searchInput}".<br />Try another name or check spelling.
            </div>
          )
        }


        </div>

        {selectedEntity && (() => {
          // Date filter helper
          const isInRange = (date) => {
            if (!date) return false;
            const entryDate = new Date(date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && entryDate < start) return false;
            if (end && entryDate > end) return false;
            return true;
          };
          
          // Build ledger rows
          const ledgerRows = ledgerData?.entries
            ?.filter(row => isInRange(row.date))
            ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
            
          return (
            <div className="ledger-container">
              <div className="ledger-header">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntity(null)}
                  className="back-button"
                >
                  ← Back to Entity List
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
                    onClick={handleExport}
                    variant="outline"
                    className="button-neutral"
                    style={{ marginLeft: "1rem" }}
                  >
                    📁 Export CSV
                  </Button>
                </div>
                <div className="ledger-print-section">
                  <h3 className="ledger-title">
                    Ledger for {selectedEntity.name}
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
                      <div><strong>👤 Name:</strong> {selectedEntity.name}</div>
                      <div><strong>📋 Type:</strong> {selectedEntity.type === 'employee' ? 'Employee' : 'Account'}</div>
                      <div><strong>📊 Balance:</strong> ₹{LedgerService.formatMoney(ledgerData?.summary?.closingBalance || 0).toLocaleString()}</div>
                      <div><strong>🧾 Entries:</strong> {ledgerRows.length}</div>
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
                          let runningBalance = ledgerData?.summary?.openingBalance || 0;
                          return ledgerRows.map((entry, index) => {
                            // For opening balance entry, don't add the amount again
                            if (entry.type !== "opening") {
                              runningBalance += entry.amount;
                            }
                            return {
                              id: entry.id,
                              date: new Date(entry.date).toLocaleDateString("en-GB"),
                              type: entry.type === "opening" ? "💰 Opening" : entry.type === "credit" ? "⬆️ Credit" : "⬇️ Debit",
                              description: entry.description,
                              amount: `₹${LedgerService.formatMoney(entry.amount).toLocaleString()}`,
                              balance: `₹${LedgerService.formatMoney(runningBalance).toLocaleString()}`,
                              category: entry.category || "-",
                              member: entry.member || "-",
                              runningBalance: runningBalance,
                              entry: entry
                            };
                          });
                        })()}
                        columns={[
                          { key: 'date', header: 'Date' },
                          { key: 'type', header: 'Type' },
                          { key: 'description', header: 'Description' },
                          { key: 'member', header: 'Member' },
                          { key: 'amount', header: 'Amount' },
                          { key: 'balance', header: 'Balance' },
                          { key: 'category', header: 'Category' }
                        ]}
                        className="data-table"
                      />
                    </Card>
                    <Card className="summary-totals">
                      <div className="summary-row">
                        <span className="summary-label">Opening Balance</span>
                        <span className="summary-value">
                          ₹{LedgerService.formatMoney(ledgerData?.summary?.openingBalance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Total Credits</span>
                        <span className="summary-value">
                          ₹{LedgerService.formatMoney(ledgerData?.summary?.totalCredits || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Total Debits</span>
                        <span className="summary-value">
                          ₹{LedgerService.formatMoney(ledgerData?.summary?.totalDebits || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Closing Balance</span>
                        <span className={`summary-value ${
                          (() => {
                            const balance = ledgerData?.summary?.closingBalance || 0;
                            return balance < 0 ? 'negative' : balance > 0 ? 'positive' : '';
                          })()
                        }`}>
                          ₹{LedgerService.formatMoney(ledgerData?.summary?.closingBalance || 0).toLocaleString()}
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

export default LedgerPage;
