import React, { useState, useEffect, useRef } from "react";
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
  serverTimestamp, 
  increment,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { useOrganization } from "../../contexts/OrganizationContext";
import { 
  Button,
  Card,
  Modal,
  Input,
  SelectField,
  DatePicker,
  ActionButton,
  DataTable,
  LoadingState,
  EmptyState,
  PageHeader,
  SectionCard,
  DieselPage
} from "../../components/ui";
import './ExpenseManagement.css';

const ExpensesManagement = ({ onBack }) => {
  // Auth context
  const { user } = useAuth();
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  
  // State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [labours, setLabours] = useState([]);
  const [filteredLabours, setFilteredLabours] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [selectedLabour, setSelectedLabour] = useState(null);
  
  // Form states
  const [expenseType, setExpenseType] = useState("LABOUR");
  const [labourID, setLabourID] = useState("");
  const [labourSearch, setLabourSearch] = useState("");
  const [paymentType, setPaymentType] = useState("wages");
  const [toAccount, setToAccount] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Raw material expense states
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [rawMaterialType, setRawMaterialType] = useState("RAW_MATERIAL_1");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  
  // Search and filter states
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
  
  // Refs
  const fileInputRef = useRef(null);
  
  // Store unsubscribe functions for cleanup
  const [expensesUnsubscribe, setExpensesUnsubscribe] = useState(null);

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  // Effects
  useEffect(() => {
    fetchPendingPayments();
    fetchVendors();
  }, [orgID]);

  // Refetch expenses when date filter changes
  useEffect(() => {
    fetchPendingPayments();
  }, [selectedFilterDate]);

  // Check if there are any expenses at all in the collection
  const checkForAnyExpenses = async () => {
    try {
      const q = query(
        collection(db, "EXPENSES"),
        where("orgID", "==", orgID),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      console.log('🔍 Check for any expenses:', {
        hasExpenses: !snapshot.empty,
        count: snapshot.size,
        orgID: orgID
      });
      
      if (!snapshot.empty) {
        const sample = snapshot.docs[0].data();
        console.log('📋 Sample expense structure:', {
          id: snapshot.docs[0].id,
          date: sample.date,
          dateType: typeof sample.date,
          hasToDate: !!sample.date?.toDate,
          hasToMillis: !!sample.date?.toMillis,
          description: sample.description
        });
        
        // Show available dates
        const availableDates = snapshot.docs.map(doc => {
          const data = doc.data();
          const dateValue = data.date;
          let readableDate = 'Unknown';
          let rawDate = 'Unknown';
          
          console.log('🔍 Processing expense date:', {
            id: doc.id,
            dateValue: dateValue,
            dateType: typeof dateValue,
            hasToDate: !!dateValue?.toDate,
            hasSeconds: !!dateValue?.seconds,
            seconds: dateValue?.seconds,
            nanoseconds: dateValue?.nanoseconds
          });
          
          if (dateValue?.toDate) {
            readableDate = dateValue.toDate().toLocaleDateString('en-IN');
            rawDate = dateValue.toDate().toISOString();
          } else if (dateValue?.seconds) {
            readableDate = new Date(dateValue.seconds * 1000).toLocaleDateString('en-IN');
            rawDate = new Date(dateValue.seconds * 1000).toISOString();
          }
          
          return {
            id: doc.id,
            date: readableDate,
            rawDate: rawDate,
            description: data.description
          };
        });
        
        console.log('📅 Available expense dates:', availableDates);
        console.log('📅 Raw expense dates for debugging:', snapshot.docs.map(doc => ({
          id: doc.id,
          date: doc.data().date,
          description: doc.data().description
        })));
        
        // Test specific date conversions
        if (snapshot.docs.length > 0) {
          const firstExpense = snapshot.docs[0].data();
          console.log('🧪 First expense date test:', {
            id: snapshot.docs[0].id,
            date: firstExpense.date,
            dateType: typeof firstExpense.date,
            toDateResult: firstExpense.date?.toDate ? firstExpense.date.toDate() : 'No toDate method',
            secondsResult: firstExpense.date?.seconds ? new Date(firstExpense.date.seconds * 1000) : 'No seconds',
            description: firstExpense.description
          });
          
          // Show date range info
          const dates = availableDates.map(d => d.date).filter(d => d !== 'Unknown');
          if (dates.length > 0) {
            const sortedDates = dates.sort();
            console.log('📅 Date range available:', {
              earliest: sortedDates[0],
              latest: sortedDates[sortedDates.length - 1],
              totalDates: dates.length
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking for expenses:', error);
    }
  };



  // Check user role
  useEffect(() => {
    if (selectedOrg) {
      // Check if user is admin (you can adjust this logic based on your auth system)
      const userRole = selectedOrg.role || 0;
      
      // Convert to number for comparison (handle both string and number roles)
      const roleNumber = Number(userRole);
      
      setIsAdmin(roleNumber === 0); // Role 0 = Admin
      setIsManager(roleNumber === 1); // Role 1 = Manager
      
      // Debug logging for role detection
      
    }
  }, [selectedOrg]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (expensesUnsubscribe) {
        expensesUnsubscribe();
      }
    };
  }, [expensesUnsubscribe]);

  // Handle expense type changes
  useEffect(() => {
    if (expenseType === "LABOUR" && selectedLabour) {
      // Update description when expense type changes to LABOUR and labour is selected
      setDescription(`Wage payment for ${selectedLabour.name}`);
    } else if (expenseType === "OTHER") {
      // Clear description for other expenses
      setDescription("");
    }
  }, [expenseType, selectedLabour]);

  // Handle labour search input
  const handleLabourSearch = (e) => {
    const searchTerm = e.target.value;
    setLabourSearch(searchTerm);
    
    if (searchTerm.length >= 2) {
      fetchLabours(searchTerm);
    } else {
      setFilteredLabours([]);
    }
  };



  // Fetch labours
  const fetchLabours = async (searchTerm = "") => {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        setFilteredLabours([]);
        return;
      }

      const q = query(
        collection(db, "LABOURS"),
        where("orgID", "==", orgID),
        orderBy("name", "asc"),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Filter by search term
      const filtered = rows.filter(labour => 
        labour.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setFilteredLabours(filtered);
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error("Failed to fetch labours");
      setFilteredLabours([]);
    }
  };

  // Fetch vendors for raw material expenses
  const fetchVendors = async () => {
    try {
      if (!orgID) return;
      
      const q = query(
        collection(db, "VENDORS"),
        where("orgID", "==", orgID)
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendors(rows);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to fetch vendors");
    }
  };

  // Fetch pending payments - using Cash Ledger approach
  const fetchPendingPayments = async () => {
    try {

      
      if (selectedFilterDate) {
        // Use Cash Ledger's proven date filtering approach
        const startDate = new Date(selectedFilterDate + "T00:00:00");
        const endDate = new Date(selectedFilterDate + "T23:59:59");
        

        
        const expensesQuery = query(
          collection(db, "EXPENSES"),
          where("orgID", "==", orgID),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        const expenses = expensesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate?.() || new Date()
          };
        });
        

        setPendingPayments(expenses);
        
      } else {
        // Fetch all expenses when no date filter
        const q = query(
          collection(db, "EXPENSES"),
          where("orgID", "==", orgID),
          orderBy("date", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (snap) => {
          const allExpenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
          setPendingPayments(allExpenses);
        }, (error) => {
          console.error('❌ Firestore query error:', error);
          toast.error("Failed to fetch expenses");
        });
        
        setExpensesUnsubscribe(unsubscribe);
        return unsubscribe;
      }
      
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
    }
  };




  // Close modal function
  const closeModal = () => {
    setShowExpenseModal(false);
    // Reset date to today when closing modal
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return { imageUrl: "", imageRef: "" };
    
    try {
      setIsUploading(true);
      const timestamp = Date.now();
      const fileName = `Transactions/${timestamp}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      return { imageUrl, imageRef: fileName };
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return { imageUrl: "", imageRef: "" };
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle labour selection
  const handleLabourSelect = (e) => {
    const selectedLabourID = e.target.value;
    
    setLabourID(selectedLabourID);
    if (selectedLabourID) {
      const labour = labours.find(l => l.labourID === selectedLabourID);
      setSelectedLabour(labour);
      // Auto-fill description for labour payment
      setDescription(`Wage payment for ${labour.name}`);
    } else {
      setSelectedLabour(null);
      setDescription("");
    }
  };



  // Handle add expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {


      if (!amount || !date || !description) {
        toast.error("Please fill all required fields");
        return;
      }

      // Additional validation for labour payments
      if (expenseType === "LABOUR" && !labourID) {
        toast.error("Please select a labour for labour payment");
        return;
      }

      // Additional validation for raw material expenses
      if ((expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && !selectedVendor) {
        toast.error("Please select a vendor for raw material expense");
        return;
      }

      if ((expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && !quantity) {
        toast.error("Please enter quantity for raw material expense");
        return;
      }



      setIsUploading(true);

      // Upload image if selected
      const { imageUrl, imageRef } = await handleImageUpload(imageFile);

      // Prepare expense data
      const expenseData = {
        amount: Number(amount),
        category: expenseType,
        date: new Date(date), // Store date as Date object
        description: description.trim(),
        image: imageUrl,
        imageRef: imageRef,
        orgID: orgID,
        orgName: orgName,
        registeredTime: serverTimestamp(),
        toAccount: toAccount, // Payment mode/account
        version: "1.0"
      };



      // Add labour-specific information for labour payments
      if (expenseType === "LABOUR" && selectedLabour) {
        expenseData.labourID = labourID;
        expenseData.labourName = selectedLabour.name;
        expenseData.paymentType = paymentType; // Use paymentType state
        expenseData.labourType = selectedLabour.labourType || "Production";
        expenseData.previousBalance = selectedLabour.currentBalance || 0;
        expenseData.newBalance = (selectedLabour.currentBalance || 0) + Number(amount);


      }



      // Add expense record
      const expenseRef = await addDoc(collection(db, "EXPENSES"), expenseData);

      // Update expense ID
      await updateDoc(expenseRef, { expenseID: expenseRef.id });

              // Handle labour payment specific logic
        if (expenseType === "LABOUR" && selectedLabour) {
          // Update labour's current balance
          // For LABOUR payment, we DECREMENT currentBalance (reduce what we owe them)
          const labourRef = doc(db, "LABOURS", selectedLabour.id);
          await updateDoc(labourRef, {
            currentBalance: increment(-Number(amount)), // Decrement by making it negative
            updatedAt: serverTimestamp(),
          });

                  // Create labour ledger entry
          const labourLedgerData = {
            labourID: labourID,
            labourName: selectedLabour.name,
            transactionType: "debit", // We owe labour
            amount: Number(amount),
            date: new Date(date), // Store date as Date object
            referenceType: "expense",
            referenceID: expenseRef.id,
            description: `Labour payment - ${description.trim()}`,
            previousBalance: selectedLabour.currentBalance || 0,
            newBalance: (selectedLabour.currentBalance || 0) + Number(amount),
            toAccount: toAccount, // Payment mode/account
            orgID: orgID,
        createdAt: serverTimestamp(),
          };
          
          const labourLedgerRef = await addDoc(collection(db, "LABOUR_LEDGER"), labourLedgerData);

                // If labour has linked labours, update their balances too
        if (selectedLabour.isLinked && selectedLabour.linkedLabours?.length > 0) {
          for (const linkedLabour of selectedLabour.linkedLabours) {
            // Find the linked labour document
            const linkedLabourDoc = labours.find(l => l.labourID === linkedLabour.labourID);
            if (linkedLabourDoc) {
              // Update linked labour balance
              // For LABOUR payment, we DECREMENT currentBalance (reduce what we owe them)
              const linkedLabourRef = doc(db, "LABOURS", linkedLabourDoc.id);
              await updateDoc(linkedLabourRef, {
                currentBalance: increment(-Number(amount)), // Decrement by making it negative
        updatedAt: serverTimestamp(),
      });

              // Create ledger entry for linked labour
              const linkedLedgerData = {
                labourID: linkedLabour.labourID,
                labourName: linkedLabour.name,
                transactionType: "debit",
                amount: Number(amount),
                referenceType: "expense",
                referenceID: expenseRef.id,
                description: `Linked labour payment - ${description.trim()}`,
                previousBalance: linkedLabourDoc.currentBalance || 0,
                newBalance: (linkedLabourDoc.currentBalance || 0) + Number(amount),
                toAccount: toAccount, // Payment mode/account
                orgID: orgID,
                createdAt: serverTimestamp(),
              };
              
              const linkedLedgerRef = await addDoc(collection(db, "LABOUR_LEDGER"), linkedLedgerData);

            }
          }
        }
      }

      // Handle raw material expense specific logic
      if ((expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && selectedVendor) {
        // Add vendor information to expense
        expenseData.vendorID = selectedVendor;
        expenseData.vendorName = vendors.find(v => v.id === selectedVendor)?.name || "";
        expenseData.rawMaterialType = expenseType;
        expenseData.quantity = Number(quantity);
        expenseData.unit = unit;
        
        // Create procurement ledger entry (debit transaction)
        const vendorRef = doc(db, "VENDORS", selectedVendor);
        const vendorDoc = await getDoc(vendorRef);
        const currentBalance = vendorDoc.data()?.currentBalance || 0;
        
        await updateDoc(vendorRef, {
          currentBalance: increment(-Number(amount)), // Decrease vendor balance (we paid them)
          updatedAt: serverTimestamp(),
        });
        
        // Add to procurement ledger
        await addDoc(collection(db, "PROCUREMENT_LEDGER"), {
          vendorID: selectedVendor,
          vendorName: expenseData.vendorName,
          category: expenseType === "CEMENT" ? "CEMENT" : 
                   expenseType === "RAW_MATERIAL_1" ? "RAW_MATERIAL_1" : 
                   expenseType === "RAW_MATERIAL_2" ? "RAW_MATERIAL_2" : "CONSUMABLES",
          transactionType: "debit", // We paid the vendor
          amount: Number(amount),
          quantity: Number(quantity),
          balance: currentBalance - Number(amount),
          referenceType: "expense_payment",
          referenceID: expenseRef.id,
          date: new Date(date),
          description: `Payment for ${expenseType.toLowerCase().replace('_', ' ')} - ${description.trim()}`,
          orgID: orgID,
          createdAt: serverTimestamp(),
        });
      }

      // Reset form

      // Reset form
      setAmount("");
      setDescription("");
      setImageFile(null);
      setImagePreview("");
      setLabourID("");
      setSelectedLabour(null);
      setLabourSearch("");
      setPaymentType("wages");
      setExpenseType("LABOUR");
      setSelectedVendor("");
      setRawMaterialType("RAW_MATERIAL_1");
      setQuantity("");
      setUnit("kg");
      setShowExpenseModal(false);
      
      // Force refresh of expenses table
      fetchPendingPayments();
      
      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setIsUploading(false);
    }
  };




  // Handle edit expense
  const handleEditExpense = (expense) => {
    // TODO: Implement edit functionality
    // For now, show a toast message
    toast.info(`Edit functionality for "${expense.description}" will be implemented soon!`);
  };

  // Handle delete expense with proper cleanup
  const handleDeleteExpense = async (expense) => {
    try {
      if (!window.confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) {
        return;
      }



      // 1. Delete from EXPENSES collection
      await deleteDoc(doc(db, "EXPENSES", expense.id));

      // 2. If it's a LABOUR payment, handle LABOUR_LEDGER and LABOUR cleanup
      if (expense.category === "LABOUR") {
        try {
          // Check if entry exists in LABOUR_LEDGER
          const ledgerQuery = query(
            collection(db, "LABOUR_LEDGER"),
            where("orgID", "==", orgID),
            where("referenceID", "==", expense.id)
          );
          
          const ledgerSnapshot = await getDocs(ledgerQuery);
          
          if (!ledgerSnapshot.empty) {


            // Delete from LABOUR_LEDGER
            const deletePromises = ledgerSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            // 3. Undo currentBalance change in LABOUR collection
            if (expense.labourID) {
              
              const labourRef = doc(db, "LABOURS", expense.labourID);
              
              // Get current labour data to calculate the adjustment
              const labourDoc = await getDoc(labourRef);
              if (labourDoc.exists()) {
                const labourData = labourDoc.data();
                
                // Since we're deleting, we need to reverse the original transaction
                // If original was increment(amount), now we decrement(amount)
                // If original was decrement(amount), now we increment(amount)
                const adjustment = Number(expense.amount);
                
                await updateDoc(labourRef, {
                  currentBalance: increment(adjustment), // Reverse the original change
                  totalEarned: increment(adjustment) // Reverse the total earned
                });
              } else {
                // Labour document not found
              }
            } else {
              // No labourID found in expense
            }
          } else {
            // No LABOUR_LEDGER entries found
          }
        } catch (error) {
          console.error("❌ ERROR: Error cleaning up labour-related data:", error);
          toast.warning("Expense deleted but cleanup failed");
        }
      } else {
        // Not a LABOUR expense
      }



      toast.success("Expense deleted successfully");
      
    } catch (error) {
      console.error("❌ Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  // Handle delete request (for managers)
  const handleDeleteRequest = async (expense) => {
    try {
      if (!window.confirm(`Request deletion for expense: "${expense.description}"? This will be sent to admin for approval.`)) {
        return;
      }


      toast.info("Delete request sent to admin");
      
    } catch (error) {
      console.error("Error sending delete request:", error);
      toast.error("Failed to send delete request");
    }
  };



  // Filtered pending payments
  const filteredPendingPayments = pendingPayments.filter(p => {
    // Date filter
    let dateMatch = true;
    if (selectedFilterDate) {
      const expenseDate = p.date;
      let expenseDateStr;
      
      // Convert expense date to local date string (YYYY-MM-DD)
      if (expenseDate instanceof Date) {
        // JavaScript Date object - use local date
        expenseDateStr = expenseDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
      } else if (typeof expenseDate === 'string') {
        // String date (YYYY-MM-DD) - use as is
        expenseDateStr = expenseDate;
      } else if (expenseDate?.toMillis) {
        // Firestore timestamp - convert to local date
        expenseDateStr = new Date(expenseDate.toMillis()).toLocaleDateString('en-CA');
      } else if (expenseDate?.seconds) {
        // Firestore timestamp object - convert to local date
        expenseDateStr = new Date(expenseDate.seconds * 1000).toLocaleDateString('en-CA');
      } else if (expenseDate?.toDate) {
        // Firestore timestamp - convert to local date
        expenseDateStr = expenseDate.toDate().toLocaleDateString('en-CA');
      } else {
        expenseDateStr = String(expenseDate);
      }
      
      // Compare local date strings
      dateMatch = expenseDateStr === selectedFilterDate;
      

    }
    
    return dateMatch;
  });
  




  // Helper functions
  const currency = (n) => new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

  const getExpenseTypeLabel = (type) => {
    const labels = {
      LABOUR: "Labour Payment",
      RAW_MATERIAL: "Raw Material",
      DIESEL: "Diesel",
      OTHER: "Other"
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

  // Safe date formatter for any date type
  const safeFormatDate = (dateValue) => {
    if (!dateValue) return "—";
    
    if (dateValue instanceof Date) {
      // JavaScript Date object
      return dateValue.toLocaleDateString('en-IN');
    } else if (typeof dateValue === 'string') {
      // String date (YYYY-MM-DD)
      return dateValue;
    } else if (dateValue?.seconds) {
      // Firestore timestamp object
      return new Date(dateValue.seconds * 1000).toLocaleDateString('en-IN');
    } else if (dateValue?.toDate) {
      // Firestore timestamp
      return dateValue.toDate().toLocaleDateString('en-IN');
    } else if (dateValue?.toMillis) {
      // Firestore timestamp with toMillis
      return new Date(dateValue.toMillis()).toLocaleDateString('en-IN');
    } else {
      // Fallback
      return String(dateValue);
    }
  };

  return (
    <DieselPage>
      {/* Header */}
      <PageHeader 
        title="💸 Expense Management"
        onBack={onBack}
        role={isAdmin ? "admin" : "manager"}
      />

      {/* Main content container with consistent spacing */}
      <div className="w-full" style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="max-w-7xl mx-auto">
          {/* Unified Card Container */}
          <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
            <div className="space-y-8">
              {/* Add Expense Section */}
              <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-100 tracking-tight leading-tight flex items-center gap-3 mb-2">
                      <span className="text-3xl filter drop-shadow-lg">💰</span>
                      <span className="text-gray-200 font-semibold">Add New Expense</span>
                    </h2>
                    <p className="text-gray-400 text-sm">Record new business expenses with images and details</p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25 transition-all duration-300 px-8 py-3 text-lg font-semibold"
                    onClick={() => {
                      // Reset date to today when opening modal
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      setDate(`${year}-${month}-${day}`);
                      setShowExpenseModal(true);
                    }}
                  >
                    ➕ Add Expense
                  </Button>
                </div>
              </div>

              {/* Recent Expenses Section */}
              <div className="bg-gradient-to-br from-[rgba(25,25,27,0.8)] via-[rgba(20,20,22,0.6)] to-[rgba(25,25,27,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 shadow-2xl">
                {/* Section Header with Search Controls */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/20">
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-100 tracking-tight leading-tight flex items-center gap-3 mb-2">
                      <span className="text-3xl filter drop-shadow-lg">📅</span>
                      <span className="text-gray-200 font-semibold">
                        {isAdmin || isManager ? "Recent Expenses (Today + Yesterday)" : "Today's Expenses"}
                      </span>
                    </h3>
                    <p className="text-gray-400 text-sm">All expenses with date filter</p>
                  </div>
                  
                  {/* Date Filter Control */}
                  <div className="flex justify-end">
                    <div className="w-40">
                      <DatePicker
                        value={selectedFilterDate}
                        onChange={setSelectedFilterDate}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {filteredPendingPayments.length === 0 ? (
                  <EmptyState
                    icon="📅"
                    title={isAdmin || isManager 
                      ? "No expenses recorded today or yesterday. Add your first expense above!" 
                      : "No expenses recorded today. Add your first expense above!"
                    }
                    description="Start by adding your first expense using the button above."
                  />
                ) : (
                  <DataTable
                    data={filteredPendingPayments}
                    columns={[
                      {
                        key: 'description',
                        label: 'Description',
                        render: (expense) => expense.description || "—"
                      },
                      {
                        key: 'amount',
                        label: 'Amount',
                        render: (expense) => currency(expense.amount)
                      },
                      {
                        key: 'category',
                        label: 'Category',
                        render: (expense) => getExpenseTypeLabel(expense.category)
                      },
                      {
                        key: 'toAccount',
                        label: 'Mode of Payment',
                        render: (expense) => expense.toAccount || "—"
                      },
                      {
                        key: 'image',
                        label: 'Image',
                        render: (expense) => expense.image ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(expense.image, '_blank')}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            View
                          </Button>
                        ) : "—"
                      },
                      ...(isAdmin || isManager ? [{
                        key: 'actions',
                        label: isAdmin ? 'Actions (Admin: All Expenses)' : 'Request (Manager: Request Actions)',
                        render: (expense) => {
                          if (isAdmin) {
                            return (
                              <div className="flex gap-2 justify-center">
                                <ActionButton
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  ✏️ Edit
                                </ActionButton>
                                <ActionButton
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense)}
                                >
                                  🗑️ Delete
                                </ActionButton>
                              </div>
                            );
                          } else if (isManager) {
                            const today = new Date();
                            const todayStr = today.toLocaleDateString('en-CA');
                            
                            const expenseDate = expense.date;
                            let expenseDateStr;
                            
                            if (expenseDate instanceof Date) {
                              expenseDateStr = expenseDate.toLocaleDateString('en-CA');
                            } else if (typeof expenseDate === 'string') {
                              expenseDateStr = expenseDate;
                            } else if (expenseDate?.toMillis) {
                              expenseDateStr = new Date(expenseDate.toMillis()).toLocaleDateString('en-CA');
                            } else if (expenseDate?.seconds) {
                              expenseDateStr = new Date(expenseDate.seconds * 1000).toLocaleDateString('en-CA');
                            } else if (expenseDate?.toDate) {
                              expenseDateStr = expenseDate.toDate().toLocaleDateString('en-CA');
                            } else {
                              expenseDateStr = String(expenseDate);
                            }
                            
                            if (expenseDateStr === todayStr) {
                              return (
                                <div className="flex gap-2 justify-center">
                                  <ActionButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleEditExpense(expense)}
                                  >
                                    ✏️ Edit
                                  </ActionButton>
                                  <ActionButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(expense)}
                                  >
                                    🗑️ Delete
                                  </ActionButton>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-xs text-gray-400 italic">
                                Today Only
                              </div>
                            );
                          }
                          return null;
                        }
                      }] : [])
                    ]}
                    className="expenses-table"
                  />
                )}
            </div>
            </div>
          </Card>
        </div>
      </div>

      {/* EXPENSE MODAL */}
      <Modal
        isOpen={showExpenseModal}
        onClose={closeModal}
        title="💰 Add New Expense"
        size="lg"
      >
            
        <form onSubmit={handleAddExpense} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SelectField
                    label="📝 Category"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    options={[
                      { value: "LABOUR", label: "Labour Payment" },
                      { value: "RAW_MATERIAL_1", label: "Raw Material 1" },
                      { value: "RAW_MATERIAL_2", label: "Raw Material 2" },
                      { value: "CEMENT", label: "Cement" },
                      { value: "CONSUMABLES", label: "Consumables" },
                      { value: "OTHER", label: "Other" }
                    ]}
                  />
                  <div className="form-group">
                    <div className="form-label">
                      👤 Labour Name
                    </div>
                    <div className="labour-search-container">
                      <Input
                        type="text"
                        value={labourSearch}
                        onChange={handleLabourSearch}
                        placeholder="Start typing to search labour..."
                        required
                      />
                      {filteredLabours.length > 0 && (
                        <div className="labour-dropdown">
                          {filteredLabours.map(labour => (
                            <div
                              key={labour.labourID}
                              className="labour-option"
                              onClick={() => {
                                setLabourID(labour.labourID);
                                setSelectedLabour(labour);
                                setLabourSearch(labour.name);
                                setFilteredLabours([]);
                                // Auto-fill description for labour payment
                                setDescription(`Wage payment for ${labour.name}`);
                              }}
                            >
                              <span className="labour-name">{labour.name}</span>
                              {labour.isLinked && labour.linkedLabours?.length > 0 && (
                                <span className="linked-indicator">
                                  (Linked: {labour.linkedLabours.length + 1})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Current Balance Display */}
                      {selectedLabour && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#495057'
                        }}>
                          <strong>💰 Current Balance:</strong> ₹{selectedLabour.currentBalance?.toLocaleString() || '0'}
                          {selectedLabour.linkedLabours && selectedLabour.linkedLabours.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                              <strong>🔗 Linked Labours:</strong> {selectedLabour.linkedLabours.length + 1} total accounts
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Raw Material Expense Fields */}
                  {(expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && (
                    <>
                      <SelectField
                        label="🏢 Vendor"
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        options={[
                          { value: "", label: "Select vendor..." },
                          ...vendors.map(v => ({ value: v.id, label: v.name }))
                        ]}
                        required
                      />
                      <Input
                        label="📦 Quantity"
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      <SelectField
                        label="📐 Unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        options={[
                          { value: "kg", label: "Kilograms (kg)" },
                          { value: "tons", label: "Tons" },
                          { value: "bags", label: "Bags" },
                          { value: "pieces", label: "Pieces" },
                          { value: "liters", label: "Liters" }
                        ]}
                      />
                    </>
                  )}
                  
                  <Input
                    label="💰 Amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
          </div>

          {/* Payment Type for Labour */}
          {expenseType === "LABOUR" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SelectField
                      label="💳 Payment Type"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      options={[
                        { value: "wages", label: "Wages" },
                        { value: "bonus", label: "Bonus" },
                        { value: "overtime", label: "Overtime" },
                        { value: "advance", label: "Advance" },
                        { value: "other", label: "Other" }
                      ]}
                    />
                    <SelectField
                      label="🏦 Payment Mode"
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      options={[
                        { value: "CASH", label: "💵 CASH" },
                        { value: "HDFC LIT", label: "🏦 HDFC LIT" },
                        { value: "HDFC V", label: "🏦 HDFC V" },
                        { value: "SBI CC", label: "🏦 SBI CC" }
                      ]}
                      required
                    />
                    <DatePicker
                      label="📅 Date"
                      value={date}
                      onChange={setDate}
                      required
                    />
            </div>
          )}

          {/* Description for Labour */}
          {expenseType === "LABOUR" && (
            <div className="grid grid-cols-1 gap-6">
                    <Input
                      label="📝 Description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Wage payment for [Labour Name]"
                      required
                    />
            </div>
          )}

          {/* Date, Description, and Payment Mode for Non-Labour */}
          {expenseType !== "LABOUR" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DatePicker
                      label="📅 Date"
                      value={date}
                      onChange={setDate}
                      required
                    />
                    <SelectField
                      label="🏦 Payment Mode"
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      options={[
                        { value: "CASH", label: "💵 CASH" },
                        { value: "HDFC LIT", label: "🏦 HDFC LIT" },
                        { value: "HDFC V", label: "🏦 HDFC V" },
                        { value: "SBI CC", label: "🏦 SBI CC" }
                      ]}
                      required
                    />
                    <Input
                      label="📝 Description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter expense description"
                      required
                    />
            </div>
          )}

          {/* Receipt Image for Non-Labour */}
          {expenseType !== "LABOUR" && (
            <div className="grid grid-cols-1 gap-6">
                    <div className="form-group">
                      <div className="form-label">📸 Receipt Image</div>
                      <div className="image-upload-container">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="image-upload-input"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          className="image-upload-button"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          📸 Choose Image
                        </button>
                        {imagePreview && (
                          <div className="image-preview-container">
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                            <button
                              type="button"
                              className="remove-image-button"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
            </div>
          )}

          {/* Image Upload for Labour */}
          {expenseType === "LABOUR" && (
            <div className="grid grid-cols-1 gap-6">
                    <div className="form-group">
                      <div className="form-label">📸 Receipt Image</div>
                      <div className="image-upload-container">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="image-upload-input"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          className="image-upload-button"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          📸 Choose Image
                        </button>
                        {imagePreview && (
                          <div className="image-preview-container">
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                            <button
                              type="button"
                              className="remove-image-button"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
            </div>
          )}

          {/* Labour Information Display */}
          {expenseType === "LABOUR" && selectedLabour && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="labour-info-grid">
                      <div className="labour-info-item">
                        <span className="info-label">Current Balance:</span>
                        <span className="info-value">{currency(selectedLabour.currentBalance || 0)}</span>
                      </div>
                      {selectedLabour.isLinked && selectedLabour.linkedLabours?.length > 0 && (
                        <div className="labour-info-item linked-labours">
                          <span className="info-label">Linked Labours:</span>
                          <div className="linked-labours-list">
                            {selectedLabour.linkedLabours.map((linked, index) => (
                              <span key={index} className="linked-labour-tag">
                                {linked.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowExpenseModal(false)}
                  >
                    ❌ Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={isUploading}
                  >
                    {isUploading ? '⏳ Uploading...' : '💾 Save Expense'}
                  </Button>
          </div>
        </form>
      </Modal>
    </DieselPage>
  );
};

export default ExpensesManagement;
