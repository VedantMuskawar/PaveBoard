import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-hot-toast";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
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
  DieselPage
} from "../../components/ui";
import './VendorManagement.css';

const VendorManagement = ({ onBack }) => {
  // Auth context
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  // State
  const [activeTab, setActiveTab] = useState("vendor-list");
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorLedger, setVendorLedger] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [vName, setVName] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vAddress, setVAddress] = useState("");
  const [vType, setVType] = useState("raw_material");
  const [vOpeningBalance, setVOpeningBalance] = useState(0);
  
  // Search and filter states
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState(null);
  
  // Constants
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  const orgName = selectedOrg?.orgName || "LIT";
  
  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  // Effects
  useEffect(() => {
    if (selectedOrg) {
      fetchVendors();
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedVendorForLedger) {
      fetchVendorLedger(selectedVendorForLedger.id);
    }
  }, [selectedVendorForLedger]);

  // Check user role
  useEffect(() => {
    if (selectedOrg) {
      const userRole = selectedOrg.role || 0;
      const roleNumber = Number(userRole);
      
      setIsAdmin(roleNumber === 0);
      setIsManager(roleNumber === 1);
      
      console.log('🔐 Role Detection:', {
        orgRole: selectedOrg.role,
        userRole: userRole,
        roleNumber: roleNumber,
        isAdmin: roleNumber === 0,
        isManager: roleNumber === 1
      });
    }
  }, [selectedOrg]);

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      const q = query(
        collection(db, "VENDORS"),
        where("orgID", "==", orgID),
        orderBy("name", "asc")
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendors(rows);
        if (rows.length && !selectedVendorForLedger) {
          setSelectedVendorForLedger(rows[0]);
        }
      }, (error) => {
        console.error("Error fetching vendors:", error);
        toast.error("Failed to fetch vendors");
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to fetch vendors");
    }
  };

  // Fetch vendor ledger
  const fetchVendorLedger = async (vendorID) => {
    if (!vendorID) return;
    
    try {
      const q = query(
        collection(db, "PROCUREMENT_LEDGER"),
        where("orgID", "==", orgID),
        where("vendorID", "==", vendorID)
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendorLedger(rows);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching vendor ledger:", error);
      toast.error("Failed to fetch vendor ledger");
    }
  };

  // Handle add/edit vendor
  const handleSubmitVendor = async (e) => {
    e.preventDefault();
    try {
      if (!vName?.trim()) {
        toast.error("Vendor name required");
        return;
      }

      if (isEditing && selectedVendor) {
        // Update existing vendor
        const vendorRef = doc(db, "VENDORS", selectedVendor.id);
        await updateDoc(vendorRef, {
          name: vName.trim(),
          type: vType,
          phone: vPhone || "",
          address: vAddress || "",
          updatedAt: serverTimestamp(),
        });
        
        toast.success("Vendor updated successfully");
      } else {
        // Add new vendor
        const vendorData = {
          name: vName.trim(),
          type: vType,
          phone: vPhone || "",
          address: vAddress || "",
          openingBalance: Number(vOpeningBalance) || 0,
          currentBalance: Number(vOpeningBalance) || 0,
          orgID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "VENDORS"), vendorData);
        const vendorID = docRef.id;

        // Update the vendor document with the vendorID
        await updateDoc(docRef, {
          vendorID: vendorID
        });

        // Add opening balance to ledger if any
        if (Number(vOpeningBalance)) {
          await addDoc(collection(db, "PROCUREMENT_LEDGER"), {
            vendorID: vendorID,
            vendorName: vendorData.name,
            category: vType === "raw_material" ? "RAW_MATERIAL" : "CONSUMABLES",
            transactionType: Number(vOpeningBalance) >= 0 ? "credit" : "debit",
            amount: Math.abs(Number(vOpeningBalance)),
            quantity: 0,
            balance: Number(vOpeningBalance),
            referenceType: "opening_balance",
            referenceID: vendorID,
            description: "Opening balance",
            orgID,
            date: serverTimestamp(),
            createdAt: serverTimestamp(),
          });
        }
        
        toast.success("Vendor added successfully");
      }

      // Reset form
      resetForm();
      setShowVendorModal(false);
      
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save vendor");
    }
  };

  // Handle delete vendor
  const handleDeleteVendor = async (vendor) => {
    try {
      await deleteDoc(doc(db, "VENDORS", vendor.id));
      toast.success("Vendor deleted successfully");
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor");
    }
  };

  // Handle edit vendor
  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setVName(vendor.name);
    setVPhone(vendor.phone || "");
    setVAddress(vendor.address || "");
    setVType(vendor.type);
    setVOpeningBalance(vendor.openingBalance || 0);
    setIsEditing(true);
    setShowVendorModal(true);
  };

  // Reset form
  const resetForm = () => {
    setVName("");
    setVPhone("");
    setVAddress("");
    setVType("raw_material");
    setVOpeningBalance(0);
    setSelectedVendor(null);
    setIsEditing(false);
  };

  // Close modal
  const closeModal = () => {
    setShowVendorModal(false);
    resetForm();
  };

  // Filtered vendors
  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.phone?.includes(vendorSearch) ||
    v.address?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // Helper functions
  const currency = (n) => new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

  const getVendorTypeLabel = (type) => {
    const labels = {
      raw_material: "Raw Material",
      consumables: "Consumables",
      both: "Both"
    };
    return labels[type] || type;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <DieselPage>
      {/* Header */}
      <PageHeader 
        title="🏢 Vendor Management"
        onBack={onBack || (() => window.history.back())}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      />

      {/* Main content container */}
      <div className="w-full" style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
            <div className="space-y-8">
          <div className="tabs-container">
            {[
              ["vendor-list", "🏢 Vendor List"],
              ["ledger", "📋 Vendor Ledger"],
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

          {/* VENDOR LIST TAB */}
          {activeTab === "vendor-list" && (
                <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-100 tracking-tight leading-tight flex items-center gap-3 mb-2">
                        <span className="text-3xl filter drop-shadow-lg">🏢</span>
                        <span className="text-gray-200 font-semibold">Vendor List</span>
                      </h2>
                      <p className="text-gray-400 text-sm">Manage your business vendors and contractors</p>
                </div>
                {isAdmin && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25 transition-all duration-300 px-8 py-3 text-lg font-semibold"
                    onClick={() => {
                      resetForm();
                      setShowVendorModal(true);
                    }}
                    title="Admin: Can add new vendors"
                  >
                    ➕ Add Vendor
                      </Button>
                )}
              </div>

              {!isAdmin && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6 text-center">
                      <p className="text-orange-500 text-sm m-0">
                    🔒 <strong>Read-Only Access:</strong> You can view vendor information and ledgers, but only administrators can add, edit, or delete vendors.
                  </p>
                </div>
              )}
              
              <div className="table-container">
                <div className="table-search">
                      <Input
                    type="text"
                    placeholder="🔍 Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="search-input"
                  />
                  <div className="search-info">
                    📊 Showing {filteredVendors.length} of {vendors.length} vendors
                  </div>
                </div>
                
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Phone</th>
                      <th>Balance</th>
                      {isAdmin && <th key="actions-header">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="empty-state">
                          <div style={{textAlign: 'center', padding: '2rem'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🏢</div>
                            <div>No vendors found. {isAdmin ? 'Add your first vendor above.' : 'Contact an administrator to add vendors.'}</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <tr key={vendor.vendorID}>
                          <td>{vendor.name}</td>
                          <td>{getVendorTypeLabel(vendor.type)}</td>
                          <td>{vendor.phone || "—"}</td>
                          <td>
                            <span className={vendor.currentBalance >= 0 ? 'status-debit' : 'status-credit'}>
                              {currency(vendor.currentBalance)}
                            </span>
                          </td>
                          {isAdmin && (
                            <td key={`actions-${vendor.vendorID}`}>
                              <div className="action-group">
                                <ActionButton 
                                  variant="secondary"
                                  onClick={() => handleEditVendor(vendor)}
                                  title="Admin: Can edit all vendors"
                                >
                                  ✏️ Edit
                                </ActionButton>
                                <ActionButton 
                                  variant="danger"
                                  onClick={() => handleDeleteVendor(vendor)}
                                  title="Admin: Can delete all vendors"
                                >
                                  🗑️ Delete
                                </ActionButton>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VENDOR LEDGER TAB */}
          {activeTab === "ledger" && (
                <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-100 tracking-tight leading-tight flex items-center gap-3 mb-2">
                        <span className="text-3xl filter drop-shadow-lg">📋</span>
                        <span className="text-gray-200 font-semibold">Vendor Ledger</span>
                      </h2>
                      <p className="text-gray-400 text-sm">Track all vendor transactions and balances</p>
                </div>
                    <SelectField
                  value={selectedVendorForLedger?.id || ""}
                  onChange={(e) => setSelectedVendorForLedger(vendors.find(v => v.id === e.target.value))}
                  className="vendor-selector"
                      options={[
                        { value: "", label: "🔍 Select vendor to view ledger" },
                        ...vendors.map(v => ({ value: v.id, label: v.name }))
                      ]}
                    />
              </div>

              {selectedVendorForLedger && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex justify-between items-center">
                      <div className="text-xl font-semibold text-white">{selectedVendorForLedger.name}</div>
                      <div className="text-blue-400 font-semibold">
                    Balance: {currency(selectedVendorForLedger.currentBalance)}
                  </div>
                </div>
              )}


              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Quantity</th>
                      <th>Balance</th>
                      <th>Reference</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedVendorForLedger ? (
                      <tr>
                        <td colSpan={8} className="empty-state">
                          <div style={{textAlign: 'center', padding: '2rem'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📋</div>
                            <div>Select a vendor to view their ledger</div>
                          </div>
                        </td>
                      </tr>
                    ) : vendorLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-state">
                          <div style={{textAlign: 'center', padding: '2rem'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📊</div>
                            <div>No ledger entries for this vendor</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      vendorLedger.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.date)}</td>
                          <td>
                            <span className={entry.transactionType === 'credit' ? 'status-credit' : 'status-debit'}>
                              {entry.transactionType === 'credit' ? '💰 Credit' : '💸 Debit'}
                            </span>
                          </td>
                          <td>{entry.category}</td>
                          <td>{currency(entry.amount)}</td>
                          <td>{entry.quantity || "—"}</td>
                          <td>{currency(entry.balance || 0)}</td>
                          <td>{entry.referenceType}</td>
                          <td>{entry.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </div>
          </Card>
        </div>
      </div>

      {/* VENDOR MODAL */}
      <Modal
        isOpen={showVendorModal}
        onClose={closeModal}
        title={isEditing ? "✏️ Edit Vendor" : "🏢 Add New Vendor"}
        size="lg"
      >
        <form onSubmit={handleSubmitVendor} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">👤 Name *</label>
              <Input 
                      value={vName} 
                      onChange={(e) => setVName(e.target.value)} 
                      placeholder="Enter vendor name" 
                      required
                    />
                  </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">📱 Phone</label>
              <Input 
                      value={vPhone} 
                      onChange={(e) => setVPhone(e.target.value)} 
                      placeholder="Enter phone number" 
                    />
                  </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">🏷️ Type *</label>
              <SelectField 
                      value={vType} 
                      onChange={(e) => setVType(e.target.value)} 
                options={[
                  { value: "raw_material", label: "Raw Material" },
                  { value: "consumables", label: "Consumables" },
                  { value: "both", label: "Both" }
                ]}
              />
                  </div>
                </div>
                
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">📍 Address</label>
                    <textarea
                      placeholder="Enter full address"
                      value={vAddress}
                      onChange={(e) => setVAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[80px]"
                    />
                  </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">💰 Opening Balance</label>
              <Input 
                      type="number" 
                      step="0.01" 
                      value={vOpeningBalance} 
                      onChange={(e) => setVOpeningBalance(e.target.value)} 
                      placeholder="0.00"
                    />
                  </div>
                </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
                    type="button" 
              variant="outline" 
                    onClick={closeModal}
                  >
                    ❌ Cancel
            </Button>
            <Button type="submit" variant="primary">
                    {isEditing ? "💾 Update Vendor" : "➕ Save Vendor"}
            </Button>
          </div>
        </form>
      </Modal>

    </DieselPage>
  );
};

export default VendorManagement;
