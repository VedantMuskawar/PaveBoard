import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp, 
  increment 
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Import reusable UI components
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
  Input,
  InputField
} from "../../components/ui";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import "./ProductionEntry.css";

const ProductionEntry = ({ onBack }) => {
  const navigate = useNavigate();

  const { selectedOrganization: selectedOrg, isLoading: orgLoading } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // State
  const [showModal, setShowModal] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);
  const [labours, setLabours] = useState([]);
  const [productionEntries, setProductionEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editableWages, setEditableWages] = useState([]);
  const [inputsLocked, setInputsLocked] = useState(false);
  const [submittedWageEntryIDs, setSubmittedWageEntryIDs] = useState([]);
  const [wageSavedNotice, setWageSavedNotice] = useState(false);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [submittingWages, setSubmittingWages] = useState(false);
  const [verifyingEntry, setVerifyingEntry] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    batchNumber: ""
  });
  
  const [formData, setFormData] = useState({
    labours: [],
    batchNumber: "",
    date: "",
    rawMaterial1: "",
    rawMaterial2: "",
    cementBags: "",
    batchProduction: "",
    thappi: "",
    wagePer1000Units: "",
    wagePerThappi: ""
  });

  // Get organization ID from context
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";

  // Effects
  useEffect(() => {
    // Check if organization is selected
    if (!selectedOrg) {
      toast.error("Please select an organization first");
      navigate("/select-organization");
      return;
    }
    
    // Only fetch production entries on page load, not labours
    fetchEntries();
  }, [orgID, selectedOrg, navigate]);

  useEffect(() => {
    if (selectedEntry?.id) {
      const entry = productionEntries.find(e => e.id === selectedEntry.id);
      if (entry) {
        const totalWage = Math.round(
          (entry.batchProduction * entry.wagePer1000Units) / 1000 +
          (entry.thappi * entry.wagePerThappi) / 1000
        );
        const perLabourWage = Math.round(totalWage / (entry.labours.length || 1));
        setEditableWages(entry.labours.map(() => perLabourWage));
        setInputsLocked(false);
        
        // Check if wages have already been submitted for this entry
        if (entry.id) {
          checkWageSubmissionStatus(entry.id);
        }
      }
    }
  }, [selectedEntry?.id, productionEntries]);

  const checkWageSubmissionStatus = async (productionEntryID) => {
    try {
      // Query WAGE_ENTRIES to see if wages exist for this production entry
      const wageQuery = query(
        collection(db, "WAGE_ENTRIES"),
        where("productionEntryID", "==", productionEntryID),
        where("orgID", "==", orgID)
      );
      
      const wageSnapshot = await getDocs(wageQuery);
      
      if (!wageSnapshot.empty) {
        // Wages have been submitted, update local state
        const submittedIDs = wageSnapshot.docs.map(doc => {
          const data = doc.data();
          return `${productionEntryID}-${data.labourID}`;
        });
        setSubmittedWageEntryIDs(prev => [...prev, ...submittedIDs]);
      }
    } catch (error) {
      console.error("Error checking wage submission status:", error);
    }
  };

  // Helper functions
  const getWageStatus = (entryId) => {
    const entry = productionEntries.find(e => e.id === entryId);
    if (!entry || !entry.labours) return "Pending";
    
    const hasSubmittedWages = entry.labours.some(labour => 
      submittedWageEntryIDs.includes(`${entryId}-${labour.labourID}`)
    );
    
    return hasSubmittedWages ? "Submitted" : "Pending";
  };

  // Calculate week start (Thursday)
  const getWeekStart = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date provided to getWeekStart');
      }
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 4); // Adjust to Thursday
      return new Date(d.setDate(diff));
    } catch (error) {
      console.error('Error in getWeekStart:', error);
      return new Date(); // Return current date as fallback
    }
  };

  // Update raw material stock
  const updateRawMaterialStock = async (rawMaterial1, rawMaterial2, cementBags, isAddition = false) => {
    try {
      // Check if stock document exists, if not create it
      const stockRef = doc(db, 'RAW_MATERIAL_STOCK', orgID);
      const stockDoc = await getDoc(stockRef);
      
      if (!stockDoc.exists()) {
        // Initialize stock document
        await setDoc(stockRef, {
          orgID,
          materials: {
            rawMaterial1: 0,
            rawMaterial2: 0,
            cementBags: 0
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
  
      }
      
      const stockUpdates = [];
      
      if (rawMaterial1 && rawMaterial1 > 0) {
        stockUpdates.push(
          updateDoc(stockRef, {
            'materials.rawMaterial1': increment(isAddition ? rawMaterial1 : -rawMaterial1),
            updatedAt: serverTimestamp()
          })
        );
      }
      
      if (rawMaterial2 && rawMaterial2 > 0) {
        stockUpdates.push(
          updateDoc(stockRef, {
            'materials.rawMaterial2': increment(isAddition ? rawMaterial2 : -rawMaterial2),
            updatedAt: serverTimestamp()
          })
        );
      }
      
      if (cementBags && cementBags > 0) {
        stockUpdates.push(
          updateDoc(stockRef, {
            'materials.cementBags': increment(isAddition ? cementBags : -cementBags),
            updatedAt: serverTimestamp()
          })
        );
      }
      
      if (stockUpdates.length > 0) {
        await Promise.all(stockUpdates);

      }
    } catch (error) {
      console.error('❌ Error updating raw material stock:', error);
      throw new Error('Failed to update raw material stock');
    }
  };

  const toggleLabourSelection = (labourID) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.labours.includes(labourID);
      
      if (isCurrentlySelected) {
        // Remove the labour
        const newLabours = prev.labours.filter(id => id !== labourID);
        return {
          ...prev,
          labours: newLabours
        };
      } else {
        // Add the labour - ensure linked labours can be selected independently
        const newLabours = [...prev.labours, labourID];
        return {
          ...prev,
          labours: newLabours
        };
      }
    });
  };

  const handleAddEntry = async () => {
    setEditingEntry(null);
    setFormData({
      labours: [],
      batchNumber: "",
      date: "",
      rawMaterial1: "",
      rawMaterial2: "",
      cementBags: "",
      batchProduction: "",
      thappi: "",
      wagePer1000Units: "",
      wagePerThappi: ""
    });
    
    // Fetch labours when opening the modal
    try {
      await fetchLabours();
    } catch (error) {
      console.error('Error fetching labours:', error);
      toast.error('Failed to fetch labours');
    }
    
    setShowModal(true);
  };

  const handleEdit = async (entry) => {
    setEditingEntry(entry);
    setFormData({
      labours: entry.labours || [],
      batchNumber: entry.batchNumber || "",
      date: entry.date?.seconds 
        ? new Date(entry.date.seconds * 1000).toISOString().slice(0, 10)
        : entry.date || "",
      rawMaterial1: entry.rawMaterial1 || "",
      rawMaterial2: entry.rawMaterial2 || "",
      cementBags: entry.cementBags || "",
      batchProduction: entry.batchProduction || "",
      thappi: entry.thappi || "",
      wagePer1000Units: entry.wagePer1000Units || "",
      wagePerThappi: entry.wagePerThappi || ""
    });
    
    // Fetch labours when editing
    try {
      await fetchLabours();
    } catch (error) {
      console.error('Error fetching labours:', error);
      toast.error('Failed to fetch labours');
    }
    
    setShowModal(true);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this production entry?")) return;
    
    try {
      // Find the entry to get raw material data
      const entryToDelete = productionEntries.find(e => e.id === entryId);
      if (!entryToDelete) {
        toast.error("Entry not found");
        return;
      }
      
      // Restore raw material stock
      if (parseFloat(entryToDelete.rawMaterial1) > 0 || parseFloat(entryToDelete.rawMaterial2) > 0 || parseFloat(entryToDelete.cementBags) > 0) {
        await updateRawMaterialStock(
          parseFloat(entryToDelete.rawMaterial1) || 0,
          parseFloat(entryToDelete.rawMaterial2) || 0,
          parseFloat(entryToDelete.cementBags) || 0,
          true // true means addition (restore stock)
        );
      }
      
      // Delete the production entry
      await deleteDoc(doc(db, "PRODUCTION_ENTRIES", entryId));
      toast.success("Production entry deleted successfully and raw materials restored");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete production entry");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Input validation
    if (formData.labours.length === 0) {
      toast.error("Please select at least one labour");
      return;
    }
    
    if (!formData.batchNumber || !formData.date || !formData.batchProduction) {
      toast.error("Please fill in all required fields (Batch Number, Date, Batch Production)");
      return;
    }
    
    // Validate numeric inputs
    const numericFields = ['batchProduction', 'thappi', 'wagePer1000Units', 'wagePerThappi'];
    for (const field of numericFields) {
      if (formData[field] && (isNaN(parseFloat(formData[field])) || parseFloat(formData[field]) < 0)) {
        toast.error(`Invalid value for ${field}. Please enter a valid positive number.`);
        return;
      }
    }
    
    try {
      const entryData = {
        ...formData,
        orgID,
        createdAt: editingEntry ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      

      
      if (editingEntry) {
        // For updates, we need to calculate the difference in raw materials
        const oldRawMaterial1 = parseFloat(editingEntry.rawMaterial1) || 0;
        const oldRawMaterial2 = parseFloat(editingEntry.rawMaterial2) || 0;
        const oldCementBags = parseFloat(editingEntry.cementBags) || 0;
        
        const newRawMaterial1 = parseFloat(formData.rawMaterial1) || 0;
        const newRawMaterial2 = parseFloat(formData.rawMaterial2) || 0;
        const newCementBags = parseFloat(formData.cementBags) || 0;
        
        // Calculate differences (negative means reduction, positive means addition)
        const diffRawMaterial1 = newRawMaterial1 - oldRawMaterial1;
        const diffRawMaterial2 = newRawMaterial2 - oldRawMaterial2;
        const diffCementBags = newCementBags - oldCementBags;
        
        // Update raw material stock based on differences
        if (diffRawMaterial1 !== 0 || diffRawMaterial2 !== 0 || diffCementBags !== 0) {
          await updateRawMaterialStock(
            Math.abs(diffRawMaterial1), 
            Math.abs(diffRawMaterial2), 
            Math.abs(diffCementBags), 
            diffRawMaterial1 > 0 || diffRawMaterial2 > 0 || diffCementBags > 0
          );
        }
        
        await updateDoc(doc(db, "PRODUCTION_ENTRIES", editingEntry.id), entryData);
        toast.success("Production entry updated successfully");
      } else {
        // For new entries, reduce raw material stock
        if (parseFloat(formData.rawMaterial1) > 0 || parseFloat(formData.rawMaterial2) > 0 || parseFloat(formData.cementBags) > 0) {
          await updateRawMaterialStock(
            parseFloat(formData.rawMaterial1) || 0,
            parseFloat(formData.rawMaterial2) || 0,
            parseFloat(formData.cementBags) || 0,
            false // false means reduction
          );
        }
        
        await addDoc(collection(db, "PRODUCTION_ENTRIES"), entryData);
        toast.success("Production entry added successfully");
      }
      
      setShowModal(false);
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save production entry");
    }
  };

  const handleWageEntry = (entry) => {
    setSelectedEntry(entry);
    
    // Initialize editable wages with default calculated values
    const totalWage = Math.round(
      (entry.batchProduction * entry.wagePer1000Units) / 1000 +
      (entry.thappi * entry.wagePerThappi) / 1000
    );
    const perLabourWage = entry.labours.length > 0 ? Math.round(totalWage / entry.labours.length) : 0;
    setEditableWages(entry.labours.map(() => perLabourWage));
    
    setShowWageModal(true);
  };



  // Functions
  const fetchLabours = async () => {
    try {
      // Simplified query to avoid indexing issues
      const q = query(
        collection(db, "LABOURS"),
        where("orgID", "==", orgID)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      

      
      // Process labours to handle both individual and linked types
      const processedLabours = [];
      
      data.forEach(labour => {
        if (labour.type === "linked_pair") {
          // Handle linked labour pair - create separate entries for each labour
          if (labour.labour1 && labour.labour1.tags && labour.labour1.tags.includes("Production") && labour.status === "Active") {
            processedLabours.push({
              id: `${labour.id}-labour1`, // Unique key for React
              documentID: labour.id, // Real document ID for updates
              labourID: `${labour.labour1.labourID}-1`, // Make labourID unique by adding suffix
              originalLabourID: labour.labour1.labourID, // Keep original for reference
              name: labour.labour1.name,
              gender: labour.labour1.gender,
              tags: labour.labour1.tags,
              assignedVehicle: labour.labour1.assignedVehicle || '',
              remarks: labour.labour1.remarks || '',
              status: labour.status,
              isLinked: true,
              linkedPairID: labour.id,
              linkedPairName: labour.labour2.name,
              openingBalance: labour.sharedBalance?.openingBalance || 0,
              currentBalance: labour.sharedBalance?.currentBalance || 0
            });
          }
          
          if (labour.labour2 && labour.labour2.tags && labour.labour2.tags.includes("Production") && labour.status === "Active") {
            processedLabours.push({
              id: `${labour.id}-labour2`, // Unique key for React
              documentID: labour.id, // Real document ID for updates
              labourID: `${labour.labour2.labourID}-2`, // Make labourID unique by adding suffix
              originalLabourID: labour.labour2.labourID, // Keep original for reference
              name: labour.labour2.name,
              gender: labour.labour2.gender,
              tags: labour.labour2.tags,
              assignedVehicle: labour.labour2.assignedVehicle || '',
              remarks: labour.labour2.remarks || '',
              status: labour.status,
              isLinked: true,
              linkedPairID: labour.id,
              linkedPairName: labour.labour1.name,
              openingBalance: labour.sharedBalance?.openingBalance || 0,
              currentBalance: labour.sharedBalance?.currentBalance || 0
            });
          }
        } else {
          // Handle individual labour
          if (labour.tags && labour.tags.includes("Production") && labour.status === "Active") {
            processedLabours.push({
              ...labour,
              documentID: labour.id, // Add documentID for consistency
              isLinked: false
            });
          }
        }
      });
      
      // Check for duplicate labourIDs
      const labourIDs = processedLabours.map(l => l.labourID);
      const duplicateIDs = labourIDs.filter((id, index) => labourIDs.indexOf(id) !== index);
      if (duplicateIDs.length > 0) {
        console.warn('⚠️ WARNING: Duplicate labourIDs found:', duplicateIDs);
        console.warn('This could cause selection issues!');
      }
      
      // Process linked labours
      const linkedLabours = processedLabours.filter(l => l.isLinked);
      
      setLabours(processedLabours);
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error("Failed to fetch labours");
    }
  };

    const fetchEntries = async () => {
    try {
      setLoadingProduction(true);
      const q = query(
        collection(db, "PRODUCTION_ENTRIES"),
        where("orgID", "==", orgID)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductionEntries(data);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to fetch production entries");
    } finally {
      setLoadingProduction(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
          const payload = {
        ...formData,
        batchNumber: parseFloat(formData.batchNumber),
        rawMaterial1: parseFloat(formData.rawMaterial1),
        rawMaterial2: parseFloat(formData.rawMaterial2),
        cementBags: parseFloat(formData.cementBags),
        batchProduction: parseFloat(formData.batchProduction),
        thappi: parseFloat(formData.thappi),
        wagePer1000Units: parseFloat(formData.wagePer1000Units),
        wagePerThappi: parseFloat(formData.wagePerThappi),
        date: new Date(formData.date),
            orgID,
            updatedAt: serverTimestamp()
          };

          if (editingEntry) {
        payload.createdAt = editingEntry.createdAt;
            const docRef = doc(db, "PRODUCTION_ENTRIES", editingEntry.id);
            await updateDoc(docRef, payload);
            setProductionEntries(prev =>
              prev.map(e => e.id === editingEntry.id ? { ...e, ...payload } : e)
            );
        toast.success("Entry updated successfully");
          } else {
        payload.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, "PRODUCTION_ENTRIES"), payload);
            const newEntry = { id: docRef.id, ...payload };
            setProductionEntries(prev => [...prev, newEntry]);
        toast.success("Entry added successfully");
          }

            // TODO: Add RAW_MATERIAL_STOCK update logic here

      setShowModal(false);
      setEditingEntry(null);
      setSelectedEntry(null); // Also reset selected entry
      setFormData({ labours: [] });
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry");
    }
  };

  // Handle individual wage changes with redistribution
  const handleWageChange = (labourIndex, newWage) => {
    if (!selectedEntry || !selectedEntry.labours) return;
    
    const totalWage = Math.round(
      (selectedEntry.batchProduction * selectedEntry.wagePer1000Units) / 1000 +
      (selectedEntry.thappi * selectedEntry.wagePerThappi) / 1000
    );
    
    const currentWages = [...editableWages];
    currentWages[labourIndex] = Math.max(0, newWage); // Ensure non-negative
    
    // Calculate remaining wage to distribute
    const remainingWage = totalWage - currentWages.reduce((sum, wage) => sum + wage, 0);
    const otherLabours = selectedEntry.labours.length - 1;
    
    if (otherLabours > 0 && remainingWage >= 0) {
      // Distribute remaining wage equally among other labours
      const equalShare = Math.round(remainingWage / otherLabours);
      
      // Update other labour wages
      for (let i = 0; i < currentWages.length; i++) {
        if (i !== labourIndex) {
          currentWages[i] = equalShare;
        }
      }
    }
    
    setEditableWages(currentWages);
  };

  // Handle wage submission
  const handleWageSubmit = async () => {

    
    // Validate that we're not trying to submit already submitted wages
    const alreadySubmitted = submittedWageEntryIDs.filter(id => id.startsWith(selectedEntry.id));
    if (alreadySubmitted.length > 0) {
      console.warn('⚠️ Wages already submitted for this entry:', alreadySubmitted);
      toast.warning('Wages have already been submitted for this production entry.');
      return;
    }
    
    // Validate editable wages array
    const invalidWages = editableWages.filter(wage => isNaN(wage) || wage < 0);
    if (invalidWages.length > 0) {
      console.error('❌ Invalid wages detected:', invalidWages);
      toast.error('Invalid wage amounts detected. Please check the wage inputs.');
      return;
    }
    
    if (!selectedEntry || !selectedEntry.labours) {
      console.error('❌ No production entry selected or no labours');
      toast.error('No production entry selected');
      return;
    }

    try {
      setSubmittingWages(true);
  
      
      // Get current wages (either edited or calculated)
      const currentWages = selectedEntry.labours.map((labourId, index) => {
        // Ensure all values are numbers and handle NaN cases
        const batchProduction = Number(selectedEntry.batchProduction) || 0;
        const wagePer1000Units = Number(selectedEntry.wagePer1000Units) || 0;
        const thappi = Number(selectedEntry.thappi) || 0;
        const wagePerThappi = Number(selectedEntry.wagePerThappi) || 0;
        
        const totalWage = Math.round(
          (batchProduction * wagePer1000Units) / 1000 +
          (thappi * wagePerThappi) / 1000
        );
        
        const perLabourWage = selectedEntry.labours.length > 0 ? Math.round(totalWage / selectedEntry.labours.length) : 0;
        const editableWage = Number(editableWages[index]) || 0;
        const finalWage = editableWage > 0 ? editableWage : perLabourWage;
        
        // Ensure final wage is a valid number
        const safeWage = isNaN(finalWage) ? 0 : Math.max(0, finalWage);
        

        
        return safeWage;
      });
      


      // Calculate week start (Thursday)
      let entryDate, weekStart;
      try {
        entryDate = selectedEntry.date?.seconds ? new Date(selectedEntry.date.seconds * 1000) : new Date(selectedEntry.date);
        weekStart = getWeekStart(entryDate);
        
        // Date calculations completed
      } catch (dateError) {
        console.error('❌ Error calculating dates:', dateError);
        // Use fallback dates if calculation fails
        entryDate = new Date();
        weekStart = new Date();
      }

      // Start labour processing
      let wageEntriesCreated = 0;
      let wageEntriesFailed = 0;
      
      // Process each labour's wage
      for (let i = 0; i < selectedEntry.labours.length; i++) {
        const labourItem = selectedEntry.labours[i];
        
        // Handle case where labour might be an object or just an ID
        const labourId = typeof labourItem === 'object' ? labourItem.labourID : labourItem;
        const rawWageAmount = currentWages[i];
        
        // Ensure wageAmount is a valid number
        const wageAmount = isNaN(rawWageAmount) ? 0 : Math.max(0, Number(rawWageAmount));
        
        // Find labour data to check if it's linked
        const labourData = findLabourData(labourItem);
        
        if (labourData) {
          
          // Create wage entry - use originalLabourID for the actual labour reference
          const wageEntry = {
            orgID,
            labourID: labourData.originalLabourID || labourId, // Use original ID for wage entry
            labourName: labourData.name || 'Unknown',
            labourType: 'Production',
            entryID: selectedEntry.id,
            assignedBatchID: `${selectedEntry.batchNumber}_${Math.floor(Date.now() / 1000)}`,
            category: 'Production',
            unitCount: selectedEntry.batchProduction || 0,
            wageAmount: wageAmount,
            
            date: entryDate,
            vehicleID: labourData.assignedVehicle || '',
            vehicleType: labourData.assignedVehicle ? 'Truck' : '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          try {
            
            // Validate required fields before creating
            if (!orgID) {
              throw new Error('Organization ID is missing');
            }
            if (!(labourData.originalLabourID || labourId)) {
              throw new Error('Labour ID is missing');
            }
            if (!selectedEntry.id) {
              throw new Error('Production Entry ID is missing');
            }
            if (!wageAmount || wageAmount <= 0) {
              throw new Error('Invalid wage amount');
            }
            if (!labourData.name) {
              throw new Error('Labour name is missing');
            }
            if (!selectedEntry.batchProduction) {
              throw new Error('Batch production count is missing');
            }
            
            // Add to WAGE_ENTRIES collection
            let wageRef;
            try {
              wageRef = await addDoc(collection(db, 'WAGE_ENTRIES'), wageEntry);

              wageEntriesCreated++;
            } catch (wageCreationError) {
              console.error(`❌ Failed to create wage entry for ${labourData.name}:`, wageCreationError);
              console.error('Wage entry data that failed:', wageEntry);
              toast.error(`Failed to create wage entry for ${labourData.name}. Please try again.`);
              wageEntriesFailed++;
              continue; // Skip to next labour
            }
            
            // Check if this is a linked labour
            if (labourData.isLinked) {
              // Update the linked pair document
              const linkedPairID = labourData.linkedPairID;
              const labourRef = doc(db, 'LABOURS', linkedPairID);
              
              // Verify document exists before updating
              const labourDoc = await getDoc(labourRef);
              if (!labourDoc.exists()) {
                console.error(`❌ Linked labour document ${linkedPairID} does not exist for ${labourData.name}`);
                throw new Error(`Linked labour document ${linkedPairID} not found`);
              }
              
              const linkedUpdateData = {
                'sharedBalance.currentBalance': increment(wageAmount),
                'sharedBalance.totalEarned': increment(wageAmount),
                'sharedBalance.lastUpdated': serverTimestamp()
              };
              
              await updateDoc(labourRef, linkedUpdateData);
            } else {
              // Update individual labour document - use the actual document ID
              const documentID = labourData.documentID || labourData.id; // Use documentID if available, fallback to id
              const labourRef = doc(db, 'LABOURS', documentID);
              
              // Verify document exists before updating
              const labourDoc = await getDoc(labourRef);
              if (!labourDoc.exists()) {
                console.error(`❌ Labour document ${documentID} does not exist for ${labourData.name}`);
                throw new Error(`Labour document ${documentID} not found`);
              }
              
              // Check if the labour has currentBalance field, if not create it
              const updateData = {
                updatedAt: serverTimestamp()
              };
              
              // Update currentBalance if it exists, otherwise create it
              if (labourData.currentBalance !== undefined && !isNaN(labourData.currentBalance)) {
                updateData.currentBalance = increment(wageAmount);
              } else {
                updateData.currentBalance = wageAmount;
              }
              
              // Update totalEarned if it exists, otherwise create it
              if (labourData.totalEarned !== undefined && !isNaN(labourData.totalEarned)) {
                updateData.totalEarned = increment(wageAmount);
              } else {
                updateData.totalEarned = wageAmount;
              }
              
              // Update lastWorkDate
              updateData.lastWorkDate = serverTimestamp();
              
              await updateDoc(labourRef, updateData);
            }

            // Mark as submitted
            setSubmittedWageEntryIDs(prev => [...prev, `${selectedEntry.id}-${labourId}`]);
          } catch (updateError) {
            console.error(`❌ Error updating labour balance for ${labourData.name}:`, updateError);
            toast.error(`Failed to update balance for ${labourData.name}. Wage entry was created but balance update failed.`);
            wageEntriesFailed++;
          }
        } else {
          console.error(`❌ Labour data not found for labourID: ${labourId}`);
          toast.error(`Labour data not found for labourID: ${labourId}`);
        }
      }

      // Show success message with balance update summary
      const updatedLabours = selectedEntry.labours.length;
      
      toast.success(`Wages submitted successfully! Updated balances for ${updatedLabours} labour(s).`);
      setWageSavedNotice(true);
      
      // Refresh labour data to show updated balances
      await fetchLabours();
      
      // Hide notice after 3 seconds
      setTimeout(() => setWageSavedNotice(false), 3000);
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in wage submission:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        selectedEntry: selectedEntry?.id,
        laboursCount: selectedEntry?.labours?.length
      });
      toast.error('Failed to submit wages. Please try again.');
    } finally {
      setSubmittingWages(false);
    }
  };


  // Validate and get current balance for a labour
  const getCurrentBalance = (labourData) => {
    if (labourData.isLinked) {
      const balance = labourData.currentBalance;
      return (balance !== undefined && !isNaN(balance)) ? balance : 0;
    } else {
      const balance = labourData.currentBalance;
      return (balance !== undefined && !isNaN(balance)) ? balance : 0;
    }
  };

  // Enhanced labour lookup function
  const findLabourData = (labourIdentifier) => {
    if (!labourIdentifier) return null;
    
    // Case 1: labourIdentifier is a string (labourID)
    if (typeof labourIdentifier === 'string') {
      return labours.find(l => l.labourID === labourIdentifier);
    }
    
    // Case 2: labourIdentifier is an object with labourID property
    if (typeof labourIdentifier === 'object' && labourIdentifier.labourID) {
      return labours.find(l => l.labourID === labourIdentifier.labourID);
    }
    
    // Case 3: labourIdentifier is an object with id property (fallback)
    if (typeof labourIdentifier === 'object' && labourIdentifier.id) {
      return labours.find(l => l.id === labourIdentifier.id);
    }
    
    console.warn('⚠️ Could not identify labour type:', labourIdentifier);
    return null;
  };

  // Function to close modal and reset all states
  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setSelectedEntry(null);
    setFormData({ labours: [] });
  };

  // Delete all wage entries for a production batch
  const handleDeleteWages = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete all wage entries for this production batch? This will restore labour balances.")) return;
    
    try {
      // Find the production entry
      const productionEntry = productionEntries.find(e => e.id === entryId);
      if (!productionEntry) {
        toast.error("Production entry not found");
        return;
      }
      
      // Query for wage entries
      const wageQuery = query(
        collection(db, 'WAGE_ENTRIES'),
        where("entryID", "==", entryId),
        where("orgID", "==", orgID)
      );
      
      const wageSnapshot = await getDocs(wageQuery);
      
      if (wageSnapshot.empty) {
        toast.info("No wage entries found for this batch");
        return;
      }
      
      // Delete wage entries and restore balances
      const deletePromises = [];
      const balanceRestorePromises = [];
      
      for (const wageDoc of wageSnapshot.docs) {
        const wageData = wageDoc.data();
        
        // Delete wage entry
        deletePromises.push(deleteDoc(doc(db, 'WAGE_ENTRIES', wageDoc.id)));
        
        // Find labour data to restore balance
        const labourData = labours.find(l => l.originalLabourID === wageData.labourID);
        
        if (labourData) {
          if (labourData.isLinked) {
            // Restore linked labour balance
            const labourRef = doc(db, 'LABOURS', labourData.linkedPairID);
            balanceRestorePromises.push(
              updateDoc(labourRef, {
                'sharedBalance.currentBalance': increment(-wageData.wageAmount),
                'sharedBalance.totalEarned': increment(-wageData.wageAmount),
                'sharedBalance.lastUpdated': serverTimestamp()
              })
            );
          } else {
            // Restore individual labour balance
            const labourRef = doc(db, 'LABOURS', labourData.documentID || labourData.id);
            balanceRestorePromises.push(
              updateDoc(labourRef, {
                currentBalance: increment(-wageData.wageAmount),
                totalEarned: increment(-wageData.wageAmount),
                updatedAt: serverTimestamp()
              })
            );
          }
        }
      }
      
      // Execute all operations
      await Promise.all([...deletePromises, ...balanceRestorePromises]);
      
      // Remove from submitted wage entry IDs
      setSubmittedWageEntryIDs(prev => prev.filter(id => !id.startsWith(entryId)));
      
      toast.success(`Deleted ${wageSnapshot.size} wage entries and restored labour balances`);
      
      // Refresh data
      await fetchLabours();
      await fetchEntries();
      
    } catch (error) {
      console.error("Error deleting wage entries:", error);
      toast.error("Failed to delete wage entries");
    }
  };

  // Restore raw material stock (manual addition)
  const handleRestoreRawMaterials = async (rawMaterial1, rawMaterial2, cementBags) => {
    if (!window.confirm("Are you sure you want to add these raw materials back to stock?")) return;
    
    try {
      await updateRawMaterialStock(rawMaterial1, rawMaterial2, cementBags, true);
      toast.success("Raw materials restored to stock successfully");
    } catch (error) {
      console.error("Error restoring raw materials:", error);
      toast.error("Failed to restore raw materials");
    }
  };

  // Delete individual wage entry
  const handleDeleteIndividualWage = async (wageEntryId, labourId, wageAmount) => {
    if (!window.confirm("Are you sure you want to delete this wage entry? This will restore the labour's balance.")) return;
    
    try {
      // Find labour data to restore balance
      const labourData = labours.find(l => l.originalLabourID === labourId);
      
      if (labourData) {
        if (labourData.isLinked) {
          // Restore linked labour balance
          const labourRef = doc(db, 'LABOURS', labourData.linkedPairID);
          await updateDoc(labourRef, {
            'sharedBalance.currentBalance': increment(-wageAmount),
            'sharedBalance.totalEarned': increment(-wageAmount),
            'sharedBalance.lastUpdated': serverTimestamp()
          });
        } else {
          // Restore individual labour balance
          const labourRef = doc(db, 'LABOURS', labourData.documentID || labourData.id);
          await updateDoc(labourRef, {
            currentBalance: increment(-wageAmount),
            totalEarned: increment(-wageAmount),
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Delete the wage entry
      await deleteDoc(doc(db, 'WAGE_ENTRIES', wageEntryId));
      
      // Remove from submitted wage entry IDs
      setSubmittedWageEntryIDs(prev => prev.filter(id => !id.includes(wageEntryId)));
      
      toast.success("Wage entry deleted and labour balance restored");
      
      // Refresh data
      await fetchLabours();
      await fetchEntries();
      
    } catch (error) {
      console.error("Error deleting individual wage entry:", error);
      toast.error("Failed to delete wage entry");
    }
  };

  // Handle entry verification (Admin only)
  const handleVerifyEntry = async (entryId, verify = true) => {
    if (!isAdmin) {
      toast.error("Only admins can verify/unverify entries");
      return;
    }

    try {
      setVerifyingEntry(true);
      const docRef = doc(db, "PRODUCTION_ENTRIES", entryId);
      await updateDoc(docRef, {
        verified: verify,
        verifiedAt: verify ? serverTimestamp() : null,
        verifiedBy: verify ? user?.uid : null,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setProductionEntries(prev =>
        prev.map(entry =>
          entry.id === entryId
            ? {
                ...entry,
                verified: verify,
                verifiedAt: verify ? new Date() : null,
                verifiedBy: verify ? user?.uid : null,
                updatedAt: new Date()
              }
            : entry
        )
      );

      toast.success(`Entry ${verify ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error("Error verifying entry:", error);
      toast.error(`Failed to ${verify ? 'verify' : 'unverify'} entry`);
    } finally {
      setVerifyingEntry(false);
    }
  };

  // Check if entry can be edited/deleted by current user
  const canEditEntry = (entry) => {
    if (isAdmin) return true; // Admins can always edit
    if (isManager) return !entry.verified; // Managers can only edit unverified entries
    return false; // Other roles cannot edit
  };

  // Apply filters to production entries
  const getFilteredEntries = () => {
    if (!productionEntries.length) return [];
    
    return productionEntries.filter(entry => {
      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const entryDate = entry.date?.seconds ? new Date(entry.date.seconds * 1000) : new Date(entry.date);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
        
        if (fromDate && entryDate < fromDate) return false;
        if (toDate && entryDate > toDate) return false;
      }
      
      // Batch number filter
      if (filters.batchNumber && !entry.batchNumber?.toString().includes(filters.batchNumber)) {
        return false;
      }
      
      return true;
    });
  };

  // Conditional rendering logic - moved after all hooks to prevent hooks order violation
  if (orgLoading) {
    return (
      <div style={{
        background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
        minHeight: "100vh",
        paddingBottom: "2rem",
        color: "#f5f5f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
          <div style={{ color: "#8e8e93" }}>Loading organization data...</div>
        </div>
      </div>
    );
  }

  if (!selectedOrg || !orgID) {
    return (
      <div style={{
        background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
        minHeight: "100vh",
        paddingBottom: "2rem",
        color: "#f5f5f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
          <div style={{ color: "#8e8e93" }}>Redirecting to organization selector...</div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{
        background: "radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)",
        minHeight: "100vh",
        paddingBottom: "2rem",
        color: "#f5f5f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#f5f5f7",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "#8e8e93" }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  return (
    <DieselPage>
      <PageHeader
        onBack={onBack || (() => window.history.back())}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      />

      {/* Filter Bar */}
      <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <FilterBar.Actions>
          <Button
            variant="primary"
            onClick={handleAddEntry}
            size="md"
          >
            ➕ Add Production Entry
          </Button>
        </FilterBar.Actions>
        
        <FilterBar.Search
          placeholder="Search Batch Number..."
          value={filters.batchNumber}
          onChange={(e) => setFilters(prev => ({ ...prev, batchNumber: e.target.value }))}
          style={{ width: "200px" }}
        />
      </FilterBar>
      
      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>

        {/* Advanced Filters */}
        <Card style={{ marginBottom: "1rem" }}>
          <DateRangeFilter
            startDate={filters.dateFrom}
            endDate={filters.dateTo}
            onStartDateChange={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
            onEndDateChange={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
            startLabel="Date From"
            endLabel="Date To"
          />
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <Button
                variant="primary"
                onClick={() => setFilters(prev => ({ ...prev, dateFrom: "", dateTo: "" }))}
                size="sm"
              >
                Filter
              </Button>
              <Button
                variant="outline"
                onClick={() => setFilters({
                  dateFrom: "",
                  dateTo: "",
                  batchNumber: ""
                })}
                size="sm"
              >
                Clear
              </Button>
            </div>
        </Card>

        {/* Production Entries Table */}
        <Card style={{ marginTop: "1rem" }}>
          {loadingProduction ? (
            <LoadingState variant="inline" message="Loading production entries..." icon="⏳" />
          ) : getFilteredEntries().length === 0 ? (
            <EmptyState
              message="No production entries found matching the current filters."
              icon="📭"
            />
            ) : (
                         <div style={{
               padding: "2rem",
               background: "rgba(255,255,255,0.02)"
             }}>
               {/* Table Summary Header */}
               <div style={{
                 background: "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)",
                 padding: "1rem 1.5rem",
                 borderRadius: "12px",
                 marginBottom: "1.5rem",
                 border: "1px solid rgba(255,255,255,0.1)",
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "space-between"
               }}>
                 <div style={{
                   fontSize: "1rem",
                   fontWeight: "600",
                   color: "#ffffff"
                 }}>
                   📊 Showing <span style={{ color: "#00c3ff" }}>{getFilteredEntries().length}</span> of <span style={{ color: "#00c3ff" }}>{productionEntries.length}</span> entries
                </div>
                 <div style={{
                   fontSize: "0.9rem",
                   color: "#9ba3ae",
                   padding: "4px 12px",
                   background: "rgba(255,255,255,0.1)",
                   borderRadius: "20px",
                   border: "1px solid rgba(255,255,255,0.2)"
                 }}>
                   {getFilteredEntries().length === productionEntries.length ? "All Entries" : "Filtered Results"}
                 </div>
               </div>

               {/* Enhanced Table Container */}
               <div style={{
                 overflowX: "auto",
                 borderRadius: "12px",
                 border: "1px solid rgba(255,255,255,0.1)",
                 background: "rgba(255,255,255,0.02)"
               }}>
                 <table style={{
                   width: "100%",
                   borderCollapse: "collapse",
                   background: "transparent"
                 }}>
                  <thead>
                     <tr style={{
                       background: "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)",
                       borderBottom: "2px solid rgba(255,255,255,0.1)"
                     }}>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Batch No</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Date</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Raw Mat. 1</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Raw Mat. 2</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Cement</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Production</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "left",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Thappi</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "center",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Labours</th>

                       <th style={{
                         padding: "1rem",
                         textAlign: "center",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Verification</th>
                       <th style={{
                         padding: "1rem",
                         textAlign: "center",
                         color: "#ffffff",
                         fontWeight: "600",
                         fontSize: "0.95rem",
                         borderBottom: "1px solid rgba(255,255,255,0.1)"
                       }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                     {getFilteredEntries().map((entry, index) => (
                       <tr key={entry.id} 
                         className="table-row-hover"
                         style={{
                           background: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                           borderBottom: "1px solid rgba(255,255,255,0.05)",
                           transition: "all 0.2s ease"
                         }}
                       >
                         <td style={{
                           padding: "1rem",
                           fontWeight: "600",
                           color: "#00c3ff"
                         }}>{entry.batchNumber}</td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3"
                         }}>
                          {entry.date?.seconds
                            ? new Date(entry.date.seconds * 1000).toLocaleDateString()
                            : entry.date
                              ? new Date(entry.date).toLocaleDateString()
                              : "N/A"
                          }
                        </td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3"
                         }}>{entry.rawMaterial1 || "0"}</td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3"
                         }}>{entry.rawMaterial2 || "0"}</td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3",
                           fontWeight: "600"
                         }}>{entry.cementBags || "0"}</td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3",
                           fontWeight: "600"
                         }}>{entry.batchProduction || "0"}</td>
                         <td style={{
                           padding: "1rem",
                           color: "#f3f3f3",
                           fontWeight: "600"
                         }}>{entry.thappi || "0"}</td>
                         <td style={{
                           padding: "1rem",
                           textAlign: "center",
                           color: "#f3f3f3",
                           fontWeight: "600"
                         }}>{entry.labours?.length || 0}</td>

                         <td style={{
                           padding: "1rem",
                           textAlign: "center"
                         }}>
                           {/* Verification Status */}
                           {entry.verified ? (
                             <span style={{
                               backgroundColor: "rgba(16,185,129,0.2)",
                               color: "#10b981",
                               padding: "6px 12px",
                               borderRadius: "20px",
                               fontSize: "0.85rem",
                               fontWeight: "600",
                               border: "1px solid rgba(16,185,129,0.3)"
                             }}>✅ Verified</span>
                           ) : (
                             <span style={{
                               backgroundColor: "rgba(156,163,175,0.2)",
                               color: "#9ca3af",
                               padding: "6px 12px",
                               borderRadius: "20px",
                               fontSize: "0.85rem",
                               fontWeight: "600",
                               border: "1px solid rgba(156,163,175,0.3)"
                             }}>⏳ Pending</span>
                           )}
                           
                           {/* Admin Verification Buttons */}
                           {isAdmin && (
                             <div style={{ marginTop: "8px" }}>
                               {entry.verified ? (
                                 <button
                                   onClick={() => handleVerifyEntry(entry.id, false)}
                                   disabled={verifyingEntry}
                                   style={{
                                     background: "rgba(239,68,68,0.2)",
                                     color: "#ef4444",
                                     border: "1px solid rgba(239,68,68,0.3)",
                                     padding: "4px 8px",
                                     borderRadius: "6px",
                                     fontSize: "0.75rem",
                                     fontWeight: "500",
                                     cursor: "pointer",
                                     transition: "all 0.2s ease"
                                   }}
                                   title="Unverify Entry"
                                 >
                                   {verifyingEntry ? "⏳" : "❌ Unverify"}
                                 </button>
                               ) : (
                                 <button
                                   onClick={() => handleVerifyEntry(entry.id, true)}
                                   disabled={verifyingEntry}
                                   style={{
                                     background: "rgba(16,185,129,0.2)",
                                     color: "#10b981",
                                     border: "1px solid rgba(16,185,129,0.3)",
                                     padding: "4px 8px",
                                     borderRadius: "6px",
                                     fontSize: "0.75rem",
                                     fontWeight: "500",
                                     cursor: "pointer",
                                     transition: "all 0.2s ease"
                                   }}
                                   title="Verify Entry"
                                 >
                                   {verifyingEntry ? "⏳" : "✅ Verify"}
                                 </button>
                               )}
                             </div>
                          )}
                        </td>
                         <td style={{
                           padding: "1rem",
                           textAlign: "center"
                         }}>
                           <div style={{
                             display: "flex",
                             gap: "8px",
                             justifyContent: "center",
                             flexWrap: "wrap"
                           }}>
                            <button
                              onClick={() => handleEdit(entry)}
                               disabled={!canEditEntry(entry)}
                               className="action-button-hover"
                               style={{
                                 background: canEditEntry(entry) 
                                   ? "linear-gradient(135deg, #FFD60A 0%, #FFB800 100%)"
                                   : "rgba(156,163,175,0.3)",
                                 color: canEditEntry(entry) ? "#000" : "#9ca3af",
                                 border: "none",
                                 padding: "8px 16px",
                                 borderRadius: "8px",
                                 fontSize: "0.85rem",
                                 fontWeight: "600",
                                 cursor: canEditEntry(entry) ? "pointer" : "not-allowed",
                                 transition: "all 0.2s ease",
                                 boxShadow: canEditEntry(entry) 
                                   ? "0 2px 8px rgba(255,214,10,0.3)"
                                   : "none",
                                 opacity: canEditEntry(entry) ? 1 : 0.6
                               }}
                               title={canEditEntry(entry) 
                                 ? "Edit Production Entry" 
                                 : entry.verified 
                                   ? "Entry is verified and cannot be edited" 
                                   : "You don't have permission to edit this entry"
                               }
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                               disabled={!canEditEntry(entry)}
                               className="action-button-hover"
                               style={{
                                 background: canEditEntry(entry)
                                   ? "linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)"
                                   : "rgba(156,163,175,0.3)",
                                 color: canEditEntry(entry) ? "#fff" : "#9ca3af",
                                 border: "none",
                                 padding: "8px 16px",
                                 borderRadius: "8px",
                                 fontSize: "0.85rem",
                                 fontWeight: "600",
                                 cursor: canEditEntry(entry) ? "pointer" : "not-allowed",
                                 transition: "all 0.2s ease",
                                 boxShadow: canEditEntry(entry)
                                   ? "0 2px 8px rgba(255,107,107,0.3)"
                                   : "none",
                                 opacity: canEditEntry(entry) ? 1 : 0.6
                               }}
                               title={canEditEntry(entry)
                                 ? "Delete Production Entry"
                                 : entry.verified
                                   ? "Entry is verified and cannot be deleted"
                                   : "You don't have permission to delete this entry"
                               }
                            >
                              🗑️ Delete
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                
                                // Initialize editable wages with default calculated values
                                const totalWage = Math.round(
                                  (entry.batchProduction * entry.wagePer1000Units) / 1000 +
                                  (entry.thappi * entry.wagePerThappi) / 1000
                                );
                                const perLabourWage = entry.labours.length > 0 ? Math.round(totalWage / entry.labours.length) : 0;
                                setEditableWages(entry.labours.map(() => perLabourWage));
                                
                                setShowWageModal(true);
                              }}
                               className="action-button-hover"
                               style={{
                                 background: "linear-gradient(135deg, #32D74B 0%, #28A745 100%)",
                                 color: "#fff",
                                 border: "none",
                                 padding: "8px 16px",
                                 borderRadius: "8px",
                                 fontSize: "0.85rem",
                                 fontWeight: "600",
                                 cursor: "pointer",
                                 transition: "all 0.2s ease",
                                 boxShadow: "0 2px 8px rgba(50,215,75,0.3)"
                               }}
                              title="View Wage Distribution"
                            >
                              💰 Wages
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
          )}
        </Card>

        {/* Add Entry Modal */}
        {showModal && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999
          }}>
            <div style={{
              background: "#1f1f1f",
              padding: "2rem",
              borderRadius: "14px",
              boxShadow: "0 6px 32px rgba(0,0,0,0.45)",
              maxWidth: "600px",
              width: "100%",
              color: "#f3f3f3",
              maxHeight: "90vh",
              overflowY: "auto"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem"
              }}>
                <h2 style={{ margin: 0, color: "#00c3ff" }}>
                  {editingEntry ? "Edit Production Entry" : "Add New Production Entry"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "24px",
                    color: "#ff4444",
                    cursor: "pointer"
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.5rem"
                }}>
                  <Input
                    label="Batch Number"
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Raw Material 1"
                    type="text"
                    value={formData.rawMaterial1}
                    onChange={(e) => setFormData({...formData, rawMaterial1: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Raw Material 2"
                    type="text"
                    value={formData.rawMaterial2}
                    onChange={(e) => setFormData({...formData, rawMaterial2: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Cement Bags"
                    type="number"
                    value={formData.cementBags}
                    onChange={(e) => setFormData({...formData, cementBags: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Batch Production"
                    type="number"
                    value={formData.batchProduction}
                    onChange={(e) => setFormData({...formData, batchProduction: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Thappi"
                    type="number"
                    value={formData.thappi}
                    onChange={(e) => setFormData({...formData, thappi: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Wage per 1000 Units Produced"
                    type="number"
                    value={formData.wagePer1000Units}
                    onChange={(e) => setFormData({...formData, wagePer1000Units: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="Wage per 1000 Units Thappi"
                    type="number"
                    value={formData.wagePerThappi}
                    onChange={(e) => setFormData({...formData, wagePerThappi: e.target.value})}
                    required
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1rem", color: "#f3f3f3" }}>Select Labours</h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1rem"
                  }}>
                    {labours.map((labour, index) => (
                      <label key={`${labour.id}-${index}`} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.1)"
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.labours.includes(labour.labourID)}
                          onChange={() => toggleLabourSelection(labour.labourID)}
                          data-labour-id={labour.labourID}
                          data-original-id={labour.originalLabourID}
                          data-is-linked={labour.isLinked}
                        />
                        <div>
                          <div style={{ fontWeight: "600", color: "#f3f3f3" }}>{labour.name}</div>
                          {labour.isLinked && (
                            <div style={{ fontSize: "0.8rem", color: "#9ba3ae" }}>
                              🔗 Linked with {labour.linkedPairName}
                            </div>
                          )}
                          <div style={{ fontSize: "0.8rem", color: "#9ba3ae" }}>ID: {labour.labourID}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <button
                    onClick={() => {
                      // Debug functionality removed
                    }}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "#9ba3ae",
                      cursor: "pointer"
                    }}
                  >
                    Debug Form
                  </button>
                  
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <Button
                      variant="neutral"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                    >
                      {editingEntry ? "Update Entry" : "Save Entry"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Wage Distribution Modal */}
        {showWageModal && selectedEntry && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}>
            <div style={{
              background: "#1f1f1f",
              padding: "2rem",
              borderRadius: "14px",
              boxShadow: "0 6px 32px rgba(0,0,0,0.45)",
              maxWidth: "800px",
              width: "100%",
              color: "#f3f3f3",
              maxHeight: "90vh",
              overflowY: "auto"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem"
              }}>
                <h2 style={{ margin: 0, color: "#00c3ff" }}>
                  💰 Wage Distribution - Batch {selectedEntry.batchNumber}
                </h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      // Debug functionality removed
                    }}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "#9ba3ae",
                      cursor: "pointer"
                    }}
                  >
                    Debug
                  </button>
                  <button
                    onClick={() => setShowWageModal(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "24px",
                      color: "#ff4444",
                      cursor: "pointer"
                    }}
                  >
                    ×
                          </button>
                        </div>
              </div>
              
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  padding: "1rem",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "8px"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "#9ba3ae", marginBottom: "0.5rem" }}>
                      Total Production
                        </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#f3f3f3" }}>
                      {selectedEntry.batchProduction} units
                    </div>
                </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "#9ba3ae", marginBottom: "0.5rem" }}>
                      Thappi
              </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#f3f3f3" }}>
                      {selectedEntry.thappi} units
            </div>
          </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "#9ba3ae", marginBottom: "0.5rem" }}>
                      Total Wage
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#f3f3f3" }}>
                      ₹{Math.round(
                        (selectedEntry.batchProduction * selectedEntry.wagePer1000Units) / 1000 +
                        (selectedEntry.thappi * selectedEntry.wagePerThappi) / 1000
                      )}
                    </div>
                    </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "#9ba3ae", marginBottom: "0.5rem" }}>
                      Labours
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#f3f3f3" }}>
                      {selectedEntry.labours?.length || 0}
                    </div>
                  </div>
                    </div>
                  </div>

              {selectedEntry.labours && selectedEntry.labours.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#f3f3f3" }}>Labour Wages</h4>
                  
                  {/* Information about editing wages */}
                  <div style={{
                    background: "rgba(0, 200, 255, 0.1)",
                    border: "1px solid rgba(0, 200, 255, 0.3)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem",
                    fontSize: "0.9rem"
                  }}>
                    <div style={{ color: "#00c3ff", fontWeight: "600", marginBottom: "0.5rem" }}>
                      💡 Wage Editing Instructions
                    </div>
                    <div style={{ color: "#9ba3ae" }}>
                      • You can edit individual labour wages by clicking on the wage amount input fields below
                    </div>
                    <div style={{ color: "#9ba3ae" }}>
                      • When you change one wage, the remaining amount will be automatically redistributed among other labours
                    </div>
                    <div style={{ color: "#9ba3ae" }}>
                      • Total wage amount remains constant: ₹{Math.round(
                        (selectedEntry.batchProduction * selectedEntry.wagePer1000Units) / 1000 +
                        (selectedEntry.thappi * selectedEntry.wagePerThappi) / 1000
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{
                            padding: "0.75rem",
                            textAlign: "left",
                            color: "#9ba3ae",
                            fontWeight: "600"
                          }}>Labour</th>
                          <th style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            color: "#9ba3ae",
                            fontWeight: "600"
                          }}>
                            Wage (₹) 
                            <span style={{ 
                              fontSize: "0.8rem", 
                              color: "#00c3ff", 
                              marginLeft: "0.5rem",
                              fontWeight: "400"
                            }}>
                              ✏️ Editable
                            </span>
                          </th>
                          <th style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            color: "#9ba3ae",
                            fontWeight: "600"
                          }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntry.labours.map((labour, index) => {
                          // Use enhanced labour lookup function
                          const labourData = findLabourData(labour);
                          const labourID = labourData?.labourID || (typeof labour === 'string' ? labour : labour.labourID || 'Unknown');
                          const isSubmitted = submittedWageEntryIDs.includes(`${selectedEntry.id}-${labourID}`);
                          const defaultWageAmount = Math.round(
                            ((selectedEntry.batchProduction * selectedEntry.wagePer1000Units) / 1000 +
                             (selectedEntry.thappi * selectedEntry.wagePerThappi) / 1000) / selectedEntry.labours.length
                          );
                          
                          // Get editable wage value, fallback to default if not set
                          const editableWage = editableWages[index] !== undefined ? editableWages[index] : defaultWageAmount;
                          
                          return (
                            <tr key={labourID} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "0.75rem" }}>
                                <div>
                                  <div style={{ fontWeight: "600", color: "#f3f3f3" }}>
                                    {labourData?.name || `Labour ID: ${labourID}`}
                                  </div>
                                  {labourData?.isLinked && (
                                    <div style={{ fontSize: "0.8rem", color: "#9ba3ae" }}>
                                      🔗 Linked with {labourData.linkedPairName}
                                    </div>
                                  )}
                                  {!labourData && (
                                    <div style={{ fontSize: "0.8rem", color: "#ff6b6b" }}>
                                      ⚠️ Labour data not found
                          </div>
                                  )}
                    </div>
                              </td>
                              <td style={{ padding: "0.75rem", textAlign: "right" }}>
                                {isSubmitted ? (
                                  <span style={{ fontWeight: "600", color: "#f3f3f3" }}>
                                    ₹{editableWage}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    value={editableWage}
                                    onChange={(e) => handleWageChange(index, parseFloat(e.target.value) || 0)}
                                    style={{
                                      width: "100px",
                                      padding: "0.5rem",
                                      background: "rgba(0, 200, 255, 0.1)",
                                      border: "2px solid rgba(0, 200, 255, 0.4)",
                                      borderRadius: "6px",
                                      color: "#f3f3f3",
                                      textAlign: "right",
                                      fontSize: "0.9rem",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                      transition: "all 0.2s ease"
                                    }}
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    title="Click to edit wage amount"
                                  />
                                )}
                              </td>
                              <td style={{ padding: "0.75rem", textAlign: "center" }}>
                                <span style={{
                                  backgroundColor: isSubmitted 
                                    ? "rgba(50,215,75,0.14)" 
                                    : "rgba(255,214,10,0.18)",
                                  color: isSubmitted 
                                    ? "#32D74B" 
                                    : "#8a6f00",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  fontWeight: "600"
                                }}>
                                  {isSubmitted ? "✅ Submitted" : "⏳ Pending"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Wage Submission Section */}
                  {!submittedWageEntryIDs.some(id => id.startsWith(selectedEntry.id)) && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "1rem" }}>
                        <Button
                          variant="neutral"
                          onClick={() => {
                            // Reset wages to default calculated values
                            const totalWage = Math.round(
                              (selectedEntry.batchProduction * selectedEntry.wagePer1000Units) / 1000 +
                              (selectedEntry.thappi * selectedEntry.wagePerThappi) / 1000
                            );
                            const perLabourWage = selectedEntry.labours.length > 0 ? Math.round(totalWage / selectedEntry.labours.length) : 0;
                            setEditableWages(selectedEntry.labours.map(() => perLabourWage));
                            toast.info("Wages reset to default calculated values");
                          }}
                          style={{ minWidth: "150px" }}
                        >
                          🔄 Reset to Default
                        </Button>
                      </div>
                      
                      <Button
                        variant="primary"
                        onClick={handleWageSubmit}
                        disabled={submittingWages}
                        style={{ minWidth: "200px" }}
                      >
                        {submittingWages ? 'Submitting...' : 'Submit Wages to Labour Records'}
                      </Button>
                  </div>
                  )}
                  
                  {/* Success Notice */}
                  {wageSavedNotice && (
                    <div style={{
                      background: "rgba(50,215,75,0.14)",
                      color: "#32D74B",
                      padding: "1rem",
                      borderRadius: "8px",
                      textAlign: "center",
                      marginTop: "1rem",
                      border: "1px solid rgba(50,215,75,0.3)"
                    }}>
                      ✅ Wages have been successfully saved to labour records!
              </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DieselPage>
  );
};

export default ProductionEntry;
