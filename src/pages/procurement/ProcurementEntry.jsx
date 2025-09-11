import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  orderBy,
  increment
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
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
  PageLayout,
  FormModal,
  InputField,
  DatePicker,
  DieselPage
} from "../../components/ui";
import './ProcurementEntry.css';

const ProcurementEntry = ({ onBack }) => {
  // Auth context
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // State
  const [activeTab, setActiveTab] = useState("add-procurement");
  const [vendors, setVendors] = useState([]);
  const [procurementEntries, setProcurementEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  
  // Performance tracking
  const [readCount, setReadCount] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [selectedVendor, setSelectedVendor] = useState("");
  const [category, setCategory] = useState("RAW_MATERIAL");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [rate, setRate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState("");
  
  // File upload states
  const [dmBillFile, setDmBillFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  
  // Search and filter states
  const [procurementSearch, setProcurementSearch] = useState("");
  const [selectedFilterDate, setSelectedFilterDate] = useState(() => {
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
      fetchVendors();
      fetchProcurementEntries();
    }
  }, [selectedOrg]);


  // Calculate total amount when quantity or rate changes
  useEffect(() => {
    if (quantity && rate) {
      const total = Number(quantity) * Number(rate);
      setTotalAmount(total.toFixed(2));
    } else {
      setTotalAmount("");
    }
  }, [quantity, rate]);

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const q = query(
        collection(db, "VENDORS"),
        where("orgID", "==", orgID)
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendors(rows);
        setLoadingVendors(false);
        setReadCount(prev => prev + 1);
      });
      
      return unsubscribe;
    } catch (error) {
      toast.error("Failed to fetch vendors");
      setLoadingVendors(false);
    }
  };

  // Fetch procurement entries
  const fetchProcurementEntries = async () => {
    try {
      setLoadingEntries(true);
      const q = query(
        collection(db, "PROCUREMENT_ENTRIES"),
        where("orgID", "==", orgID)
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProcurementEntries(rows);
        setLoadingEntries(false);
        setReadCount(prev => prev + 1);
      });
      
      return unsubscribe;
    } catch (error) {
      toast.error("Failed to fetch procurement entries");
      setLoadingEntries(false);
    }
  };

  // Handle add/edit procurement
  const handleSubmitProcurement = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      if (!selectedVendor || !itemName || !rate || !date) {
        toast.error("Please fill all required fields");
        return;
      }

      if (!quantity) {
        toast.error("Quantity is required");
        return;
      }

      const selectedVendorData = vendors.find(v => v.id === selectedVendor || v.vendorID === selectedVendor);
      if (!selectedVendorData) {
        toast.error("Selected vendor not found");
        return;
      }

      // Upload file if selected
      let fileUrl = null;
      if (dmBillFile) {
        fileUrl = await uploadFile(dmBillFile);
        if (!fileUrl) {
          toast.error("Failed to upload file. Please try again.");
          return;
        }
      }

      if (isEditing) {
        // Update existing procurement
        // TODO: Implement edit functionality
        toast("Edit functionality coming soon");
      } else {
        // Add new procurement
        const procurementData = {
          vendorID: selectedVendor,
          vendorName: selectedVendorData.name,
          category: category,
          itemName: itemName.trim(),
          quantity: category === "RAW_MATERIAL" ? Number(quantity) : 0,
          unit: category === "RAW_MATERIAL" ? unit : "",
          rate: Number(rate),
          totalAmount: Number(totalAmount),
          date: new Date(date),
          description: description.trim(),
          dmBillFile: fileUrl, // Add file URL to procurement data
          orgID: orgID,
          orgName: orgName,
          createdAt: serverTimestamp(),
        };

        let procurementRef;
        try {
          procurementRef = await addDoc(collection(db, "PROCUREMENT_ENTRIES"), procurementData);
        } catch (error) {
          throw error;
        }

        // Add to procurement ledger (credit transaction)
        try {
          await addDoc(collection(db, "PROCUREMENT_LEDGER"), {
            vendorID: selectedVendor,
            vendorName: selectedVendorData.name,
            category: category,
            transactionType: "credit",
            amount: Number(totalAmount),
            quantity: category === "RAW_MATERIAL" ? Number(quantity) : 0,
            balance: 0, // Will be calculated by ledger system
            referenceType: "procurement",
            referenceID: procurementRef.id,
            date: new Date(date),
            description: `${category === "RAW_MATERIAL" ? 'Raw Material' : 'Consumables'} procurement - ${itemName.trim()}`,
            orgID: orgID,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          throw error;
        }

        // Update vendor balance
        try {
          const vendorRef = doc(db, "VENDORS", selectedVendor);
          await updateDoc(vendorRef, {
            currentBalance: increment(Number(totalAmount)),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          throw error;
        }
        
        toast.success("Procurement entry added successfully");
      }

      // Reset form
      resetForm();
      
    } catch (error) {
      toast.error(`Failed to save procurement: ${error.message}`);
    }
  }, [selectedVendor, itemName, rate, date, category, quantity, totalAmount, vendors, dmBillFile, orgID, orgName, isEditing]);

  // Handle delete procurement
  const handleDeleteProcurement = useCallback(async (procurement) => {
    if (!window.confirm(`Delete procurement entry "${procurement.itemName}"? This action cannot be undone.`)) return;
    
    try {
      
      // 1. Delete the procurement entry
      await deleteDoc(doc(db, "PROCUREMENT_ENTRIES", procurement.id));
      
      // 2. Create a debit transaction in the ledger to reverse the credit
      await addDoc(collection(db, "PROCUREMENT_LEDGER"), {
        vendorID: procurement.vendorID,
        vendorName: procurement.vendorName,
        category: procurement.category,
        transactionType: "debit",
        amount: procurement.totalAmount,
        quantity: procurement.quantity || 0,
        balance: 0, // Will be calculated by ledger system
        referenceType: "deletion",
        referenceID: procurement.id,
        date: serverTimestamp(),
        description: `Reversal of procurement entry - ${procurement.itemName}`,
        orgID: procurement.orgID,
        createdAt: serverTimestamp(),
      });
      
      // 3. Update vendor balance (decrease by the amount)
      const vendorRef = doc(db, "VENDORS", procurement.vendorID);
      await updateDoc(vendorRef, {
        currentBalance: increment(-procurement.totalAmount),
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Procurement entry deleted successfully");
      
    } catch (error) {
      toast.error(`Failed to delete procurement: ${error.message}`);
    }
  }, []);

  // Handle edit procurement
  const handleEditProcurement = useCallback((procurement) => {
    // TODO: Implement edit functionality
    toast.info("Edit functionality coming soon");
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedVendor("");
    setCategory("RAW_MATERIAL");
    setItemName("");
    setQuantity("");
    setUnit("kg");
    setRate("");
    setTotalAmount("");
    setDate(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    setDescription("");
    setDmBillFile(null);
    setUploadedFileUrl("");
    setUploadingFile(false);
    setIsEditing(false);
  }, []);



  // Filtered procurement entries
  const filteredProcurementEntries = useMemo(() => procurementEntries.filter(p => {
    // Text search filter
    const textMatch = p.itemName?.toLowerCase().includes(procurementSearch.toLowerCase()) ||
                     p.vendorName?.toLowerCase().includes(procurementSearch.toLowerCase()) ||
                     p.description?.toLowerCase().includes(procurementSearch.toLowerCase());
    
    // Date filter
    let dateMatch = true;
    if (selectedFilterDate) {
      const procurementDate = p.date;
      let procurementDateStr;
      
      if (procurementDate instanceof Date) {
        procurementDateStr = procurementDate.toLocaleDateString('en-CA');
      } else if (typeof procurementDate === 'string') {
        procurementDateStr = procurementDate;
      } else if (procurementDate?.toMillis) {
        procurementDateStr = new Date(procurementDate.toMillis()).toLocaleDateString('en-CA');
      } else if (procurementDate?.seconds) {
        procurementDateStr = new Date(procurementDate.seconds * 1000).toLocaleDateString('en-CA');
      } else if (procurementDate?.toDate) {
        procurementDateStr = procurementDate.toDate().toLocaleDateString('en-CA');
      } else {
        procurementDateStr = String(procurementDate);
      }
      
      dateMatch = procurementDateStr === selectedFilterDate;
    }
    
    return textMatch && dateMatch;
  }), [procurementEntries, procurementSearch, selectedFilterDate]);

  // Helper functions
  const currency = (n) => new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Memoized vendor options for better performance
  const vendorOptions = useMemo(() => [
    { value: "", label: loadingVendors ? "Loading vendors..." : "Select vendor..." },
    ...vendors.map(v => ({
      value: v.vendorID || v.id,
      label: `${v.name} (${v.type})`
    }))
  ], [vendors, loadingVendors]);

  // File upload functions
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF or image file (JPEG, PNG)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      
      setDmBillFile(file);
      setUploadedFileUrl(""); // Clear previous upload
    }
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!file) return null;
    
    try {
      setUploadingFile(true);
      
      // Create unique filename
      const timestamp = Date.now();
      const fileName = `dm_bill_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `procurement_documents/${orgID}/${fileName}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setUploadedFileUrl(downloadURL);
      return downloadURL;
      
    } catch (error) {
      toast.error(`File upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingFile(false);
    }
  }, [orgID]);

  const removeFile = useCallback(() => {
    setDmBillFile(null);
    setUploadedFileUrl("");
  }, []);

  // Role-based access control functions
  const canEditOrDeleteEntry = useCallback((entry) => {
    if (isAdmin) {
      return true; // Admin can edit/delete all entries
    }
    
    if (isManager) {
      // Manager can only edit/delete entries from today
      const today = new Date();
      const entryDate = entry.date;
      
      let entryDateObj;
      if (entryDate instanceof Date) {
        entryDateObj = entryDate;
      } else if (entryDate?.toDate) {
        entryDateObj = entryDate.toDate();
      } else if (entryDate?.toMillis) {
        entryDateObj = new Date(entryDate.toMillis());
      } else if (entryDate?.seconds) {
        entryDateObj = new Date(entryDate.seconds * 1000);
      } else {
        entryDateObj = new Date(entryDate);
      }
      
      // Check if entry is from today (same date)
      return (
        entryDateObj.getDate() === today.getDate() &&
        entryDateObj.getMonth() === today.getMonth() &&
        entryDateObj.getFullYear() === today.getFullYear()
      );
    }
    
    return false; // Regular users cannot edit/delete
  }, [isAdmin, isManager]);

  const getActionButtonTooltip = useCallback((entry) => {
    if (isAdmin) {
      return "Admin: Can edit/delete all entries";
    }
    
    if (isManager) {
      if (canEditOrDeleteEntry(entry)) {
        return "Manager: Can edit/delete today's entries";
      } else {
        return "Manager: Can only edit/delete today's entries";
      }
    }
    
    return "No edit/delete permissions";
  }, [isAdmin, isManager, canEditOrDeleteEntry]);

  // Show loading state if no organization is selected
  if (!selectedOrg) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading organization data..." 
          icon="🏢"
        />
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      <PageHeader 
        title="📝 Procurement Entry"
        onBack={onBack || (() => window.history.back())}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
        subtitle={`📊 Reads: ${readCount}`}
      />

      {/* Main content container */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="main-container">
          {/* Tabs */}
          <div className="tabs-container">
            {[
              ["add-procurement", "➕ Add Procurement"],
              ["history", "📋 Procurement History"],
              ["summary", "📊 Ledger Summary"],
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

          {/* ADD PROCUREMENT TAB */}
          {activeTab === "add-procurement" && (
            <div className="content-section">
              <div className="section-header">
                <div className="header-content-left">
                  <h2>➕ Add Procurement Entry</h2>
                  <p className="section-description">Record new procurement entries for raw materials and consumables</p>
                </div>
              </div>

              <div className="form-container">
                <form onSubmit={handleSubmitProcurement}>
                  <div className="form-grid">
                    <div className="form-row-3">
                      <div className="form-group">
                        <SelectField
                          label="🏢 Vendor *"
                          value={selectedVendor}
                          onChange={(value) => setSelectedVendor(value)}
                          required
                          disabled={loadingVendors}
                          options={vendorOptions}
                        />
                      </div>
                      <div className="form-group">
                        <SelectField
                          label="🏷️ Category *"
                          value={category}
                          onChange={(value) => setCategory(value)}
                          required
                          options={[
                            { value: "RAW_MATERIAL", label: "Raw Material" },
                            { value: "CONSUMABLES", label: "Consumables" }
                          ]}
                        />
                      </div>
                      <div className="form-group">
                        <DatePicker
                          label="📅 Date *"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row-3">
                      <div className="form-group">
                        <InputField
                          label="📦 Item Name *"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="Enter item name"
                          required
                        />
                      </div>
                      {category === "RAW_MATERIAL" && (
                        <>
                          <div className="form-group">
                            <InputField
                              label="📏 Quantity *"
                              type="number"
                              step="0.01"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <SelectField
                              label="📐 Unit"
                              value={unit}
                              onChange={(value) => setUnit(value)}
                              options={[
                                { value: "kg", label: "Kilograms (kg)" },
                                { value: "tons", label: "Tons" },
                                { value: "bags", label: "Pieces" },
                                { value: "liters", label: "Liters" },
                                { value: "meters", label: "Meters" }
                              ]}
                            />
                          </div>
                        </>
                      )}
                      {category === "CONSUMABLES" && (
                        <div className="form-group">
                          <InputField
                            label="📏 Quantity *"
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="form-row-2">
                      <div className="form-group">
                        <InputField
                          label="💰 Rate per Unit *"
                          type="number"
                          step="0.01"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <InputField
                          label="💵 Total Amount"
                          type="number"
                          step="0.01"
                          value={totalAmount}
                          readOnly
                          className="readonly-input"
                        />
                      </div>
                    </div>
                    
                    <div className="form-row-1">
                      <div className="form-group">
                        <InputField
                          label="📝 Description"
                          type="textarea"
                          placeholder="Enter additional details about this procurement"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row-1">
                      <div className="form-group">
                        <div className="form-label">📄 DM/Bill Upload</div>
                        <div className="file-upload-container">
                          <input
                            type="file"
                            id="dmBillUpload"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="file-input"
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="dmBillUpload" className="file-upload-button">
                            📎 Choose File
                          </label>
                          {dmBillFile && (
                            <div className="file-info">
                              <span className="file-name">📄 {dmBillFile.name}</span>
                              <ActionButton 
                                type="button" 
                                onClick={removeFile} 
                                variant="danger"
                                size="sm"
                              >
                                ❌
                              </ActionButton>
                            </div>
                          )}
                          {uploadingFile && (
                            <div className="uploading-indicator">
                              ⏳ Uploading...
                            </div>
                          )}
                          <div className="file-upload-note">
                            Supported formats: PDF, JPEG, PNG (Max 5MB)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-actions">
                      <ActionButton 
                        type="button" 
                        variant="secondary" 
                        onClick={resetForm}
                      >
                        🔄 Reset
                      </ActionButton>
                      <ActionButton 
                        type="submit" 
                        variant="primary"
                      >
                        ➕ Add Procurement
                      </ActionButton>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PROCUREMENT HISTORY TAB */}
          {activeTab === "history" && (
            <div className="content-section">
              <div className="section-header">
                <div className="header-content-left">
                  <h2>📋 Procurement History</h2>
                  <p className="section-description">View and manage all procurement entries</p>
                </div>
              </div>

              <div className="table-container">
                <div className="table-search">
                  <input
                    type="text"
                    placeholder="🔍 Search procurement entries..."
                    value={procurementSearch}
                    onChange={(e) => setProcurementSearch(e.target.value)}
                    className="search-input"
                  />
                  <div className="date-filter-container">
                    <input
                      type="date"
                      value={selectedFilterDate}
                      onChange={(e) => setSelectedFilterDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="search-info">
                    📊 Showing {filteredProcurementEntries.length} of {procurementEntries.length} entries
                  </div>
                </div>
                
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th>Total</th>
                      <th>Description</th>
                      <th>DM/Bill</th>
                      {(isAdmin || isManager) && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingEntries ? (
                      <tr>
                        <td colSpan={isAdmin || isManager ? 10 : 9} className="empty-state">
                          <LoadingState 
                            variant="inline" 
                            message="Loading procurement entries..." 
                            icon="⏳"
                          />
                        </td>
                      </tr>
                    ) : filteredProcurementEntries.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin || isManager ? 10 : 9} className="empty-state">
                          <div style={{textAlign: 'center', padding: '2rem'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📋</div>
                            <div>No procurement entries found. {isAdmin || isManager ? 'Add your first entry above.' : 'Contact an administrator to add entries.'}</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProcurementEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.date)}</td>
                          <td>{entry.vendorName}</td>
                          <td>
                            <span className={`category-badge ${entry.category.toLowerCase()}`}>
                              {entry.category === "RAW_MATERIAL" ? "🏗️ Raw Material" : "🛠️ Consumables"}
                            </span>
                          </td>
                          <td>{entry.itemName}</td>
                          <td>
                            {entry.quantity > 0 ? `${entry.quantity} ${entry.unit || ''}` : "—"}
                          </td>
                          <td>{currency(entry.rate)}</td>
                          <td>{currency(entry.totalAmount)}</td>
                          <td>{entry.description || "—"}</td>
                          <td>
                            {entry.dmBillFile ? (
                              <a 
                                href={entry.dmBillFile} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="file-link"
                              >
                                📄 View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          {(isAdmin || isManager) && (
                            <td>
                              <div className="action-group">
                                {canEditOrDeleteEntry(entry) ? (
                                  <>
                                    <ActionButton 
                                      variant="secondary"
                                      onClick={() => handleEditProcurement(entry)}
                                      title={getActionButtonTooltip(entry)}
                                    >
                                      ✏️ Edit
                                    </ActionButton>
                                    <ActionButton 
                                      variant="danger"
                                      onClick={() => handleDeleteProcurement(entry)}
                                      title={getActionButtonTooltip(entry)}
                                    >
                                      🗑️ Delete
                                    </ActionButton>
                                  </>
                                ) : (
                                  <div className="action-disabled" title={getActionButtonTooltip(entry)}>
                                    🔒 No Access
                                  </div>
                                )}
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

          {/* LEDGER SUMMARY TAB */}
          {activeTab === "summary" && (
            <div className="content-section">
              <div className="section-header">
                <div className="header-content-left">
                  <h2>📊 Ledger Summary</h2>
                  <p className="section-description">Overview of procurement vs consumption balance</p>
                </div>
              </div>

              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">🏗️</div>
                  <div className="summary-content">
                    <h3>Raw Materials</h3>
                    <div className="summary-stats">
                      <div className="stat-item">
                        <span className="stat-label">Total Procured:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Consumed:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Available Balance:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon">🛠️</div>
                  <div className="summary-content">
                    <h3>Consumables</h3>
                    <div className="summary-stats">
                      <div className="stat-item">
                        <span className="stat-label">Total Procured:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Payments:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Outstanding:</span>
                        <span className="stat-value">₹0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="summary-note">
                <p>💡 <strong>Note:</strong> This summary will show real-time data once the ledger system is fully integrated with production entries and expense payments.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DieselPage>
  );
};

export default ProcurementEntry;
