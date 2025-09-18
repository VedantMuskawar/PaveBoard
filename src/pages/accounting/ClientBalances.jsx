import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Import UI Components following app patterns
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  SummaryCard,
  DataTable,
  ExportButton,
  LoadingState,
  EmptyState,
  Card,
  Input
} from '../../components/ui';

import './ClientBalances.css';

const ClientBalances = ({ onBack }) => {
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control (following app patterns)
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  const roleDisplay = isAdmin ? "👑 Admin" : "👔 Manager";
  
  // Get organization details
  const orgID = selectedOrg?.orgID;
  
  // State management
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      toast.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  // Fetch clients with negative balances (default view)
  const fetchNegativeBalanceClients = useCallback(async () => {
    if (!orgID) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching clients with negative balances for orgID:', orgID);
      
      const q = query(
        collection(db, "CLIENTS"),
        where("orgID", "==", orgID),
        where("totalBalance", "<", 0),
        orderBy("totalBalance", "asc") // Most negative first
      );
      
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Fetched negative balance clients:', clientsData.length);
      setClients(clientsData);
      setFilteredClients(clientsData);
      
    } catch (error) {
      console.error('❌ Error fetching negative balance clients:', error);
      setError('Failed to fetch client balances. Please try again.');
      toast.error('Failed to fetch client balances');
    } finally {
      setLoading(false);
    }
  }, [orgID]);

  // Search all clients (when search is active)
  const searchAllClients = useCallback(async (searchTerm) => {
    if (!orgID || !searchTerm.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Searching all clients for:', searchTerm);
      
      // Query all clients for the organization (not limited by balance)
      const q = query(
        collection(db, "CLIENTS"),
        where("orgID", "==", orgID),
        orderBy("name", "asc")
      );
      
      const snapshot = await getDocs(q);
      const allClients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by search term (client-side filtering for name)
      const searchResults = allClients.filter(client => 
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber?.includes(searchTerm)
      );
      
      console.log('✅ Search results:', searchResults.length, 'clients found');
      setClients(searchResults);
      setFilteredClients(searchResults);
      
    } catch (error) {
      console.error('❌ Error searching clients:', error);
      setError('Failed to search clients. Please try again.');
      toast.error('Failed to search clients');
    } finally {
      setLoading(false);
    }
  }, [orgID]);

  // Handle search input changes
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    
    if (value.trim()) {
      setIsSearchMode(true);
      // Debounce search
      const timeoutId = setTimeout(() => {
        searchAllClients(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Search cleared - revert to negative balance view
      setIsSearchMode(false);
      fetchNegativeBalanceClients();
    }
  }, [searchAllClients, fetchNegativeBalanceClients]);

  // Initial data load
  useEffect(() => {
    fetchNegativeBalanceClients();
  }, [fetchNegativeBalanceClients]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalClients = filteredClients.length;
    const totalOutstanding = filteredClients.reduce((sum, client) => 
      sum + Math.abs(client.totalBalance || 0), 0
    );
    const avgBalance = totalClients > 0 ? totalOutstanding / totalClients : 0;
    
    return {
      totalClients,
      totalOutstanding,
      avgBalance
    };
  }, [filteredClients]);

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  // Export to Excel functionality
  const handleExportToExcel = useCallback(() => {
    if (filteredClients.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredClients.map((client, index) => ({
        'S.No.': index + 1,
        'Client Name': client.name || 'N/A',
        'Phone Number': client.phoneNumber || 'N/A',
        'Total Balance': client.totalBalance || 0,
        'Outstanding Amount': Math.abs(client.totalBalance || 0),
        'Total Revenue': client.totalRevenue || 0,
        'Cash from Orders': client.totalCashFromOrders || 0,
        'Credit from Orders': client.totalCreditFromOrders || 0,
        'Debit from Transactions': client.totalDebitFromTransactions || 0,
        'Credit from Transactions': client.totalCreditFromTransactions || 0
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 8 },  // S.No.
        { wch: 25 }, // Client Name
        { wch: 15 }, // Phone Number
        { wch: 15 }, // Total Balance
        { wch: 18 }, // Outstanding Amount
        { wch: 15 }, // Total Revenue
        { wch: 18 }, // Cash from Orders
        { wch: 20 }, // Credit from Orders
        { wch: 22 }, // Debit from Transactions
        { wch: 22 }  // Credit from Transactions
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Client Balances');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Client_Balances_${isSearchMode ? 'Search_Results' : 'Negative_Balances'}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Exported ${filteredClients.length} client records to Excel`);
      
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      toast.error('Failed to export data. Please try again.');
    }
  }, [filteredClients, isSearchMode]);

  // Define table columns
  const columns = [
    {
      key: 'name',
      header: 'Client Name',
      align: 'left',
      render: (client) => (
        <div className="font-medium text-white">
          {client.name || 'N/A'}
        </div>
      )
    },
    {
      key: 'phoneNumber',
      header: 'Phone Number',
      align: 'left',
      render: (client) => (
        <div className="text-gray-300">
          {client.phoneNumber || 'N/A'}
        </div>
      )
    },
    {
      key: 'totalBalance',
      header: 'Total Balance',
      align: 'right',
      render: (client) => (
        <div className={`font-bold ${
          (client.totalBalance || 0) < 0 ? 'text-red-400' : 'text-green-400'
        }`}>
          {(client.totalBalance || 0) < 0 ? '-' : ''}{formatCurrency(client.totalBalance || 0)}
        </div>
      )
    },
    // Admin-only: Settle action placeholder
    ...(isAdmin ? [{
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (client) => (
        <div className="flex justify-center">
          <button
            className="px-3 py-1 text-xs bg-gray-600 text-gray-400 rounded cursor-not-allowed"
            disabled
            title="Settle action - Coming soon"
          >
            Settle
          </button>
        </div>
      )
    }] : [])
  ];

  if (loading && filteredClients.length === 0) {
    return (
      <DieselPage>
        <PageHeader
          onBack={onBack || (() => window.history.back())}
          role={userRole}
          roleDisplay={roleDisplay}
        />
        <div style={{ marginTop: "1.5rem", padding: "0 2rem 2rem 2rem" }}>
          <LoadingState message="Loading client balances..." />
        </div>
      </DieselPage>
    );
  }

  if (error) {
    return (
      <DieselPage>
        <PageHeader
          onBack={onBack || (() => window.history.back())}
          role={userRole}
          roleDisplay={roleDisplay}
        />
        <div style={{ marginTop: "1.5rem", padding: "0 2rem 2rem 2rem" }}>
          <EmptyState 
            message={error}
            action={fetchNegativeBalanceClients}
            actionLabel="Retry"
          />
        </div>
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader
        onBack={onBack || (() => window.history.back())}
        role={userRole}
        roleDisplay={roleDisplay}
      />

        <div style={{ marginTop: "1.5rem", padding: "0 2rem 2rem 2rem" }}>
        {/* Filter Bar with Search */}
        <FilterBar style={{ marginBottom: "2rem" }}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search by client name or phone..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
              {isSearchMode && (
                <p className="text-xs text-gray-400 mt-1">
                  Searching all clients (not limited by balance)
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <ExportButton
                onClick={handleExportToExcel}
                disabled={filteredClients.length === 0}
                exportType="excel"
              >
                Export to Excel
              </ExportButton>
            </div>
          </div>
        </FilterBar>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <SummaryCard
            title="Total Clients"
            value={summaryStats.totalClients}
            valueColor="#00c3ff"
            icon="👥"
          />
          <SummaryCard
            title="Total Outstanding"
            value={formatCurrency(summaryStats.totalOutstanding)}
            valueColor="#ff4444"
            icon="💸"
          />
          <SummaryCard
            title="Average Balance"
            value={formatCurrency(summaryStats.avgBalance)}
            valueColor="#ffa500"
            icon="📊"
          />
        </div>

        {/* Main Content */}
        <Card style={{ marginTop: "1rem" }}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {isSearchMode 
                  ? `Search Results (${filteredClients.length})` 
                  : `Clients with Negative Balances (${filteredClients.length})`
                }
              </h2>
              {loading && (
                <div className="text-sm text-gray-400">Loading...</div>
              )}
            </div>

            {filteredClients.length === 0 ? (
              <EmptyState 
                message={isSearchMode 
                  ? "No clients found matching your search." 
                  : "No clients with negative balances found."
                }
                action={isSearchMode ? undefined : fetchNegativeBalanceClients}
                actionLabel={isSearchMode ? undefined : "Refresh"}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredClients}
                loading={loading}
                emptyMessage="No client data available"
                className="client-balances-table"
              />
            )}
          </div>
        </Card>
      </div>
    </DieselPage>
  );
};

export default ClientBalances;
