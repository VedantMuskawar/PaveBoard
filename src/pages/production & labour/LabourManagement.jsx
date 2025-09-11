import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-hot-toast";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";

// Import services
import { EmployeeService } from "../../services/employeeService";

// Import UI components
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  Button,
  Badge,
  Card,
  Spinner,
  LoadingState,
  EmptyState,
  DataTable,
  Modal,
  Input,
  SelectField,
  ConfirmationModal
} from "../../components/ui";

// Import sub-components
import EmployeeForm from './components/EmployeeForm';
import AccountWizard from './components/AccountWizard';
import AccountDetails from './components/AccountDetails';

import './LabourManagement.css';

function LabourManagement({ onBack }) {
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg } = useOrganization();
  const { user } = useAuth();
  
  // Get organization details
  const orgID = selectedOrg?.orgID;
  const isAdmin = selectedOrg?.role === 0; // 0 = Admin, 1 = Manager

  // State management
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Database read count tracking
  const [readCount, setReadCount] = useState(0);
  
  // Modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAccountWizard, setShowAccountWizard] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form states
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  // Load employees on component mount
  useEffect(() => {
    if (orgID) {
      fetchEmployees();
    }
  }, [orgID]);


  // Filter employees based on search and filter criteria
  useEffect(() => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.labourID.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(employee =>
        employee.employeeTags.includes(tagFilter)
      );
    }

    // Account filter
    if (accountFilter) {
      if (accountFilter === 'with-account') {
        filtered = filtered.filter(employee => employee.accountId);
      } else if (accountFilter === 'without-account') {
        filtered = filtered.filter(employee => !employee.accountId);
      } else if (accountFilter !== 'all') {
        filtered = filtered.filter(employee => employee.accountId === accountFilter);
      }
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, tagFilter, accountFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await EmployeeService.getEmployees(orgID);
      setEmployees(data);
      setReadCount(data.length);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Failed to fetch employees");
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeModal(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const confirmDeleteEmployee = async () => {
    try {
      await EmployeeService.deleteEmployee(employeeToDelete.id);
      toast.success("Employee deleted successfully");
      await fetchEmployees();
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const handleCreateAccount = () => {
    setShowAccountWizard(true);
  };

  const handleViewAccount = (accountId) => {
    setSelectedAccount(accountId);
    setShowAccountDetails(true);
  };

  const handleEmployeeSaved = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const handleAccountCreated = () => {
    setShowAccountWizard(false);
    fetchEmployees();
  };

  // Get unique tags for filter dropdown
  const availableTags = useMemo(() => {
    const tags = new Set();
    employees.forEach(employee => {
      employee.employeeTags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [employees]);

  // Get accounts for filter dropdown
  const availableAccounts = useMemo(() => {
    const accounts = new Set();
    employees.forEach(employee => {
      if (employee.accountId && employee.accountName) {
        accounts.add(JSON.stringify({ id: employee.accountId, name: employee.accountName }));
      }
    });
    return Array.from(accounts).map(acc => JSON.parse(acc));
  }, [employees]);

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      header: '👤 Employee Details',
      render: (employee) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "32px",
            height: "32px",
            background: "linear-gradient(135deg, #0A84FF, #0066CC)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "600",
            fontSize: "0.875rem"
          }}>
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#f5f5f7" }}>{employee.name}</div>
            <div style={{ fontSize: "0.875rem", color: "#9ba3ae" }}>ID: {employee.labourID}</div>
          </div>
        </div>
      )
    },
    {
      key: 'tags',
      header: '🏷️ Tags',
      render: (employee) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {employee.employeeTags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              style={{ 
                fontSize: "0.75rem",
                background: "rgba(142,142,147,0.2)",
                border: "1px solid rgba(142,142,147,0.4)",
                color: "#8e8e93"
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'account',
      header: '🏦 Account',
      render: (employee) => (
        <div>
          {employee.accountName ? (
            <div>
              <div style={{ fontWeight: "600", color: "#0A84FF" }}>{employee.accountName}</div>
              <div style={{ fontSize: "0.875rem", color: "#9ba3ae" }}>{employee.accountType}</div>
            </div>
          ) : (
            <span style={{ color: "#8e8e93" }}>Individual</span>
          )}
        </div>
      )
    },
    {
      key: 'balance',
      header: '💳 Balance',
      render: (employee) => (
        <div>
          <div style={{ fontWeight: "600", color: "#f5f5f7" }}>₹{EmployeeService.formatMoney(employee.currentBalance)}</div>
          <div style={{ fontSize: "0.875rem", color: "#9ba3ae" }}>
            Opening: ₹{EmployeeService.formatMoney(employee.openingBalance)}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: '📊 Status',
      render: (employee) => (
        <Badge 
          variant={employee.isActive ? 'success' : 'danger'}
          style={{
            background: employee.isActive 
              ? "rgba(50,215,75,0.14)" 
              : "rgba(255,69,58,0.18)",
            border: employee.isActive 
              ? "1px solid rgba(50,215,75,0.35)" 
              : "1px solid rgba(255,69,58,0.45)",
            color: employee.isActive ? "#32D74B" : "#FF453A",
            fontWeight: "700",
            fontSize: "0.85rem"
          }}
        >
          {employee.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Actions',
      render: (employee) => (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditEmployee(employee)}
          >
            ✏️ Edit
          </Button>
          {employee.accountId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewAccount(employee.accountId)}
            >
              🏦 Account
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteEmployee(employee)}
          >
            🗑️ Delete
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <DieselPage>
        <LoadingState variant="fullscreen" message="Loading employees..." icon="👷‍♂️" />
      </DieselPage>
    );
  }

  if (error) {
    return (
      <DieselPage>
        <PageHeader 
          title="Labour Management" 
          onBack={onBack}
          role={isAdmin ? "admin" : "manager"}
          roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
        />
        <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
          <Card style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ color: "#ff4444", fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem" }}>Error</div>
            <div style={{ color: "#9ba3ae", marginBottom: "1.5rem" }}>{error}</div>
            <Button onClick={fetchEmployees}>Retry</Button>
          </Card>
        </div>
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader 
        title="Labour Management" 
        onBack={onBack}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      />

      {/* Summary Cards */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "1.5rem", 
          marginBottom: "2rem" 
        }}>
          {/* Total Employees Card */}
          <Card style={{
            background: "linear-gradient(135deg, rgba(10,132,255,0.1) 0%, rgba(10,132,255,0.05) 100%)",
            border: "1px solid rgba(10,132,255,0.2)",
            borderRadius: "16px",
            padding: "1.5rem",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(10,132,255,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{
                fontSize: "2rem",
                marginRight: "0.75rem",
                background: "rgba(10,132,255,0.1)",
                padding: "0.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(10,132,255,0.2)"
              }}>
                👷‍♂️
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
                  Total Employees
                </h3>
              </div>
            </div>
            <div style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#0A84FF",
              textShadow: "0 2px 4px rgba(10,132,255,0.3)"
            }}>
              {employees.length}
            </div>
          </Card>

          {/* With Accounts Card */}
          <Card style={{
            background: "linear-gradient(135deg, rgba(50,215,75,0.1) 0%, rgba(50,215,75,0.05) 100%)",
            border: "1px solid rgba(50,215,75,0.2)",
            borderRadius: "16px",
            padding: "1.5rem",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(50,215,75,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{
                fontSize: "2rem",
                marginRight: "0.75rem",
                background: "rgba(50,215,75,0.1)",
                padding: "0.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(50,215,75,0.2)"
              }}>
                🏦
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
                  With Accounts
                </h3>
              </div>
            </div>
            <div style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#32D74B",
              textShadow: "0 2px 4px rgba(50,215,75,0.3)"
            }}>
              {employees.filter(emp => emp.accountId).length}
            </div>
          </Card>

          {/* Total Balance Card */}
          <Card style={{
            background: "linear-gradient(135deg, rgba(175,82,222,0.1) 0%, rgba(175,82,222,0.05) 100%)",
            border: "1px solid rgba(175,82,222,0.2)",
            borderRadius: "16px",
            padding: "1.5rem",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(175,82,222,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}>
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
                  Total Balance
                </h3>
              </div>
            </div>
            <div style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#AF52DE",
              textShadow: "0 2px 4px rgba(175,82,222,0.3)"
            }}>
              ₹{EmployeeService.formatMoney(employees.reduce((sum, emp) => sum + emp.currentBalance, 0))}
            </div>
          </Card>

          {/* Combined Accounts Card */}
          <Card style={{
            background: "linear-gradient(135deg, rgba(255,149,0,0.1) 0%, rgba(255,149,0,0.05) 100%)",
            border: "1px solid rgba(255,149,0,0.2)",
            borderRadius: "16px",
            padding: "1.5rem",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(255,149,0,0.1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{
                fontSize: "2rem",
                marginRight: "0.75rem",
                background: "rgba(255,149,0,0.1)",
                padding: "0.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(255,149,0,0.2)"
              }}>
                🏢
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
                  Combined Accounts
                </h3>
              </div>
            </div>
            <div style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#FF9500",
              textShadow: "0 2px 4px rgba(255,149,0,0.3)"
            }}>
              {availableAccounts.length}
            </div>
          </Card>
        </div>
      </div>
          
      {/* Filter Bar */}
      <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <FilterBar.Actions>
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "200px" }}
          />
          <SelectField
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ width: "150px" }}
            placeholder="Filter by Tag"
          >
            <option value="">🏷️ All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </SelectField>
          <SelectField
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={{ width: "180px" }}
            placeholder="Filter by Account"
          >
            <option value="all">🏦 All Accounts</option>
            <option value="with-account">✅ With Account</option>
            <option value="without-account">❌ Without Account</option>
            {availableAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </SelectField>
        </FilterBar.Actions>
        <FilterBar.Actions>
          <Button onClick={handleAddEmployee}>
            ➕ Add Employee
          </Button>
          <Button onClick={handleCreateAccount} variant="outline">
            🏦 Create Account
          </Button>
        </FilterBar.Actions>
      </FilterBar>

      {/* Data Table */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <Card style={{ padding: "1.5rem" }}>
          {filteredEmployees.length === 0 ? (
            <EmptyState
              title="No employees found"
              description="Try adjusting your search or filters"
              action={
                <Button onClick={handleAddEmployee}>
                  Add First Employee
                </Button>
              }
            />
          ) : (
            <DataTable
              data={filteredEmployees}
              columns={columns}
              searchable={false} // We handle search in filters
            />
          )}
        </Card>
      </div>

      {/* Modals */}
      {showEmployeeModal && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={() => setShowEmployeeModal(false)}
          onSave={handleEmployeeSaved}
          orgID={orgID}
          createdBy={user?.uid}
        />
      )}

      {showAccountWizard && (
        <AccountWizard
          employees={employees.filter(emp => emp.isActive && !emp.accountId)}
          onClose={() => setShowAccountWizard(false)}
          onSave={handleAccountCreated}
          orgID={orgID}
          createdBy={user?.uid}
        />
      )}

      {showAccountDetails && selectedAccount && (
        <AccountDetails
          accountId={selectedAccount}
          onClose={() => setShowAccountDetails(false)}
          onUpdate={fetchEmployees}
          orgID={orgID}
        />
      )}

      {showDeleteModal && employeeToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Employee"
          message={`Are you sure you want to delete ${employeeToDelete.name}? This action cannot be undone and will permanently remove all employee data.`}
          onConfirm={confirmDeleteEmployee}
          onCancel={() => setShowDeleteModal(false)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}
    </DieselPage>
  );
}

export default LabourManagement;
