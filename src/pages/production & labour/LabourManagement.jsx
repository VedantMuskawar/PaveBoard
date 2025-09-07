import React, { useState, useEffect } from 'react';
import { db } from "../../config/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc, addDoc, setDoc, increment } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import './LabourManagement.css';
import { useOrganization } from "../../contexts/OrganizationContext";

// Import reusable UI components
import { 
  Button,
  Modal,
  Input,
  SelectField,
  PageHeader,
  Badge,
  Card,
  Spinner
} from "../../components/ui";

function ManageLabour({ onBack }) {
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Get organization ID from context
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  
  // State
  const [labours, setLabours] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newLabour, setNewLabour] = useState({ 
    name: '', 
    name1: '', 
    name2: '', 
    openingBalance: '', 
    assignedVehicle: '', 
    remarks: '', 
    status: 'Active', 
    tags: [], 
    gender: '' 
  });
  const [vehicleList, setVehicleList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMarried, setIsMarried] = useState(false);
  const [tagFilters, setTagFilters] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  
  // New state for labour accounts system
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalculatingBalances, setRecalculatingBalances] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState(null);
  


  // Get current financial year
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
    return `${year - 1}-${year}`;
  };

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  useEffect(() => {
    setSelectedPeriod(getCurrentFinancialYear());
    fetchLabours();
    fetchVehicles();
    if (isAdmin) {
      fetchLastRecalculationHistory();
    }
  }, [isAdmin]);

  // Fetch last recalculation history
  const fetchLastRecalculationHistory = async () => {
    try {
      const logsQuery = query(
        collection(db, 'ADMIN_LOGS'),
        where("orgID", "==", orgID),
        where("action", "==", "BALANCE_RECALCULATION")
      );
      const logsSnapshot = await getDocs(logsQuery);
      
      if (!logsSnapshot.empty) {
        // Get the most recent recalculation
        const sortedLogs = logsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setLastRecalculation(sortedLogs[0]);
      }
    } catch (error) {
      console.error("Error fetching recalculation history:", error);
    }
  };

  // Fetch all labours
    const fetchLabours = async () => {
    try {
      const laboursSnapshot = await getDocs(collection(db, 'LABOURS'));
      const laboursData = laboursSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      
      // Process labours based on their type
      const processedLabours = laboursData.map(labour => {
        if (labour.type === "linked_pair") {
          // Linked labour pair - display as combined
          return {
            id: labour.id,
            type: "linked_pair",
            name: `${labour.labour1.name} & ${labour.labour2.name}`,
            labourID: `${labour.labour1.labourID} + ${labour.labour2.labourID}`,
            gender: `${labour.labour1.gender} + ${labour.labour2.gender}`,
            tags: [...new Set([...(labour.labour1.tags || []), ...(labour.labour2.tags || [])])],
            assignedVehicle: labour.labour1.assignedVehicle || labour.labour2.assignedVehicle || '',
            openingBalance: labour.sharedBalance?.openingBalance || 0,
            currentBalance: labour.sharedBalance?.currentBalance || 0,
            totalEarned: labour.sharedBalance?.totalEarned || 0,
            totalPaid: labour.sharedBalance?.totalPaid || 0,
            remarks: [labour.labour1.remarks, labour.labour2.remarks].filter(Boolean).join(', '),
            status: labour.status,
            linkedIDs: [labour.labour1.labourID, labour.labour2.labourID],
            isLinked: true,
            // Store original data for ledger
            originalData: labour
          };
        } else {
          // Individual labour
          return {
            ...labour,
            type: "individual",
            isLinked: false,
            linkedIDs: [labour.labourID],
            originalData: labour
          };
        }
      });
      
      setLabours(processedLabours);
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error("Failed to fetch labours");
    }
  };

  // Fetch vehicles
    const fetchVehicles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'VEHICLES'));
      const vehicles = snapshot.docs.map(doc => doc.data().vehicleNo);
      setVehicleList(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  // Search labours
  const handleSearch = (query) => {
    setSearchTerm(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = labours.filter(labour =>
      labour.name.toLowerCase().includes(query.toLowerCase()) ||
      labour.labourID.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
  };

  // Select labour
  const handleLabourSelect = (labour) => {
    setSelectedLabour(labour);
    setSearchResults([]);
    setSearchTerm(labour.name);
    fetchLabourLedger(labour);
  };

  // Fetch labour ledger
  const fetchLabourLedger = async (labour) => {
    if (!labour || !selectedPeriod) return;
    
    setLoading(true);
    try {
      // Parse financial year period
      const [startYear, endYear] = selectedPeriod.split('-');
      const startDate = new Date(parseInt(startYear), 2, 1); // April 1st
      const endDate = new Date(parseInt(endYear), 1, 31); // March 31st
      
      // Get labour IDs to search for
      let labourIDs = [];
      if (labour.isLinked) {
        // For linked labour, get both individual IDs
        labourIDs = labour.linkedIDs;
      } else {
        // For individual labour, get their ID
        labourIDs = [labour.originalData?.labourID || labour.labourID];
      }
      
      // Fetch WAGE_ENTRIES for the period (simplified query to avoid indexing)
      const wageSnapshot = await getDocs(collection(db, "WAGE_ENTRIES"));
      const wageEntries = wageSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter wages for this specific labour and period
      const relevantWages = wageEntries.filter(entry => 
        entry.orgID === orgID &&
        labourIDs.includes(entry.labourID) &&
        entry.date && (
          (entry.date.toDate && entry.date.toDate() >= startDate && entry.date.toDate() <= endDate) ||
          (entry.date >= startDate && entry.date <= endDate)
        )
      );
      
      // Fetch LABOUR_PAYMENTS for the period (simplified query to avoid indexing)
      const paymentSnapshot = await getDocs(collection(db, "LABOUR_PAYMENTS"));
      const paymentEntries = paymentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter payments for this specific labour and period
      const relevantPayments = paymentEntries.filter(entry => 
        entry.orgID === orgID &&
        labourIDs.includes(entry.labourID) &&
        entry.date && (
          (entry.date.toDate && entry.date.toDate() >= startDate && entry.date.toDate() <= endDate) ||
          (entry.date >= startDate && entry.date <= endDate)
        )
      );

      // Fetch LABOUR_LEDGER entries for the period (simplified query to avoid indexing)
      const ledgerSnapshot = await getDocs(collection(db, "LABOUR_LEDGER"));
      const ledgerEntries = ledgerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter LABOUR_LEDGER entries for this specific labour and period
      const relevantLedgerEntries = ledgerEntries.filter(entry => 
        entry.orgID === orgID &&
        labourIDs.includes(entry.labourID) &&
        entry.date && (
          (entry.date.toDate && entry.date.toDate() >= startDate && entry.date.toDate() <= endDate) ||
          (entry.date >= startDate && entry.date <= endDate)
        )
      );
      
      // Process and combine entries
      const processedEntries = processLedgerEntries(relevantWages, relevantPayments, relevantLedgerEntries, labour);
      setLedgerEntries(processedEntries);
      
      // Show success message
      if (processedEntries.length > 0) {
        const wageCount = relevantWages.length;
        const paymentCount = relevantPayments.length;
        const ledgerCount = relevantLedgerEntries.length;
        toast.success(`Loaded ${processedEntries.length} ledger entries for ${labour.name} (${wageCount} wages, ${paymentCount} payments, ${ledgerCount} ledger entries)`);
      } else {
        toast.info(`No ledger entries found for ${labour.name} in ${selectedPeriod}`);
      }
      
    } catch (error) {
      console.error("Error fetching ledger:", error);
      toast.error("Failed to fetch ledger. Please try again.");
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Process ledger entries
  const processLedgerEntries = (wages, payments, ledgerEntries, labour) => {
    const entries = [];
    
    // Group wages by week (Wednesday to Tuesday)
    const weeklyWages = groupWagesByWeek(wages);
    
    // Add weekly wage entries
    Object.entries(weeklyWages).forEach(([tuesdayDate, weekData]) => {
      entries.push({
        id: `wage-${tuesdayDate}`,
        date: new Date(tuesdayDate),
        type: 'credit',
        description: 'Weekly Wages',
        weekRange: weekData.weekRange,
        amount: weekData.totalWage,
        balance: 0, // Will be calculated below
        isWage: true
      });
    });
    
    // Add payment entries
    payments.forEach(payment => {
      entries.push({
        id: `payment-${payment.id}`,
        date: payment.date?.toDate?.() || new Date(payment.date),
        type: 'debit',
        description: payment.paymentMode || 'Payment',
        amount: -payment.amount, // Negative for debit
        balance: 0, // Will be calculated below
        isWage: false
      });
    });

    // Add LABOUR_LEDGER entries as debit transactions
    ledgerEntries.forEach(ledgerEntry => {
      entries.push({
        id: `ledger-${ledgerEntry.id}`,
        date: ledgerEntry.date?.toDate?.() || new Date(ledgerEntry.date),
        type: 'debit',
        description: ledgerEntry.description || ledgerEntry.entryType || 'Ledger Entry',
        amount: -(ledgerEntry.amount || 0), // Negative for debit
        balance: 0, // Will be calculated below
        isWage: false,
        isLedgerEntry: true
      });
    });
    
    // Sort by date
    entries.sort((a, b) => a.date - b.date);
    
    // Calculate running balance
    let runningBalance = labour.openingBalance || 0;
    entries.forEach(entry => {
      runningBalance += entry.amount;
      entry.balance = runningBalance;
    });
    
    return entries;
  };

  // Group wages by week (Wednesday to Tuesday)
  const groupWagesByWeek = (wages) => {
    const weeklyGroups = {};
    
    wages.forEach(wage => {
      const wageDate = wage.date?.toDate?.() || new Date(wage.date);
      const tuesdayDate = getTuesdayOfWeek(wageDate);
      const weekKey = tuesdayDate.toISOString().split('T')[0];
      
      if (!weeklyGroups[weekKey]) {
        weeklyGroups[weekKey] = {
          totalWage: 0,
          transactions: [],
          weekRange: getWeekRange(tuesdayDate)
        };
      }
      
      weeklyGroups[weekKey].totalWage += wage.wageAmount || 0;
      weeklyGroups[weekKey].transactions.push(wage);
    });
    
    return weeklyGroups;
  };

  // Get Tuesday of the week containing the given date
  const getTuesdayOfWeek = (date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 2 = Tuesday
    const daysToTuesday = (2 - dayOfWeek + 7) % 7;
    const tuesday = new Date(date);
    tuesday.setDate(date.getDate() + daysToTuesday);
    return tuesday;
  };

  // Get week range string (Wed 15 Jan - Tue 21 Jan 2024)
  const getWeekRange = (tuesdayDate) => {
    const wednesday = new Date(tuesdayDate);
    wednesday.setDate(tuesdayDate.getDate() - 6); // 6 days before Tuesday
    
    const wednesdayStr = wednesday.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    
    const tuesdayStr = tuesdayDate.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
    
    return `${wednesdayStr} - ${tuesdayStr}`;
  };

  // Form validation
  const isFormValid = () => {
    if (isEditing) {
      // When editing, only validate individual labour fields
      const valid = newLabour.name && 
             newLabour.tags.length > 0 && 
             newLabour.status;
      console.log('Form validation (editing):', { 
        name: !!newLabour.name, 
        tags: newLabour.tags.length, 
        status: !!newLabour.status,
        isValid: valid 
      });
      return valid;
    } else if (isMarried) {
      const valid = newLabour.name1 && 
             newLabour.name2 && 
             newLabour.tags.length > 0 && 
             newLabour.status;
      console.log('Form validation (linked):', { 
        name1: !!newLabour.name1, 
        name2: !!newLabour.name2, 
        tags: newLabour.tags.length, 
        status: !!newLabour.status,
        isValid: valid 
      });
      return valid;
    } else {
      const valid = newLabour.name && 
             newLabour.tags.length > 0 && 
             newLabour.status;
      console.log('Form validation (individual):', { 
        name: !!newLabour.name, 
        tags: newLabour.tags.length, 
        status: !!newLabour.status,
        isValid: valid 
      });
      return valid;
    }
  };

  // Handle form submission
  const handleSubmitLabour = async (e) => {
    e.preventDefault();
    
    console.log('Form submission started with data:', newLabour);
    console.log('Form is valid:', isFormValid());
    
    if (!isFormValid()) {
      console.log('Form validation failed');
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      if (isEditing) {
        // Update existing labour
        const labourRef = doc(db, 'LABOURS', newLabour.id);
        const updateData = {
          name: newLabour.name,
          gender: newLabour.gender || '',
          tags: newLabour.tags,
          assignedVehicle: newLabour.assignedVehicle || '',
          remarks: newLabour.remarks,
          status: newLabour.status,
          openingBalance: parseFloat(newLabour.openingBalance) || 0,
          updatedAt: new Date(),
        };
        
        await updateDoc(labourRef, updateData);
        
        // Update local state
        setLabours(prev => prev.map(labour => 
          labour.id === newLabour.id 
            ? { ...labour, ...updateData }
            : labour
        ));
        
        toast.success(`Labour ${newLabour.name} updated successfully!`);
        setIsEditing(false);
        
      } else if (isMarried) {
        // Create linked labour pair
        const sharedGeneralID = `G${Date.now().toString().slice(-8)}`;
        const labourID1 = `L${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
        const labourID2 = `L${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;

        // Create single linked labour document
        const linkedLabourDoc = {
          id: sharedGeneralID, // Use generalID as document ID
          type: "linked_pair",
          orgID,
          
          // Labour 1 details
          labour1: {
            labourID: labourID1,
            name: newLabour.name1,
            gender: newLabour.gender,
            tags: newLabour.tags,
            assignedVehicle: newLabour.assignedVehicle || '',
            remarks: newLabour.remarks,
            status: newLabour.status,
            individualWages: [],
            lastWorkDate: null
          },
          
          // Labour 2 details
          labour2: {
            labourID: labourID2,
            name: newLabour.name2,
            gender: newLabour.gender === "Male" ? "Female" : "Male",
            tags: newLabour.tags,
            assignedVehicle: newLabour.assignedVehicle || '',
            remarks: newLabour.remarks,
            status: newLabour.status,
            individualWages: [],
            lastWorkDate: null
          },
          
          // Shared financial data
          sharedBalance: {
            openingBalance: parseFloat(newLabour.openingBalance) || 0,
            currentBalance: parseFloat(newLabour.openingBalance) || 0,
            totalEarned: 0,
            totalPaid: 0
          },
          
          // History arrays
          wageHistory: [],
          paymentHistory: [],
          
          // Metadata
          status: newLabour.status,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Save as single document
        await setDoc(doc(db, 'LABOURS', sharedGeneralID), linkedLabourDoc);
        toast.success(`Linked labour pair created successfully!`);
        
      } else {
        // Create individual labour
        const labourID = `L${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
        await addDoc(collection(db, 'LABOURS'), {
          id: labourID,
          type: "individual",
          orgID,
          labourID: labourID,
          name: newLabour.name,
          gender: newLabour.gender || '',
          tags: newLabour.tags,
          assignedVehicle: newLabour.assignedVehicle || '',
          remarks: newLabour.remarks,
          status: newLabour.status,
          openingBalance: parseFloat(newLabour.openingBalance) || 0,
          currentBalance: parseFloat(newLabour.openingBalance) || 0,
          totalEarned: 0,
          totalPaid: 0,
          wageHistory: [],
          paymentHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success(`Labour ${newLabour.name} created successfully!`);
      }

      // Reset form and close modal
      setNewLabour({ name: '', name1: '', name2: '', openingBalance: '', assignedVehicle: '', remarks: '', status: 'Active', tags: [], gender: '' });
      setIsMarried(false);
      setIsEditing(false);
      setShowModal(false);
      
      // Refresh labour list
      fetchLabours();
      
    } catch (error) {
      console.error("Error creating labour:", error);
      toast.error("Failed to create labour. Please try again.");
    }
  };

  // Filter labours for display
  const filteredLabours = labours.filter(labour =>
    labour.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (tagFilters.length === 0 || tagFilters.some(tag => (labour.tags || []).includes(tag))) &&
    (statusFilter === "" || labour.status === statusFilter)
  );

  // Recalculate all labour balances using ledger data
  const handleRecalculateAllBalances = async () => {
    if (!window.confirm("This will recalculate all labour balances using ledger data. This action cannot be undone. Continue?")) {
      return;
    }

    setRecalculatingBalances(true);
    
    try {
      // Create backup log
      const backupLog = {
        timestamp: new Date().toISOString(),
        action: "BALANCE_RECALCULATION",
        orgID,
        adminUser: selectedOrg?.member?.phoneNumber || selectedOrg?.phoneNumber || "Unknown",
        changes: []
      };

      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalErrors = 0;

      // Process each labour
      for (const labour of labours) {
        try {
          totalProcessed++;
          
          // Calculate accurate balance from ledger data
          let calculatedBalance = 0;
          
          if (labour.type === "linked_pair") {
            // For linked pairs, use shared balance calculation
            const openingBalance = labour.sharedBalance?.openingBalance || 0;
            
            // Get total wages for this linked pair
            const wagesQuery = query(
              collection(db, 'WAGE_ENTRIES'),
              where("orgID", "==", orgID),
              where("labourID", "in", [labour.labour1?.labourID, labour.labour2?.labourID])
            );
            const wagesSnapshot = await getDocs(wagesQuery);
            const totalWages = wagesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().wageAmount || 0), 0);
            
            // Get total ledger entries (payments/withdrawals)
            const ledgerQuery = query(
              collection(db, 'LABOUR_LEDGER'),
              where("orgID", "==", orgID),
              where("labourID", "in", [labour.labour1?.labourID, labour.labour2?.labourID])
            );
            const ledgerSnapshot = await getDocs(ledgerQuery);
            const totalLedgerEntries = ledgerSnapshot.docs.reduce((sum, doc) => {
              const data = doc.data();
              return sum + (data.transactionType === 'credit' ? data.amount : -data.amount);
            }, 0);
            
            calculatedBalance = openingBalance + totalWages - totalLedgerEntries;
            
          } else {
            // For individual labours
            const openingBalance = labour.openingBalance || 0;
            
            // Get total wages
            const wagesQuery = query(
              collection(db, 'WAGE_ENTRIES'),
              where("orgID", "==", orgID),
              where("labourID", "==", labour.labourID)
            );
            const wagesSnapshot = await getDocs(wagesQuery);
            const totalWages = wagesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().wageAmount || 0), 0);
            
            // Get total ledger entries
            const ledgerQuery = query(
              collection(db, 'LABOUR_LEDGER'),
              where("orgID", "==", orgID),
              where("labourID", "==", labour.labourID)
            );
            const ledgerSnapshot = await getDocs(ledgerQuery);
            const totalLedgerEntries = ledgerSnapshot.docs.reduce((sum, doc) => {
              const data = doc.data();
              return sum + (data.transactionType === 'credit' ? data.amount : -data.amount);
            }, 0);
            
            calculatedBalance = openingBalance + totalWages - totalLedgerEntries;
          }
          
          // Check if balance needs updating
          const currentBalance = labour.type === "linked_pair" 
            ? (labour.sharedBalance?.currentBalance || 0)
            : (labour.currentBalance || 0);
            
          if (Math.abs(calculatedBalance - currentBalance) > 0.01) { // Allow for small rounding differences
            // Update the balance
            if (labour.type === "linked_pair") {
              await updateDoc(doc(db, 'LABOURS', labour.id), {
                'sharedBalance.currentBalance': calculatedBalance,
                updatedAt: new Date()
              });
            } else {
              await updateDoc(doc(db, 'LABOURS', labour.id), {
                currentBalance: calculatedBalance,
                updatedAt: new Date()
              });
            }
            
            totalUpdated++;
            
            // Log the change
            backupLog.changes.push({
              labourID: labour.labourID || labour.id,
              name: labour.name,
              oldBalance: currentBalance,
              newBalance: calculatedBalance,
              difference: calculatedBalance - currentBalance
            });
          }
          
        } catch (error) {
          totalErrors++;
          console.error(`Error processing labour ${labour.name}:`, error);
        }
      }
      
      // Save backup log to Firestore
      try {
        await addDoc(collection(db, 'ADMIN_LOGS'), {
          ...backupLog,
          summary: {
            totalProcessed,
            totalUpdated,
            totalErrors
          }
        });
      } catch (logError) {
        console.error("Failed to save backup log:", logError);
      }
      
      // Show results
      if (totalErrors === 0) {
        toast.success(`✅ Balance recalculation completed! Processed: ${totalProcessed}, Updated: ${totalUpdated}`);
      } else {
        toast.warning(`⚠️ Balance recalculation completed with errors. Processed: ${totalProcessed}, Updated: ${totalUpdated}, Errors: ${totalErrors}`);
      }
      
      // Refresh labour data and history
      await fetchLabours();
      await fetchLastRecalculationHistory();
      
    } catch (error) {
      console.error("Error in balance recalculation:", error);
      toast.error("Failed to recalculate balances. Please try again.");
    } finally {
      setRecalculatingBalances(false);
    }
  };

  // Print balance report function
  const handlePrintBalance = () => {
    const printWindow = window.open('', '_blank');
    const laboursToPrint = filteredLabours.length > 0 ? filteredLabours : labours;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Labour Balance Report</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            
            .header p {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
            
            .print-container {
              display: flex;
              justify-content: space-between;
              gap: 20px;
            }
            
            .left-section, .right-section {
              flex: 1;
              text-align: center;
            }
            
            .section-header {
              background: #f0f0f0;
              padding: 10px;
              margin-bottom: 15px;
              border-radius: 5px;
              font-weight: bold;
              font-size: 14px;
            }
            
            .labour-row {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
              font-size: 12px;
            }
            
            .labour-row:nth-child(even) {
              background: #f9f9f9;
            }
            
            .labour-name {
              font-weight: bold;
              color: #333;
            }
            
            .labour-tags {
              color: #666;
            }
            
            .labour-balance {
              font-weight: bold;
              color: #2c5aa0;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              font-size: 12px;
              color: #666;
            }
            
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LABOUR BALANCE REPORT</h1>
            <p>Organization: ${selectedOrg?.name || 'N/A'}</p>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Total Labours: ${laboursToPrint.length}</p>
          </div>
          
          <div class="print-container">
            <div class="left-section">
              <div class="section-header">
                <div class="labour-row">
                  <div>NAME</div>
                  <div>TAGS</div>
                  <div>BALANCE</div>
                </div>
              </div>
              ${laboursToPrint.slice(0, Math.ceil(laboursToPrint.length / 2)).map(labour => `
                <div class="labour-row">
                  <div class="labour-name">${labour.name || 'N/A'}</div>
                  <div class="labour-tags">${(labour.tags || []).join(', ') || 'No tags'}</div>
                  <div class="labour-balance">₹${(labour.type === "linked_pair" ? (labour.sharedBalance?.currentBalance || 0) : (labour.currentBalance || 0)).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="right-section">
              <div class="section-header">
                <div class="labour-row">
                  <div>NAME</div>
                  <div>TAGS</div>
                  <div>BALANCE</div>
                </div>
              </div>
              ${laboursToPrint.slice(Math.ceil(laboursToPrint.length / 2)).map(labour => `
                <div class="labour-row">
                  <div class="labour-name">${labour.name || 'N/A'}</div>
                  <div class="labour-tags">${(labour.tags || []).join(', ') || 'No tags'}</div>
                  <div class="labour-balance">₹${(labour.type === "linked_pair" ? (labour.sharedBalance?.currentBalance || 0) : (labour.currentBalance || 0)).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="footer">
            <p>This report was generated from the Labour Management System</p>
            <p>Page 1 of 1</p>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              🖨️ Print Report
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
              ❌ Close
            </button>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="manage-labour-container">
      <PageHeader 
        title="Manage Labour"
        onBack={onBack}
        role={isAdmin ? "admin" : "manager"}
      />

      {/* Admin Balance Recalculation Section */}
      {isAdmin && (
        <div style={{
          margin: "1rem 2rem",
          padding: "1.5rem",
          background: "rgba(255, 193, 7, 0.1)",
          border: "1px solid rgba(255, 193, 7, 0.3)",
          borderRadius: "8px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem"
          }}>
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#ffc107", fontSize: "1rem" }}>
                ⚠️ Balance Recalculation Tool
              </h3>
              <p style={{ margin: 0, color: "#9ba3ae", fontSize: "0.9rem" }}>
                Recalculate all labour balances using ledger data to fix discrepancies
              </p>
            </div>
            <button
              onClick={handleRecalculateAllBalances}
              disabled={recalculatingBalances}
              style={{
                background: recalculatingBalances ? "rgba(255, 193, 7, 0.3)" : "rgba(255, 193, 7, 0.2)",
                border: "1px solid rgba(255, 193, 7, 0.4)",
                color: "#ffc107",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                cursor: recalculatingBalances ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
            >
              {recalculatingBalances ? "🔄 Recalculating..." : "🔄 Recalculate All Balances"}
            </button>
          </div>
          
          {/* Last Recalculation History */}
          {lastRecalculation && (
            <div style={{
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1rem"
            }}>
              <h4 style={{ margin: "0 0 0.75rem 0", color: "#00c3ff", fontSize: "0.9rem" }}>
                📊 Last Recalculation History
              </h4>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                fontSize: "0.85rem"
              }}>
                <div>
                  <span style={{ color: "#9ba3ae" }}>🕒 Date: </span>
                  <span style={{ color: "#f3f3f3" }}>
                    {new Date(lastRecalculation.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#9ba3ae" }}>👤 Admin: </span>
                  <span style={{ color: "#f3f3f3" }}>
                    {lastRecalculation.adminUser?.slice(0, 8)}...
                  </span>
                </div>
                <div>
                  <span style={{ color: "#9ba3ae" }}>📋 Processed: </span>
                  <span style={{ color: "#32D74B" }}>
                    {lastRecalculation.summary?.totalProcessed || 0} labours
                  </span>
                </div>
                <div>
                  <span style={{ color: "#9ba3ae" }}>✅ Updated: </span>
                  <span style={{ color: "#00c3ff" }}>
                    {lastRecalculation.summary?.totalUpdated || 0} balances
                  </span>
                </div>
                {lastRecalculation.summary?.totalErrors > 0 && (
                  <div>
                    <span style={{ color: "#9ba3ae" }}>⚠️ Errors: </span>
                    <span style={{ color: "#ff6b6b" }}>
                      {lastRecalculation.summary.totalErrors} issues
                    </span>
                  </div>
                )}
              </div>
              
              {/* Show recent changes if any */}
              {lastRecalculation.changes && lastRecalculation.changes.length > 0 && (
                <details style={{ marginTop: "1rem" }}>
                  <summary style={{ 
                    color: "#ffc107", 
                    cursor: "pointer", 
                    fontSize: "0.85rem",
                    fontWeight: "600"
                  }}>
                    🔍 View Recent Changes ({lastRecalculation.changes.length} updates)
                  </summary>
                  <div style={{
                    marginTop: "0.75rem",
                    maxHeight: "200px",
                    overflowY: "auto",
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "4px",
                    padding: "0.75rem"
                  }}>
                    {lastRecalculation.changes.slice(0, 10).map((change, index) => (
                      <div key={index} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0",
                        borderBottom: index < lastRecalculation.changes.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none"
                      }}>
                        <span style={{ color: "#f3f3f3", fontSize: "0.8rem" }}>
                          {change.name} ({change.labourID})
                        </span>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem" }}>
                          <span style={{ color: "#9ba3ae" }}>
                            ₹{change.oldBalance} → ₹{change.newBalance}
                          </span>
                          <span style={{ 
                            color: change.difference > 0 ? "#32D74B" : "#ff6b6b",
                            fontWeight: "600"
                          }}>
                            {change.difference > 0 ? "+" : ""}₹{change.difference}
                          </span>
                        </div>
                      </div>
                    ))}
                    {lastRecalculation.changes.length > 10 && (
                      <div style={{ 
                        textAlign: "center", 
                        color: "#9ba3ae", 
                        fontSize: "0.8rem",
                        padding: "0.5rem 0"
                      }}>
                        ... and {lastRecalculation.changes.length - 10} more changes
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main content container with consistent spacing */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="main-content">
        {/* Search and Add Section */}
        <div className="search-add-section">
          <Button
            variant="primary"
            onClick={() => {
              setNewLabour({ name: '', name1: '', name2: '', openingBalance: '', assignedVehicle: '', remarks: '', status: 'Active', tags: [], gender: '' });
              setShowModal(true);
            }}
          >
            Add Labour
          </Button>

          <div className="search-container">
            <Input
              type="text"
              placeholder="🔍 Search Labour by name or ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              leftIcon="🔍"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((labour) => (
                  <div
                    key={labour.id}
                    className="search-result-item"
                    onClick={() => handleLabourSelect(labour)}
                  >
                    <div className="result-name">{labour.name}</div>
                    <div className="result-id">{labour.labourID}</div>
                    <div className="result-tags">
                      {labour.tags?.join(', ') || 'No tags'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Period Selection */}
        {selectedLabour && (
          <div className="period-selection">
            <div className="selected-labour">
              <span className="label">Selected Labour:</span>
              <span className="value">{selectedLabour.name}</span>
            </div>
            <div className="period-picker">
              <span className="label">Period:</span>
              <SelectField
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={[
                  { value: "2023-24", label: "2023-24" },
                  { value: "2024-25", label: "2024-25" },
                  { value: "2025-26", label: "2025-26" }
                ]}
                size="sm"
                className="period-select"
              />
            </div>
          </div>
        )}

        {/* Ledger Section */}
        {selectedLabour && (
          <div className="ledger-section">
            <div className="ledger-header">
              <h3>Ledger for {selectedLabour.name}</h3>
              <span className="period-info">Period: {selectedPeriod}</span>
            </div>
            
            {loading ? (
              <div className="loading">
                <Spinner />
                <span style={{ marginLeft: "0.5rem" }}>Loading ledger...</span>
              </div>
            ) : ledgerEntries.length > 0 ? (
              <div className="ledger-content">
                <div className="ledger-table-container">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Credit</th>
                        <th>Debit</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className={`ledger-row ${entry.type}`}>
                          <td className="entry-date">
                            <div className="date-main">
                              {entry.date.toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </div>
                            {entry.isWage && entry.weekRange && (
                              <div className="week-range">{entry.weekRange}</div>
                            )}
                          </td>
                          <td className="entry-description">
                            {entry.description}
                            {entry.isLedgerEntry && (
                              <span className="ledger-entry-badge">Ledger</span>
                            )}
                          </td>
                          <td className="entry-credit">
                            {entry.type === 'credit' ? (
                              <span className="credit-amount">₹{entry.amount.toLocaleString()}</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="entry-debit">
                            {entry.type === 'debit' ? (
                              <span className="debit-amount">₹{Math.abs(entry.amount).toLocaleString()}</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="entry-balance">
                            <span className="running-balance">₹{entry.balance.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
        </div>

                {/* Current Balance Footer */}
                <div className="ledger-footer">
                  <div className="current-balance">
                    <span className="balance-label">Current Balance:</span>
                    <span className="balance-amount">
                      ₹{ledgerEntries.length > 0 ? 
                        ledgerEntries[ledgerEntries.length - 1].balance.toLocaleString() : 
                        (selectedLabour.openingBalance || 0).toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="balance-summary">
                    <div className="summary-item">
                      <span className="label">Total Credits:</span>
                      <span className="value">
                        ₹{ledgerEntries
                          .filter(entry => entry.type === 'credit')
                          .reduce((sum, entry) => sum + entry.amount, 0)
                          .toLocaleString()
                        }
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Total Debits:</span>
                      <span className="value">
                        ₹{Math.abs(ledgerEntries
                          .filter(entry => entry.type === 'debit')
                          .reduce((sum, entry) => sum + entry.amount, 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Ledger Entries:</span>
                      <span className="value">
                        {ledgerEntries.filter(entry => entry.isLedgerEntry).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-ledger">
                <div className="empty-icon">📊</div>
                <h4>No Ledger Entries</h4>
                <p>No wages, payments, or ledger entries found for {selectedLabour.name} in {selectedPeriod}</p>
              </div>
            )}
          </div>
        )}

        {/* Existing Labour Table - Keep for now */}
        <div className="labour-table-section">
          <h3>All Labours</h3>
          
          {/* Table Filters */}
          <div style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1rem",
            padding: "1rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#9ba3ae", fontSize: "0.9rem" }}>🔍 Filter by Tags:</span>
              <SelectField
                value={tagFilters.length > 0 ? tagFilters[0] : ""}
                onChange={(value) => {
                  if (value === "") {
                    setTagFilters([]);
                  } else {
                    setTagFilters([value]);
                  }
                }}
                options={[
                  { value: "", label: "All Tags" },
                  ...Array.from(new Set(labours.flatMap(labour => labour.tags || []))).map(tag => ({
                    value: tag,
                    label: tag
                  }))
                ]}
                size="sm"
                className="filter-select"
              />
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#9ba3ae", fontSize: "0.9rem" }}>📊 Status:</span>
              <SelectField
                value={statusFilter || ""}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: "All Status" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" }
                ]}
                size="sm"
                className="filter-select"
              />
            </div>
            
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setTagFilters([]);
                setStatusFilter("");
                setSearchTerm("");
              }}
            >
              🗑️ Clear All Filters
            </Button>
            
            <div style={{ 
              marginLeft: "auto", 
              color: "#9ba3ae", 
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "4px"
            }}>
              📊 Showing {filteredLabours.length} of {labours.length} labours
            </div>
            
            <Button
              variant="primary"
              size="md"
              onClick={handlePrintBalance}
            >
              🖨️ Print Balance Report
            </Button>
          </div>
          
          <div className="table-container">
            <table className="labour-table">
            <thead>
              <tr>
                  <th>No.</th>
                  <th>Labour ID</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Tags</th>
                  <th>Vehicle</th>
                  <th>Opening Balance</th>
                  <th>Current Balance</th>
                  <th>Remarks</th>
                  <th>Status</th>
                  <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabours.map((labour, index) => (
                  <tr key={`${labour.id}-${index}`} 
                    className={`table-row ${labour.isLinked ? 'linked-pair-row' : ''}`}
                  >
                    <td>{index + 1}</td>
                    <td className="labour-id-cell">
                      {labour.isLinked ? (
                        <div className="linked-labour-id">
                          <span className="id-text">{labour.labourID}</span>
                          <span className="link-badge">Linked Pair</span>
                        </div>
                      ) : (
                        <span>{labour.labourID}</span>
                      )}
                    </td>
                    <td className="labour-name-cell">
                      {labour.isLinked ? (
                        <div className="linked-labour-name">
                          <span className="name-text">{labour.name}</span>
                        </div>
                      ) : (
                        labour.name
                      )}
                    </td>
                    <td className="labour-gender-cell">
                      {labour.isLinked ? (
                        <div className="linked-labour-gender">
                          <span className="gender-text">{labour.gender}</span>
                        </div>
                      ) : (
                        labour.gender
                      )}
                    </td>
                    <td>{(labour.tags || []).join(', ')}</td>
                    <td>{labour.assignedVehicle}</td>
                    <td className="balance-cell">
                      {labour.isLinked ? (
                        <div className="linked-balance">
                          <span className="balance-amount">₹{labour.openingBalance?.toLocaleString() || '0'}</span>
                        </div>
                      ) : (
                        <span>₹{labour.openingBalance?.toLocaleString() || '0'}</span>
                      )}
                    </td>
                    <td className="balance-cell">
                      {labour.isLinked ? (
                        <div className="linked-balance">
                          <span className="balance-amount">₹{labour.currentBalance?.toLocaleString() || '0'}</span>
                        </div>
                      ) : (
                        <span>₹{labour.currentBalance?.toLocaleString() || '0'}</span>
                      )}
                    </td>
                    <td className="remarks-cell">
                      {labour.isLinked ? (
                        <div className="linked-remarks">
                          <span>{labour.remarks || 'Combined account'}</span>
                        </div>
                      ) : (
                        labour.remarks
                      )}
                    </td>
                    <td className="status-cell">
                      {labour.isLinked ? (
                        <div className="linked-status">
                          <span>{labour.status}</span>
                        </div>
                      ) : (
                        labour.status
                      )}
                    </td>
                    <td className="actions-cell">
                      {isAdmin && (
                        <>
                          <Button
                            variant="edit"
                            size="sm"
                            onClick={() => {
                              // Set the labour data for editing
                              setNewLabour({
                                name: labour.name,
                                name1: labour.name1 || '',
                                name2: labour.name2 || '',
                                openingBalance: labour.openingBalance || '',
                                assignedVehicle: labour.assignedVehicle || '',
                                remarks: labour.remarks || '',
                                status: labour.status || 'Active',
                                tags: labour.tags || [],
                                gender: labour.gender || '',
                                id: labour.id // Store the ID for editing
                              });
                              setIsEditing(true);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="delete"
                            size="sm"
                            onClick={async () => {
                              try {
                                if (labour.isLinked) {
                                  await deleteDoc(doc(db, 'LABOURS', labour.id));
                                } else {
                                  await deleteDoc(doc(db, 'LABOURS', labour.id));
                                }
                                
                                setLabours(prev => prev.filter(l => l.id !== labour.id));
                                toast.success("Labour deleted successfully");
                              } catch (err) {
                                console.error("Error deleting labour:", err);
                                toast.error("Failed to delete labour");
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                      {!isAdmin && (
                        <span style={{ color: "#9ba3ae", fontSize: "0.8rem" }}>
                          View Only
                        </span>
                      )}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        {/* Add Labour Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setNewLabour({ name: '', name1: '', name2: '', openingBalance: '', assignedVehicle: '', remarks: '', status: 'Active', tags: [], gender: '' });
            setIsMarried(false);
            setIsEditing(false);
          }}
          title={isEditing ? 'Edit Labour' : 'Add New Labour'}
          size="lg"
        >
              
              <div className="modal-body">
                <form onSubmit={handleSubmitLabour} className="labour-form">
                  {/* Labour Type Selection - Only show when adding new labour */}
                  {!isEditing && (
                    <div className="form-section">
                      <h3>Labour Type</h3>
                      <div className="labour-type-options">
                        <label className="type-option">
                        <input
                          type="radio"
                            name="labourType"
                            value="individual"
                            checked={!isMarried}
                            onChange={() => setIsMarried(false)}
                          />
                          <span className="option-content">
                            <span className="option-icon">👤</span>
                            <span className="option-text">
                              <strong>Individual Labour</strong>
                              <small>Single person</small>
                            </span>
                          </span>
                      </label>
                        
                        <label className="type-option">
                        <input
                          type="radio"
                            name="labourType"
                            value="linked"
                          checked={isMarried}
                          onChange={() => setIsMarried(true)}
                        />
                        <span className="option-content">
                          <span className="option-icon">👫</span>
                          <span className="option-text">
                            <strong>Linked Labour</strong>
                            <small>Married couple / Family</small>
                          </span>
                        </span>
                    </label>
                  </div>
                  </div>
                  )}

                  {/* Individual Labour Fields */}
                  {(!isMarried || isEditing) && (
                    <div className="form-section">
                      <h3>Individual Details</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <Input
                            label="Name *"
                            type="text"
                            value={newLabour.name || ''}
                            onChange={(e) => setNewLabour({...newLabour, name: e.target.value})}
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <SelectField
                            label="Gender"
                            value={newLabour.gender}
                            onChange={(value) => setNewLabour({...newLabour, gender: value})}
                            options={[
                              { value: "", label: "Select Gender" },
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" },
                              { value: "Other", label: "Other" }
                            ]}
                          />
                        </div>
                      </div>
                  </div>
                )}

                  {/* Linked Labour Fields */}
                  {isMarried && !isEditing && (
                    <div className="form-section">
                      <h3>Linked Labour Details</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <Input
                            label="First Person Name *"
                            type="text"
                            value={newLabour.name1}
                            onChange={(e) => setNewLabour({...newLabour, name1: e.target.value})}
                            placeholder="Enter first person name"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <Input
                            label="Second Person Name *"
                            type="text"
                            value={newLabour.name2}
                            onChange={(e) => setNewLabour({...newLabour, name2: e.target.value})}
                            placeholder="Enter second person name"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <SelectField
                            label="First Person Gender"
                            value={newLabour.gender}
                            onChange={(value) => setNewLabour({...newLabour, gender: value})}
                            options={[
                              { value: "", label: "Select Gender" },
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" }
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <SelectField
                            label="Second Person Gender"
                            value={newLabour.gender === "Male" ? "Female" : "Male"}
                            onChange={() => {}} // Disabled, auto-selected
                            options={[
                              { value: "", label: "Auto-selected" },
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" }
                            ]}
                            disabled={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Fields */}
                  <div className="form-section">
                    <h3>Labour Details</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <SelectField
                          label="Assigned Vehicle"
                          value={newLabour.assignedVehicle || ''}
                          onChange={(value) => setNewLabour({...newLabour, assignedVehicle: value})}
                          options={[
                            { value: "", label: "No Vehicle Assigned" },
                            ...vehicleList.map(vehicle => ({
                              value: vehicle,
                              label: vehicle
                            }))
                          ]}
                        />
                        <small className="text-slate-400 text-sm mt-1">Optional - Production workers, loaders, and unloaders typically don't need assigned vehicles</small>
                      </div>
                      <div className="form-group">
                        <SelectField
                          label="Status"
                          value={newLabour.status || ''}
                          onChange={(value) => setNewLabour({...newLabour, status: value})}
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            { value: "On Leave", label: "On Leave" }
                          ]}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Opening Balance"
                        type="number"
                        value={newLabour.openingBalance}
                        onChange={(e) => setNewLabour({...newLabour, openingBalance: e.target.value})}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>Labour Tags *</label>
                      <div className="tags-container">
                        {['Driver', 'Loader', 'Unloader', 'Production'].map(tag => (
                          <label key={tag} className="tag-option">
                            <input
                              type="checkbox"
                              checked={newLabour.tags.includes(tag)}
                              onChange={(e) => {
                                const updatedTags = e.target.checked
                                  ? [...newLabour.tags, tag]
                                  : newLabour.tags.filter(t => t !== tag);
                                setNewLabour({...newLabour, tags: updatedTags});
                              }}
                            />
                            <span className="tag-text">{tag}</span>
                          </label>
                ))}
              </div>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-medium text-slate-200 mb-2">Remarks</label>
                      <textarea
                        value={newLabour.remarks}
                        onChange={(e) => setNewLabour({...newLabour, remarks: e.target.value})}
                        placeholder="Any additional notes..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400 px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        setNewLabour({ name: '', name1: '', name2: '', openingBalance: '', assignedVehicle: '', remarks: '', status: 'Active', tags: [], gender: '' });
                        setIsMarried(false);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!isFormValid()}
                    >
                      {isEditing ? 'Update Labour' : (isMarried ? 'Create Linked Labour' : 'Create Labour')}
                    </Button>
                  </div>
                </form>
              </div>
        </Modal>
        </div>
      </div>
    </div>
  );
}

export default ManageLabour;