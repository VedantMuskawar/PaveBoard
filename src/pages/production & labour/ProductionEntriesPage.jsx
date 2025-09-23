import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../hooks/useAuth';
import { ProductionService } from '../../services/productionService';
import { EmployeeService } from '../../services/employeeService';
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
  DateRangeFilter,
  Badge,
  Divider,
  Input,
  SelectField,
  DatePicker
} from '../../components/ui';
import { toast } from 'react-hot-toast';
import './ProductionEntriesPage.css';

// Define types locally to avoid import issues
const ProductionConfig = {
  productionWage: 23000, // ₹230 per 1000 Nos (in paise)
  thappiWage: 12000, // ₹120 per 1000 Nos (in paise)
};

const WageAllocation = {
  employeeId: '',
  employeeName: '',
  unitCount: 0,
  wageAmount: 0,
  isManual: false
};

const ProductionBatchFormData = {
  batchNo: '',
  date: new Date(),
  cementBags: 0,
  productionQuantity: 0,
  thappiQuantity: 0,
  labourIds: [],
  splitRule: 'equal',
  wageAllocations: []
};

const ProductionEntriesPage = ({ onBack }) => {
  // Organization and auth context
  const { selectedOrganization: selectedOrg, isLoading: orgLoading } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const orgID = selectedOrg?.orgID || "";
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Database read count tracking
  const [readCount, setReadCount] = useState(0);
  
  // State management
  const [activeTab, setActiveTab] = useState('form');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    batchNo: '',
    date: new Date(),
    cementBags: 0,
    productionQuantity: 0,
    thappiQuantity: 0,
    labourIds: [],
    splitRule: 'equal'
  });

  const [wageAllocations, setWageAllocations] = useState([]);

  // Load initial data
  useEffect(() => {
    if (orgID) {
      loadInitialData();
    }
  }, [orgID]);

  // Create sample production employees if none exist
  const createSampleEmployees = async () => {
    setLoading(true);
    try {
      const sampleEmployees = [
        {
          name: "Rajesh Kumar",
          labourID: "EMP0001",
          employeeTags: ["production", "supervisor"],
          salaryTags: ["fixed"],
          salaryValue: 2500000, // ₹25,000 in paise
          bonusEligible: true,
          accountId: null,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          dateJoined: new Date('2024-01-01')
        },
        {
          name: "Suresh Singh",
          labourID: "EMP0002",
          employeeTags: ["production", "operator"],
          salaryTags: ["fixed"],
          salaryValue: 2000000, // ₹20,000 in paise
          bonusEligible: true,
          accountId: null,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          dateJoined: new Date('2024-01-01')
        },
        {
          name: "Amit Patel",
          labourID: "EMP0003",
          employeeTags: ["production", "helper"],
          salaryTags: ["fixed"],
          salaryValue: 1800000, // ₹18,000 in paise
          bonusEligible: false,
          accountId: null,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          dateJoined: new Date('2024-01-01')
        },
        {
          name: "Vikram Sharma",
          labourID: "EMP0004",
          employeeTags: ["production", "operator"],
          salaryTags: ["fixed"],
          salaryValue: 1900000, // ₹19,000 in paise
          bonusEligible: true,
          accountId: null,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          dateJoined: new Date('2024-01-01')
        }
      ];

      for (const employeeData of sampleEmployees) {
        await EmployeeService.createEmployee(orgID, employeeData, 'system');
      }

      toast.success('Sample production employees created successfully!');
      await loadInitialData();
    } catch (error) {
      toast.error('Error creating sample employees');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [employeesData, batchesData, configData] = await Promise.all([
        ProductionService.getProductionEmployees(orgID),
        ProductionService.getProductionBatches(orgID),
        ProductionService.getProductionConfig(orgID)
      ]);

      // Track database reads
      setReadCount(employeesData.length + batchesData.length + 1);

      // Deduplicate employees by ID to prevent duplicate keys
      const uniqueEmployees = employeesData.filter((emp, index, self) => 
        index === self.findIndex(e => e.id === emp.id)
      );
      
      setEmployees(uniqueEmployees);
      setBatches(batchesData);
      setConfig(configData);

      // Generate next batch number
      const nextBatchNo = await ProductionService.generateNextBatchNumber(orgID);
      setFormData(prev => ({ ...prev, batchNo: nextBatchNo }));

    } catch (error) {
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for better performance
  const totalWages = useMemo(() => {
    if (!config) return 0;
    return ProductionService.calculateTotalWages(
      formData.productionQuantity,
      formData.thappiQuantity,
      config
    );
  }, [formData.productionQuantity, formData.thappiQuantity, config]);

  const summaryData = useMemo(() => {
    const totalBatches = batches.length;
    const totalProduction = batches.reduce((sum, batch) => sum + batch.productionQuantity, 0);
    const totalThappi = batches.reduce((sum, batch) => sum + batch.thappiQuantity, 0);
    const totalWagesPaid = batches.reduce((sum, batch) => sum + batch.totalWages, 0);
    
    return {
      totalBatches,
      totalProduction,
      totalThappi,
      totalWagesPaid
    };
  }, [batches]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Recalculate wages when production quantities change
    if (['productionQuantity', 'thappiQuantity'].includes(field)) {
      recalculateWages();
    }
  };

  // Handle labour selection
  const handleLabourChange = (selectedIds) => {
    // Ensure selectedIds is always an array
    const idsArray = Array.isArray(selectedIds) ? selectedIds : [];
    setFormData(prev => ({ ...prev, labourIds: idsArray }));
    
    // Recalculate wage allocations
    if (idsArray.length > 0 && config) {
      const totalWages = ProductionService.calculateTotalWages(
        formData.productionQuantity,
        formData.thappiQuantity,
        config
      );
      
      const allocations = ProductionService.calculateEqualWages(
        totalWages,
        idsArray,
        employees
      );
      
      setWageAllocations(allocations);
    } else {
      setWageAllocations([]);
    }
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (employeeId, isChecked) => {
    let newLabourIds;
    if (isChecked) {
      newLabourIds = [...formData.labourIds, employeeId];
    } else {
      newLabourIds = formData.labourIds.filter(id => id !== employeeId);
    }
    handleLabourChange(newLabourIds);
  };

  // Recalculate wages based on current form data
  const recalculateWages = useCallback(() => {
    if (formData.labourIds.length > 0 && config) {
      const totalWages = ProductionService.calculateTotalWages(
        formData.productionQuantity,
        formData.thappiQuantity,
        config
      );
      
      const allocations = ProductionService.calculateEqualWages(
        totalWages,
        formData.labourIds,
        employees
      );
      
      setWageAllocations(allocations);
    }
  }, [formData.productionQuantity, formData.thappiQuantity, formData.labourIds, config, employees]);

  // Handle wage allocation changes
  const handleWageChange = (index, newAmount) => {
    const updatedAllocations = ProductionService.redistributeWages(
      wageAllocations,
      index,
      newAmount
    );
    setWageAllocations(updatedAllocations);
  };

  // Handle split rule change
  const handleSplitRuleChange = (rule) => {
    setFormData(prev => ({ ...prev, splitRule: rule }));
    
    if (rule === 'equal') {
      recalculateWages();
    }
  };

  // Validate form
  const validateForm = () => {
    if (!formData.batchNo.trim()) {
      toast.error('Batch number is required');
      return false;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return false;
    }
    if (formData.cementBags <= 0) {
      toast.error('Cement bags must be greater than 0');
      return false;
    }
    if (formData.productionQuantity <= 0 && formData.thappiQuantity <= 0) {
      toast.error('At least one production quantity is required');
      return false;
    }
    if (formData.labourIds.length === 0) {
      toast.error('At least one labour must be selected');
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const batchData = {
        ...formData,
        wageAllocations: wageAllocations.map(alloc => ({
          ...alloc,
          unitCount: Math.floor((formData.productionQuantity + formData.thappiQuantity) / formData.labourIds.length)
        }))
      };

      await ProductionService.createProductionBatch(
        orgID,
        batchData,
        user?.uid || 'system'
      );

      toast.success('Production batch created successfully!');
      
      // Reset form
      const nextBatchNo = await ProductionService.generateNextBatchNumber(orgID);
      setFormData({
        batchNo: nextBatchNo,
        date: new Date(),
        cementBags: 0,
        productionQuantity: 0,
        thappiQuantity: 0,
        labourIds: [],
        splitRule: 'equal'
      });
      setWageAllocations([]);
      
      // Reload batches
      await loadInitialData();

    } catch (error) {
      toast.error('Error creating production batch');
    } finally {
      setLoading(false);
    }
  };

  // View batch details
  const handleViewBatch = (batch) => {
    setSelectedBatch(batch);
    setShowBatchModal(true);
  };

  // Delete batch
  const handleDeleteBatch = async (batchId) => {
    setBatchToDelete(batchId);
    setShowDeleteModal(true);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    
    setLoading(true);
    try {
      await ProductionService.deleteProductionBatch(orgID, batchToDelete);
      toast.success('Batch deleted successfully');
      await loadInitialData();
    } catch (error) {
      toast.error('Error deleting batch');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setBatchToDelete(null);
    }
  };

  // Export batches
  const handleExportBatches = () => {
    const csvData = batches.map(batch => ({
      'Batch No': batch.batchNo,
      'Date': batch.date.toLocaleDateString(),
      'Cement Bags': batch.cementBags,
      'Production Qty': batch.productionQuantity,
      'Thappi Qty': batch.thappiQuantity,
      'Total Wages': ProductionService.formatMoney(batch.totalWages),
      'Labour Count': batch.labourDetails.length
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-batches-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Loading states
  if (orgLoading) {
    return (
      <DieselPage>
        <LoadingState variant="fullscreen" message="Loading organization data..." icon="🏢" />
      </DieselPage>
    );
  }

  if (!selectedOrg || !orgID) {
    return (
      <DieselPage>
        <LoadingState variant="fullscreen" message="Redirecting to organization selector..." icon="🏢" />
      </DieselPage>
    );
  }

  if (authLoading) {
    return (
      <DieselPage>
        <LoadingState variant="fullscreen" message="Loading user data..." icon="⏳" />
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader
        onBack={onBack || (() => window.history.back())}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
        readCount={readCount}
      />

      {/* Main Content Container */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem", width: "100%", boxSizing: "border-box" }}>
        {loading ? (
          <LoadingState variant="inline" message="Loading production data..." icon="⏳" />
        ) : (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" style={{ margin: "1.5rem 0" }}>
              {/* Total Batches Card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(10,132,255,0.1) 0%, rgba(10,132,255,0.05) 100%)",
                border: "1px solid rgba(10,132,255,0.2)",
                borderRadius: "16px",
                padding: "1.5rem",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(10,132,255,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(10,132,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(10,132,255,0.1)";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{
                    fontSize: "2rem",
                    marginRight: "0.75rem",
                    background: "rgba(10,132,255,0.1)",
                    padding: "0.5rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(10,132,255,0.2)"
                  }}>
                    📦
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
                      Total Batches
                    </h3>
                  </div>
                </div>
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#0A84FF",
                  textShadow: "0 2px 4px rgba(10,132,255,0.3)"
                }}>
                  {summaryData.totalBatches}
                </div>
              </div>
              
              {/* Total Production Card */}
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
                    🏭
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
                      Total Production
                    </h3>
                  </div>
                </div>
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#32D74B",
                  textShadow: "0 2px 4px rgba(50,215,75,0.3)"
                }}>
                  {summaryData.totalProduction.toLocaleString()} Nos
                </div>
              </div>
              
              {/* Total Thappi Card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(255,149,0,0.1) 0%, rgba(255,149,0,0.05) 100%)",
                border: "1px solid rgba(255,149,0,0.2)",
                borderRadius: "16px",
                padding: "1.5rem",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(255,149,0,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,149,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,149,0,0.1)";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{
                    fontSize: "2rem",
                    marginRight: "0.75rem",
                    background: "rgba(255,149,0,0.1)",
                    padding: "0.5rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,149,0,0.2)"
                  }}>
                    🔨
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
                      Total Thappi
                    </h3>
                  </div>
                </div>
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#FF9500",
                  textShadow: "0 2px 4px rgba(255,149,0,0.3)"
                }}>
                  {summaryData.totalThappi.toLocaleString()} Nos
                </div>
              </div>
              
              {/* Total Wages Paid Card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(175,82,222,0.1) 0%, rgba(175,82,222,0.05) 100%)",
                border: "1px solid rgba(175,82,222,0.2)",
                borderRadius: "16px",
                padding: "1.5rem",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(175,82,222,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(175,82,222,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(175,82,222,0.1)";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{
                    fontSize: "2rem",
                    marginRight: "0.75rem",
                    background: "rgba(175,82,222,0.1)",
                    padding: "0.5rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(175,82,222,0.2)"
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
                      Total Wages Paid
                    </h3>
                  </div>
                </div>
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#AF52DE",
                  textShadow: "0 2px 4px rgba(175,82,222,0.3)"
                }}>
                  {ProductionService.formatMoney(summaryData.totalWagesPaid)}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
              <FilterBar.Actions>
                <Button
                  variant={activeTab === 'form' ? 'primary' : 'outline'}
                  onClick={() => setActiveTab('form')}
                  size="md"
                >
                  📝 New Batch
                </Button>
                <Button
                  variant={activeTab === 'batches' ? 'primary' : 'outline'}
                  onClick={() => setActiveTab('batches')}
                  size="md"
                >
                  📊 View Batches ({batches.length})
                </Button>
              </FilterBar.Actions>
            </FilterBar>

      {/* Form Tab */}
      {activeTab === 'form' && (
        <Card className="form-card">
          <form onSubmit={handleSubmit} className="production-form">
            <div className="form-grid">
              {/* Basic Information */}
              <div className="form-section">
                <h3>📋 Batch Information</h3>
                <div className="form-row">
                  <Input
                    label="Batch Number"
                    value={formData.batchNo}
                    onChange={(e) => handleInputChange('batchNo', e.target.value)}
                    required
                    placeholder="e.g., B202401001"
                  />
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={(date) => handleInputChange('date', date)}
                    required
                  />
                </div>
                <div className="form-row">
                  <Input
                    label="Cement Bags"
                    type="number"
                    value={formData.cementBags}
                    onChange={(e) => handleInputChange('cementBags', parseInt(e.target.value) || 0)}
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Production Quantities */}
              <div className="form-section">
                <h3>🏭 Production Quantities</h3>
                <div className="form-row">
                  <Input
                    label="Production Quantity (Nos)"
                    type="number"
                    value={formData.productionQuantity}
                    onChange={(e) => handleInputChange('productionQuantity', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="0"
                  />
                  <Input
                    label="Thappi Quantity (Nos)"
                    type="number"
                    value={formData.thappiQuantity}
                    onChange={(e) => handleInputChange('thappiQuantity', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Labour Selection */}
              <div className="form-section">
                <h3>👷‍♂️ Select Labours</h3>
                {employees.length === 0 ? (
                  <div className="no-employees-message">
                    <p>No production employees found. You need to create employees with "production" tag first.</p>
                    <Button onClick={createSampleEmployees} disabled={loading}>
                      {loading ? 'Creating...' : 'Create Sample Production Employees'}
                    </Button>
                  </div>
                ) : (
                  <div className="labour-selection">
                    <label className="form-label">Production Labours *</label>
                    <div className="checkbox-grid">
                      {employees.map((emp, index) => (
                        <div key={`${emp.id}-${index}-${emp.labourID}`} className="checkbox-item">
                          <input
                            type="checkbox"
                            id={`labour-${emp.id}-${index}`}
                            checked={formData.labourIds.includes(emp.id)}
                            onChange={(e) => handleCheckboxChange(emp.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`labour-${emp.id}-${index}`} className="checkbox-label">
                            <span className="employee-name">{emp.name}</span>
                            <span className="employee-id">({emp.labourID})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.labourIds.length === 0 && (
                      <p className="error-text">Please select at least one labour</p>
                    )}
                  </div>
                )}
              </div>

              {/* Wage Configuration */}
              {formData.labourIds.length > 0 && config && (
                <div className="form-section">
                  <h3>💰 Wage Configuration</h3>
                  <div className="wage-summary">
                    <div className="wage-info">
                      <span>Total Wages: {ProductionService.formatMoney(
                        ProductionService.calculateTotalWages(
                          formData.productionQuantity,
                          formData.thappiQuantity,
                          config
                        )
                      )}</span>
                      <span>Rate: {ProductionService.formatMoney(config.productionWage)}/1000 Nos (Production), {ProductionService.formatMoney(config.thappiWage)}/1000 Nos (Thappi)</span>
                    </div>
                    <SelectField
                      label="Split Rule"
                      value={formData.splitRule}
                      onChange={handleSplitRuleChange}
                      options={[
                        { value: 'equal', label: 'Equal Split' },
                        { value: 'manual', label: 'Manual Adjustment' }
                      ]}
                    />
                  </div>

                  {/* Wage Allocations Table */}
                  {wageAllocations.length > 0 && (
                    <div className="wage-allocations">
                      <h4>Wage Allocations</h4>
                      <div className="allocations-table">
                        <div className="table-header">
                          <span>Labour Name</span>
                          <span>Unit Count</span>
                          <span>Wage Amount</span>
                        </div>
                        {wageAllocations.map((allocation, index) => (
                          <div key={`${allocation.employeeId}-${index}-wage`} className="table-row">
                            <span>{allocation.employeeName}</span>
                            <span>{allocation.unitCount}</span>
                            <div className="wage-input">
                              <Input
                                type="number"
                                value={allocation.wageAmount / 100}
                                onChange={(e) => handleWageChange(index, ProductionService.parseMoney(e.target.value))}
                                disabled={formData.splitRule === 'equal'}
                                step="0.01"
                                min="0"
                              />
                              <span className="currency">₹</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="form-actions">
                <Button
                  type="submit"
                  disabled={loading || formData.labourIds.length === 0}
                  className="submit-button"
                >
                  {loading ? 'Creating...' : 'Create Production Batch'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

            {/* Batches Tab */}
            {activeTab === 'batches' && (
              <Card style={{ marginTop: "1rem" }}>
                {/* Data Table */}
                <DataTable
                  columns={[
                    { key: 'batchNo', header: 'Batch No' },
                    { key: 'date', header: 'Date', render: (row) => row.date.toLocaleDateString() },
                    { key: 'cementBags', header: 'Cement Bags' },
                    { key: 'productionQuantity', header: 'Production (Nos)' },
                    { key: 'thappiQuantity', header: 'Thappi (Nos)' },
                    { key: 'totalWages', header: 'Total Wages', render: (row) => ProductionService.formatMoney(row.totalWages) },
                    { key: 'labourCount', header: 'Labours', render: (row) => row.labourDetails.length },
                    { 
                      key: 'actions', 
                      header: 'Actions', 
                      render: (row) => (
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                          <Button
                            onClick={() => handleViewBatch(row)}
                            variant="outline"
                            size="sm"
                          >
                            👁️ View
                          </Button>
                          <Button
                            onClick={() => handleDeleteBatch(row.id)}
                            variant="outline"
                            size="sm"
                            style={{ color: "#ff4444", borderColor: "#ff4444" }}
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      )
                    }
                  ]}
                  data={batches}
                  showSummary={true}
                  summaryData={{
                    label: "Total Batches",
                    value: `${batches.length} batches`
                  }}
                  emptyMessage="No production batches found"
                />
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      {showBatchModal && selectedBatch && (
        <Modal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          title={`Batch Details - ${selectedBatch.batchNo}`}
          size="lg"
        >
          <div className="batch-details-modal">
            <div className="modal-section">
              <h4>📋 Batch Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Batch Number:</span>
                  <span>{selectedBatch.batchNo}</span>
                </div>
                <div className="detail-item">
                  <span>Date:</span>
                  <span>{selectedBatch.date.toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span>Cement Bags:</span>
                  <span>{selectedBatch.cementBags}</span>
                </div>
                <div className="detail-item">
                  <span>Production Quantity:</span>
                  <span>{selectedBatch.productionQuantity} Nos</span>
                </div>
                <div className="detail-item">
                  <span>Thappi Quantity:</span>
                  <span>{selectedBatch.thappiQuantity} Nos</span>
                </div>
                <div className="detail-item">
                  <span>Total Wages:</span>
                  <span className="wage-amount">
                    {ProductionService.formatMoney(selectedBatch.totalWages)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h4>👷‍♂️ Labour Details</h4>
              <div className="labour-table">
                <div className="table-header">
                  <span>Name</span>
                  <span>Unit Count</span>
                  <span>Wage Amount</span>
                </div>
                {selectedBatch.labourDetails.map((labour, index) => (
                  <div key={`${labour.id}-${index}-detail`} className="table-row">
                    <span>{labour.name}</span>
                    <span>{labour.unitCount}</span>
                    <span className="wage-amount">
                      {ProductionService.formatMoney(labour.wageAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <PositionedConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteBatch}
        title="Delete Production Batch"
        message="Are you sure you want to delete this batch? This will also delete associated wage entries and revert employee balances."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="⚠️"
      />
    </DieselPage>
  );
};

export default ProductionEntriesPage;
