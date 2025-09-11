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
  limit,
  runTransaction
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { useOrganization } from "../../contexts/OrganizationContext";
import { EmployeeService } from "../../services/employeeService";
import { testExpenseManagement } from "./ExpenseManagementTest";
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
  DieselPage,
  FilterBar,
  SummaryCard,
  ConfirmationModal
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [expenseType, setExpenseType] = useState("EMPLOYEE");
  const [employeeID, setEmployeeID] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
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
    fetchEmployees();
    fetchAccounts();
    
    // Run system test
    testExpenseManagement();
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
    if (expenseType === "EMPLOYEE" && selectedEmployee) {
      // Update description when expense type changes to EMPLOYEE and employee is selected
      setDescription(`Wage payment for ${selectedEmployee.name}`);
    } else if (expenseType === "OTHER") {
      // Clear description for other expenses
      setDescription("");
    }
  }, [expenseType, selectedEmployee]);

  // Handle employee search input
  const handleEmployeeSearch = (e) => {
    const searchTerm = e.target.value;
    setEmployeeSearch(searchTerm);
    
    if (searchTerm.length >= 1) {
      filterEmployees(searchTerm);
    } else {
      setFilteredEmployees([]);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.employee-search-container')) {
        setFilteredEmployees([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // Fetch employees
  const fetchEmployees = async () => {
    try {
      console.log('🔄 Fetching employees for orgID:', orgID);
      setLoading(true);
      const data = await EmployeeService.getEmployees(orgID);
      console.log('✅ Fetched employees:', data.length, 'employees');
      setEmployees(data);
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      toast.error("Failed to fetch employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      console.log('🔄 Fetching accounts for orgID:', orgID);
      const data = await EmployeeService.getAccounts(orgID);
      console.log('✅ Fetched accounts:', data.length, 'accounts');
      setAccounts(data);
    } catch (error) {
      console.error("❌ Error fetching accounts:", error);
      toast.error("Failed to fetch accounts");
      setAccounts([]);
    }
  };

  // Filter employees and accounts based on search term
  const filterEmployees = (searchTerm) => {
    console.log('🔍 Filtering employees and accounts:', { 
      searchTerm, 
      totalEmployees: employees.length, 
      totalAccounts: accounts.length 
    });
    
    const results = [];
    
    // First, add accounts that match the search term
    if (accounts && accounts.length > 0) {
      const filteredAccounts = accounts.filter(account => {
        const nameMatch = account.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch;
      });
      
      // Convert accounts to employee-like objects for display
      filteredAccounts.forEach(account => {
        results.push({
          id: account.id,
          name: account.name,
          labourID: `ACCOUNT-${account.id.slice(-4)}`,
          currentBalance: account.currentBalance,
          accountId: account.id,
          accountName: account.name,
          accountType: account.accountType,
          memberIds: account.memberIds,
          isAccount: true
        });
      });
    }
    
    // Then, add individual employees (only those without accounts)
    if (employees && employees.length > 0) {
      const individualEmployees = employees.filter(employee => !employee.accountId);
      const filteredEmployees = individualEmployees.filter(employee => {
        const nameMatch = employee.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const idMatch = employee.labourID?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || idMatch;
      });
      
      filteredEmployees.forEach(employee => {
        results.push({
          ...employee,
          isAccount: false
        });
      });
    }
    
    console.log('✅ Filtered results:', results.length, 'matches (accounts + individual employees)');
    setFilteredEmployees(results);
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
    setShowEditModal(false);
    setExpenseToEdit(null);
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

  // Handle employee selection
  const handleEmployeeSelect = (item) => {
    setEmployeeID(item.id);
    setSelectedEmployee(item);
    setEmployeeSearch(item.name);
    setFilteredEmployees([]);
    
    // Auto-fill description based on whether it's an account or individual employee
    if (item.isAccount) {
      setDescription(`Payment for ${item.name} (Combined Account)`);
    } else {
      setDescription(`Wage payment for ${item.name}`);
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

      // Additional validation for employee payments
      if (expenseType === "EMPLOYEE" && !employeeID) {
        toast.error("Please select an employee for employee payment");
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
        amount: Number(amount), // Store as rupees in EXPENSES collection
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



      // Add employee-specific information for employee payments
      if (expenseType === "EMPLOYEE" && selectedEmployee) {
        expenseData.employeeID = employeeID;
        expenseData.employeeName = selectedEmployee.name;
        expenseData.labourID = selectedEmployee.labourID;
        expenseData.paymentType = paymentType;
        expenseData.employeeTags = selectedEmployee.employeeTags || [];
        expenseData.previousBalance = selectedEmployee.currentBalance || 0; // Store as paisa
        expenseData.newBalance = (selectedEmployee.currentBalance || 0) - EmployeeService.formatMoneyToPaise(Number(amount)); // Store as paisa
        expenseData.accountId = selectedEmployee.accountId;
        expenseData.accountName = selectedEmployee.accountName;
        expenseData.isAccount = selectedEmployee.isAccount;
        expenseData.memberIds = selectedEmployee.memberIds;
      }



      // Add expense record
      const expenseRef = await addDoc(collection(db, "EXPENSES"), expenseData);

      // Update expense ID
      await updateDoc(expenseRef, { expenseID: expenseRef.id });

              // Handle employee payment specific logic
        if (expenseType === "EMPLOYEE" && selectedEmployee) {
          if (selectedEmployee.isAccount) {
            // COMBINED ACCOUNT EXPENSE LOGIC
            
            // 1. Update employeeAccount document: currentBalance - amount (in paisa)
            const accountRef = doc(db, "employeeaccounts", selectedEmployee.id);
            const accountAmountPaise = EmployeeService.formatMoneyToPaise(Number(amount));
            
            await updateDoc(accountRef, {
              currentBalance: increment(-accountAmountPaise), // Store as paisa
            updatedAt: serverTimestamp(),
          });

            // 2. Update individual employee documents: currentBalance - amount/(splitRule)
            const memberPromises = selectedEmployee.memberIds.map(async (memberId) => {
              const memberRef = doc(db, "employees", memberId);
              const memberDoc = await getDoc(memberRef);
              
              if (memberDoc.exists()) {
                const memberData = memberDoc.data();
                let splitAmount = 0;
                
                // Calculate split based on splitRule
                if (selectedEmployee.splitRule?.type === "equal") {
                  splitAmount = Number(amount) / selectedEmployee.memberIds.length;
                } else if (selectedEmployee.splitRule?.type === "manual" && selectedEmployee.splitRule?.manualSplits) {
                  splitAmount = selectedEmployee.splitRule.manualSplits[memberId] || 0;
                } else {
                  // Default to equal split
                  splitAmount = Number(amount) / selectedEmployee.memberIds.length;
                }
                
                const splitAmountPaise = EmployeeService.formatMoneyToPaise(splitAmount);
                
                await updateDoc(memberRef, {
                  currentBalance: increment(-splitAmountPaise), // Store as paisa
                  updatedAt: serverTimestamp(),
                });
                
                return { memberId, memberData, splitAmount };
              }
              return null;
            });
            
            const memberResults = await Promise.all(memberPromises);
            const validMembers = memberResults.filter(m => m !== null);

            // 3. Add single document in ACCOUNT_LEDGER: amount = amount (in paisa)
            const accountLedgerData = {
              accountID: employeeID,
              accountName: selectedEmployee.name,
              transactionType: "debit",
              amount: accountAmountPaise, // Store as paisa
              date: new Date(date),
            referenceType: "expense",
            referenceID: expenseRef.id,
              description: `Account payment - ${description.trim()}`,
              previousBalance: selectedEmployee.currentBalance || 0, // Store as paisa
              newBalance: (selectedEmployee.currentBalance || 0) - accountAmountPaise, // Store as paisa
              toAccount: toAccount,
            orgID: orgID,
        createdAt: serverTimestamp(),
          };
          
            await addDoc(collection(db, "ACCOUNT_LEDGER"), accountLedgerData);

            // 4. Add documents in EMPLOYEE_LEDGER: amount = amount/(splitRule) for each member
            const employeeLedgerPromises = validMembers.map(async ({ memberId, memberData, splitAmount }) => {
              const employeeLedgerData = {
                employeeID: memberId,
                employeeName: memberData.name,
                labourID: memberData.labourID,
                transactionType: "debit",
                amount: splitAmountPaise, // Store as paisa
                date: new Date(date),
                referenceType: "expense",
                referenceID: expenseRef.id,
                description: `Account payment (split) - ${description.trim()}`,
                previousBalance: memberData.currentBalance || 0, // Store as paisa
                newBalance: (memberData.currentBalance || 0) - splitAmountPaise, // Store as paisa
                toAccount: toAccount,
                orgID: orgID,
                accountID: employeeID, // Reference to the account
                accountName: selectedEmployee.name,
                createdAt: serverTimestamp(),
              };
              
              return addDoc(collection(db, "EMPLOYEE_LEDGER"), employeeLedgerData);
            });
            
            await Promise.all(employeeLedgerPromises);

          } else {
            // INDIVIDUAL EMPLOYEE EXPENSE LOGIC
            
            // 1. Update employee document: currentBalance - amount (in paisa)
            const employeeRef = doc(db, "employees", selectedEmployee.id);
            const employeeAmountPaise = EmployeeService.formatMoneyToPaise(Number(amount));
            
            await updateDoc(employeeRef, {
              currentBalance: increment(-employeeAmountPaise), // Store as paisa
        updatedAt: serverTimestamp(),
      });

            // 2. Add document in EMPLOYEE_LEDGER: amount = amount (in paisa)
            const employeeLedgerData = {
              employeeID: employeeID,
              employeeName: selectedEmployee.name,
              labourID: selectedEmployee.labourID,
                transactionType: "debit",
              amount: employeeAmountPaise, // Store as paisa
              date: new Date(date),
                referenceType: "expense",
                referenceID: expenseRef.id,
              description: `Employee payment - ${description.trim()}`,
              previousBalance: selectedEmployee.currentBalance || 0, // Store as paisa
              newBalance: (selectedEmployee.currentBalance || 0) - employeeAmountPaise, // Store as paisa
              toAccount: toAccount,
                orgID: orgID,
                createdAt: serverTimestamp(),
              };
              
            await addDoc(collection(db, "EMPLOYEE_LEDGER"), employeeLedgerData);

            // If employee has an account, update the account balance too
            if (selectedEmployee.accountId) {
              await EmployeeService.updateAccountBalance(selectedEmployee.accountId);
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
      setEmployeeID("");
      setSelectedEmployee(null);
      setEmployeeSearch("");
      setPaymentType("wages");
      setExpenseType("EMPLOYEE");
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
    // Set the expense to edit
    setExpenseToEdit(expense);
    
    // Populate form with existing data
    setExpenseType(expense.category);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setDate(expense.date instanceof Date ? 
      expense.date.toISOString().split('T')[0] : 
      new Date(expense.date).toISOString().split('T')[0]
    );
    setToAccount(expense.toAccount || "");
    
    // Handle employee-specific fields
    if (expense.category === "EMPLOYEE") {
      setEmployeeID(expense.employeeID || "");
      setPaymentType(expense.paymentType || "wages");
      
      // Set selected employee if it's an account
      if (expense.isAccount) {
        setSelectedEmployee({
          id: expense.employeeID,
          name: expense.employeeName,
          isAccount: true,
          currentBalance: expense.previousBalance,
          memberIds: expense.memberIds || [],
          splitRule: expense.splitRule || { type: "equal" }
        });
        setEmployeeSearch(expense.employeeName);
      } else {
        setSelectedEmployee({
          id: expense.employeeID,
          name: expense.employeeName,
          labourID: expense.labourID,
          isAccount: false,
          currentBalance: expense.previousBalance,
          accountId: expense.accountId
        });
        setEmployeeSearch(expense.employeeName);
      }
    }
    
    // Handle raw material fields
    if (expense.category.includes("RAW_MATERIAL") || expense.category === "CEMENT" || expense.category === "CONSUMABLES") {
      setSelectedVendor(expense.vendorID || "");
      setQuantity(expense.quantity?.toString() || "");
      setUnit(expense.unit || "kg");
    }
    
    // Open edit modal
    setShowEditModal(true);
  };

  // Handle update expense with airtight logic
  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      if (!amount || !date || !description) {
        toast.error("Please fill all required fields");
        return;
      }

      // Additional validation for employee payments
      if (expenseType === "EMPLOYEE" && !employeeID) {
        toast.error("Please select an employee for employee payment");
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

      // Prepare updated expense data
      const updatedExpenseData = {
        amount: Number(amount),
        category: expenseType,
        date: new Date(date),
        description: description.trim(),
        image: imageUrl || expenseToEdit.image,
        imageRef: imageRef || expenseToEdit.imageRef,
        orgID: orgID,
        orgName: orgName,
        updatedAt: serverTimestamp(),
        toAccount: toAccount,
        version: "1.1"
      };

      // Add employee-specific information for employee payments
      if (expenseType === "EMPLOYEE" && selectedEmployee) {
        updatedExpenseData.employeeID = employeeID;
        updatedExpenseData.employeeName = selectedEmployee.name;
        updatedExpenseData.labourID = selectedEmployee.labourID;
        updatedExpenseData.paymentType = paymentType;
        updatedExpenseData.employeeTags = selectedEmployee.employeeTags || [];
        updatedExpenseData.previousBalance = selectedEmployee.currentBalance || 0; // Store as paisa
        updatedExpenseData.newBalance = (selectedEmployee.currentBalance || 0) - EmployeeService.formatMoneyToPaise(Number(amount)); // Store as paisa
        updatedExpenseData.accountId = selectedEmployee.accountId;
        updatedExpenseData.accountName = selectedEmployee.accountName;
        updatedExpenseData.isAccount = selectedEmployee.isAccount;
        updatedExpenseData.memberIds = selectedEmployee.memberIds;
      }

      // Add vendor information for raw material expenses
      if ((expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && selectedVendor) {
        updatedExpenseData.vendorID = selectedVendor;
        updatedExpenseData.vendorName = vendors.find(v => v.id === selectedVendor)?.name || "";
        updatedExpenseData.rawMaterialType = expenseType;
        updatedExpenseData.quantity = Number(quantity);
        updatedExpenseData.unit = unit;
      }

      // Use transaction for atomic updates
      await runTransaction(db, async (transaction) => {
        const expenseRef = doc(db, "EXPENSES", expenseToEdit.id);
        
        // 1. First, reverse the original transaction (if it was an employee payment)
        if (expenseToEdit.category === "EMPLOYEE") {
          await reverseEmployeeTransaction(expenseToEdit, transaction);
        }
        
        // 2. Update the expense document
        transaction.update(expenseRef, updatedExpenseData);
        
        // 3. Apply the new transaction (if it's an employee payment)
        if (expenseType === "EMPLOYEE" && selectedEmployee) {
          await applyEmployeeTransaction(expenseToEdit.id, selectedEmployee, Number(amount), date, description, toAccount, transaction);
        }
      });

      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
      setExpenseToEdit(null);
      
      // Force refresh of expenses table
      fetchPendingPayments();
      
      toast.success("Expense updated successfully");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    } finally {
      setIsUploading(false);
    }
  };

  // Reverse employee transaction (for edit/delete)
  const reverseEmployeeTransaction = async (expense, transaction) => {
    if (expense.category !== "EMPLOYEE") return;

    if (expense.isAccount) {
      // Reverse account transaction
      const accountRef = doc(db, "employeeaccounts", expense.employeeID);
      const accountDoc = await getDoc(accountRef);
      if (accountDoc.exists()) {
        const adjustment = EmployeeService.formatMoneyToPaise(Number(expense.amount));
        transaction.update(accountRef, {
          currentBalance: increment(adjustment),
          updatedAt: serverTimestamp()
        });
      }

      // Delete account ledger entry
      const accountLedgerQuery = query(
        collection(db, "ACCOUNT_LEDGER"),
        where("orgID", "==", orgID),
        where("referenceID", "==", expense.id)
      );
      const accountLedgerSnapshot = await getDocs(accountLedgerQuery);
      accountLedgerSnapshot.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Delete and reverse employee ledger entries
      const employeeLedgerQuery = query(
        collection(db, "EMPLOYEE_LEDGER"),
        where("orgID", "==", orgID),
        where("referenceID", "==", expense.id),
        where("accountID", "==", expense.employeeID)
      );
      const employeeLedgerSnapshot = await getDocs(employeeLedgerQuery);
      
      employeeLedgerSnapshot.docs.forEach(async (ledgerDoc) => {
        const ledgerData = ledgerDoc.data();
        const memberRef = doc(db, "employees", ledgerData.employeeID);
        const adjustment = EmployeeService.formatMoneyToPaise(ledgerData.amount);
        
        transaction.update(memberRef, {
          currentBalance: increment(adjustment),
          updatedAt: serverTimestamp()
        });
        
        transaction.delete(ledgerDoc.ref);
      });
    } else {
      // Reverse individual employee transaction
      const employeeRef = doc(db, "employees", expense.employeeID);
      const employeeDoc = await getDoc(employeeRef);
      if (employeeDoc.exists()) {
        const adjustment = EmployeeService.formatMoneyToPaise(Number(expense.amount));
        transaction.update(employeeRef, {
          currentBalance: increment(adjustment),
          updatedAt: serverTimestamp()
        });
      }

      // Delete employee ledger entry
      const employeeLedgerQuery = query(
        collection(db, "EMPLOYEE_LEDGER"),
        where("orgID", "==", orgID),
        where("referenceID", "==", expense.id)
      );
      const employeeLedgerSnapshot = await getDocs(employeeLedgerQuery);
      employeeLedgerSnapshot.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });
    }
  };

  // Apply employee transaction (for edit/add)
  const applyEmployeeTransaction = async (expenseId, selectedEmployee, amount, date, description, toAccount, transaction) => {
    if (selectedEmployee.isAccount) {
      // Apply account transaction
      const accountRef = doc(db, "employeeaccounts", selectedEmployee.id);
      const accountAmountPaise = EmployeeService.formatMoneyToPaise(amount);
      
      transaction.update(accountRef, {
        currentBalance: increment(-accountAmountPaise),
        updatedAt: serverTimestamp()
      });

      // Create account ledger entry
      const accountLedgerRef = doc(collection(db, "ACCOUNT_LEDGER"));
      const accountLedgerData = {
        accountID: selectedEmployee.id,
        accountName: selectedEmployee.name,
        transactionType: "debit",
        amount: EmployeeService.formatMoneyToPaise(amount), // Store as paisa
        date: new Date(date),
        referenceType: "expense",
        referenceID: expenseId,
        description: `Account payment - ${description.trim()}`,
        previousBalance: selectedEmployee.currentBalance || 0, // Store as paisa
        newBalance: (selectedEmployee.currentBalance || 0) - EmployeeService.formatMoneyToPaise(amount), // Store as paisa
        toAccount: toAccount,
        orgID: orgID,
        createdAt: serverTimestamp(),
      };
      transaction.set(accountLedgerRef, accountLedgerData);

      // Apply individual employee transactions
      const memberPromises = selectedEmployee.memberIds.map(async (memberId) => {
        const memberRef = doc(db, "employees", memberId);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          let splitAmount = 0;
          
          if (selectedEmployee.splitRule?.type === "equal") {
            splitAmount = amount / selectedEmployee.memberIds.length;
          } else if (selectedEmployee.splitRule?.type === "manual" && selectedEmployee.splitRule?.manualSplits) {
            splitAmount = selectedEmployee.splitRule.manualSplits[memberId] || 0;
          } else {
            splitAmount = amount / selectedEmployee.memberIds.length;
          }
          
          const splitAmountPaise = EmployeeService.formatMoneyToPaise(splitAmount);
          
          transaction.update(memberRef, {
            currentBalance: increment(-splitAmountPaise),
            updatedAt: serverTimestamp()
          });

          // Create employee ledger entry
          const employeeLedgerRef = doc(collection(db, "EMPLOYEE_LEDGER"));
          const employeeLedgerData = {
            employeeID: memberId,
            employeeName: memberData.name,
            labourID: memberData.labourID,
            transactionType: "debit",
            amount: splitAmountPaise, // Store as paisa
            date: new Date(date),
            referenceType: "expense",
            referenceID: expenseId,
            description: `Account payment (split) - ${description.trim()}`,
            previousBalance: memberData.currentBalance || 0, // Store as paisa
            newBalance: (memberData.currentBalance || 0) - splitAmountPaise, // Store as paisa
            toAccount: toAccount,
            orgID: orgID,
            accountID: selectedEmployee.id,
            accountName: selectedEmployee.name,
            createdAt: serverTimestamp(),
          };
          transaction.set(employeeLedgerRef, employeeLedgerData);
        }
      });
      
      await Promise.all(memberPromises);
    } else {
      // Apply individual employee transaction
      const employeeRef = doc(db, "employees", selectedEmployee.id);
      const employeeAmountPaise = EmployeeService.formatMoneyToPaise(amount);
      
      transaction.update(employeeRef, {
        currentBalance: increment(-employeeAmountPaise),
        updatedAt: serverTimestamp()
      });

      // Create employee ledger entry
      const employeeLedgerRef = doc(collection(db, "EMPLOYEE_LEDGER"));
      const employeeLedgerData = {
        employeeID: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        labourID: selectedEmployee.labourID,
        transactionType: "debit",
        amount: EmployeeService.formatMoneyToPaise(amount), // Store as paisa
        date: new Date(date),
        referenceType: "expense",
        referenceID: expenseId,
        description: `Employee payment - ${description.trim()}`,
        previousBalance: selectedEmployee.currentBalance || 0, // Store as paisa
        newBalance: (selectedEmployee.currentBalance || 0) - EmployeeService.formatMoneyToPaise(amount), // Store as paisa
        toAccount: toAccount,
        orgID: orgID,
        createdAt: serverTimestamp(),
      };
      transaction.set(employeeLedgerRef, employeeLedgerData);

      // If employee has an account, update the account balance too
      if (selectedEmployee.accountId) {
        await EmployeeService.updateAccountBalance(selectedEmployee.accountId);
      }
    }
  };

  // Reset form function
  const resetForm = () => {
    setAmount("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setEmployeeID("");
    setSelectedEmployee(null);
    setEmployeeSearch("");
    setPaymentType("wages");
    setExpenseType("EMPLOYEE");
    setSelectedVendor("");
    setRawMaterialType("RAW_MATERIAL_1");
    setQuantity("");
    setUnit("kg");
    setToAccount("CASH");
    
    // Reset date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  // Handle delete expense with proper cleanup
  const handleDeleteExpense = async (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const confirmDeleteExpense = async () => {
    try {
      const expense = expenseToDelete;

      // 1. Delete from EXPENSES collection
      await deleteDoc(doc(db, "EXPENSES", expense.id));

      // 2. If it's an EMPLOYEE payment, handle ledger cleanup and balance reversal
      if (expense.category === "EMPLOYEE") {
        try {
          
          // Check if it's an account payment or individual employee payment
          if (expense.isAccount) {
            // COMBINED ACCOUNT CLEANUP LOGIC
            console.log("🏢 Cleaning up combined account payment...");
            
            // 1. Delete from ACCOUNT_LEDGER
            const accountLedgerQuery = query(
              collection(db, "ACCOUNT_LEDGER"),
            where("orgID", "==", orgID),
            where("referenceID", "==", expense.id)
          );
          
            const accountLedgerSnapshot = await getDocs(accountLedgerQuery);
            
            if (!accountLedgerSnapshot.empty) {
              console.log("🗑️ Deleting account ledger entries:", accountLedgerSnapshot.size);
              // Delete from ACCOUNT_LEDGER
              const deletePromises = accountLedgerSnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              // Reverse account balance change
              if (expense.employeeID) {
                const accountRef = doc(db, "employeeaccounts", expense.employeeID);
                const adjustment = EmployeeService.formatMoneyToPaise(Number(expense.amount));
                
                await updateDoc(accountRef, {
                  currentBalance: increment(adjustment), // Reverse the original change
                  updatedAt: serverTimestamp()
                });
                
                console.log("✅ Account balance reversed by:", adjustment);
              }
            } else {
              console.log("⚠️ No account ledger entries found for expense:", expense.id);
            }

            // 2. Delete from EMPLOYEE_LEDGER (for split entries)
            const employeeLedgerQuery = query(
              collection(db, "EMPLOYEE_LEDGER"),
              where("orgID", "==", orgID),
              where("referenceID", "==", expense.id),
              where("accountID", "==", expense.employeeID)
            );
            
            const employeeLedgerSnapshot = await getDocs(employeeLedgerQuery);
            
            if (!employeeLedgerSnapshot.empty) {
              console.log("🗑️ Deleting employee ledger entries:", employeeLedgerSnapshot.size);
              
              // Get the ledger entries to reverse individual employee balances
              const ledgerEntries = employeeLedgerSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              // Reverse individual employee balance changes
              const memberReversalPromises = ledgerEntries.map(async (entry) => {
                const memberRef = doc(db, "employees", entry.employeeID);
                const adjustment = EmployeeService.formatMoneyToPaise(entry.amount);
                
                await updateDoc(memberRef, {
                  currentBalance: increment(adjustment), // Reverse the original change
                  updatedAt: serverTimestamp()
                });
                
                console.log(`✅ Member ${entry.employeeName} balance reversed by:`, adjustment);
              });
              
              await Promise.all(memberReversalPromises);
              
              // Delete the ledger entries
              const deletePromises = employeeLedgerSnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              console.log("✅ Employee ledger entries deleted");
              } else {
              console.log("⚠️ No employee ledger entries found for expense:", expense.id);
              }
            } else {
            // Handle individual employee payment cleanup
            console.log("👤 Cleaning up individual employee payment...");
            
            // Check if entry exists in EMPLOYEE_LEDGER
            const employeeLedgerQuery = query(
              collection(db, "EMPLOYEE_LEDGER"),
              where("orgID", "==", orgID),
              where("referenceID", "==", expense.id)
            );
            
            const employeeLedgerSnapshot = await getDocs(employeeLedgerQuery);
            
            if (!employeeLedgerSnapshot.empty) {
              console.log("🗑️ Deleting employee ledger entries:", employeeLedgerSnapshot.size);
              // Delete from EMPLOYEE_LEDGER
              const deletePromises = employeeLedgerSnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              // Reverse employee balance change
              if (expense.employeeID) {
                const employeeRef = doc(db, "employees", expense.employeeID);
                const adjustment = EmployeeService.formatMoneyToPaise(Number(expense.amount));
                
                await updateDoc(employeeRef, {
                  currentBalance: increment(adjustment), // Reverse the original change
                  updatedAt: serverTimestamp()
                });
                
                console.log("✅ Employee balance reversed by:", adjustment);

                // If employee has an account, update the account balance too
                if (expense.accountId) {
                  await EmployeeService.updateAccountBalance(expense.accountId);
                  console.log("✅ Account balance updated for employee's account");
                }
            }
          } else {
              console.log("⚠️ No employee ledger entries found for expense:", expense.id);
          }
          }
          
          console.log("✅ Employee payment cleanup completed");
        } catch (error) {
          console.error("❌ ERROR: Error cleaning up employee-related data:", error);
          toast.warning("Expense deleted but cleanup failed");
        }
      }

      toast.success("Expense deleted successfully");
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      
      // Force refresh of expenses table
      fetchPendingPayments();
      
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
      EMPLOYEE: "Employee Payment",
      LABOUR: "Labour Payment", // Legacy support
      RAW_MATERIAL_1: "Raw Material 1",
      RAW_MATERIAL_2: "Raw Material 2",
      CEMENT: "Cement",
      CONSUMABLES: "Consumables",
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title="Total Expenses Today"
              value={currency(filteredPendingPayments.reduce((sum, expense) => sum + (expense.amount || 0), 0))}
              icon="💰"
              color="blue"
            />
            <SummaryCard
              title="Employee Payments"
              value={currency(filteredPendingPayments.filter(e => e.category === "EMPLOYEE").reduce((sum, expense) => sum + (expense.amount || 0), 0))}
              icon="👥"
              color="green"
            />
            <SummaryCard
              title="Material Expenses"
              value={currency(filteredPendingPayments.filter(e => ["RAW_MATERIAL_1", "RAW_MATERIAL_2", "CEMENT", "CONSUMABLES"].includes(e.category)).reduce((sum, expense) => sum + (expense.amount || 0), 0))}
              icon="📦"
              color="orange"
            />
          </div>

          {/* Filter Bar */}
          <FilterBar>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div>
                <h2 className="text-xl font-bold text-white mb-1">Expense Management</h2>
                <p className="text-gray-400 text-sm">Track and manage all business expenses</p>
                  </div>
              <div className="flex gap-4 items-center">
                <DatePicker
                  value={selectedFilterDate}
                  onChange={setSelectedFilterDate}
                  className="w-40"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-xs font-semibold"
                    onClick={async () => {
                      console.log("🧪 Running manual test...");
                      const results = await testExpenseManagement();
                      if (results.errors.length === 0) {
                        toast.success("All tests passed! System is working.");
                      } else {
                        toast.error(`Tests failed: ${results.errors.length} errors found`);
                      }
                    }}
                  >
                    🧪 Test System
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25 transition-all duration-300 px-6 py-2 text-sm font-semibold"
                    onClick={() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      setDate(`${year}-${month}-${day}`);
                      setShowExpenseModal(true);
                    }}
                  >
                    💰 Add Expense
                  </Button>
                </div>
              </div>
                  </div>
          </FilterBar>

          {/* Expenses Table */}
          <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
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
                    label: 'Payment Mode',
                        render: (expense) => expense.toAccount || "—"
                      },
                  {
                    key: 'date',
                    label: 'Date',
                    render: (expense) => safeFormatDate(expense.date)
                      },
                      {
                        key: 'image',
                    label: 'Receipt',
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
                    label: isAdmin ? 'Actions' : 'Actions (Today Only)',
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
                    onChange={(value) => setExpenseType(value)}
                    options={[
                      { value: "EMPLOYEE", label: "Employee Payment" },
                      { value: "RAW_MATERIAL_1", label: "Raw Material 1" },
                      { value: "RAW_MATERIAL_2", label: "Raw Material 2" },
                      { value: "CEMENT", label: "Cement" },
                      { value: "CONSUMABLES", label: "Consumables" },
                      { value: "OTHER", label: "Other" }
                    ]}
                  />
                  <div className="form-group">
                    <div className="form-label">
                      👤 Employee Name
                    </div>
                    <div className="employee-search-container">
                      <Input
                        type="text"
                        value={employeeSearch}
                        onChange={handleEmployeeSearch}
                        placeholder="Start typing to search employee..."
                        required={expenseType === "EMPLOYEE"}
                      />
                      {(filteredEmployees.length > 0 || (employeeSearch.length === 0 && (employees.length > 0 || accounts.length > 0))) && (
                        <div className="employee-dropdown">
                          {(employeeSearch.length === 0 ? 
                            // Show accounts first, then individual employees when no search
                            [
                              ...accounts.map(account => ({
                                id: account.id,
                                name: account.name,
                                labourID: `ACCOUNT-${account.id.slice(-4)}`,
                                currentBalance: account.currentBalance,
                                accountId: account.id,
                                accountName: account.name,
                                accountType: account.accountType,
                                memberIds: account.memberIds,
                                isAccount: true
                              })),
                              ...employees.filter(emp => !emp.accountId).map(emp => ({ ...emp, isAccount: false }))
                            ] : 
                            filteredEmployees
                          ).slice(0, 10).map(item => (
                            <div
                              key={item.id}
                              className="employee-option"
                              onClick={() => handleEmployeeSelect(item)}
                            >
                              <span className="employee-name">{item.name}</span>
                              <span className="employee-id">({item.labourID})</span>
                              {item.isAccount ? (
                                <span className="account-indicator">
                                  🏢 Combined Account ({item.memberIds?.length || 0} members)
                                </span>
                              ) : item.accountName ? (
                                <span className="account-indicator">
                                  📊 {item.accountName}
                                </span>
                              ) : (
                                <span className="account-indicator">
                                  👤 Individual Employee
                                </span>
                              )}
                            </div>
                          ))}
                          {(employees.length + accounts.length) > 10 && employeeSearch.length === 0 && (
                            <div className="employee-option" style={{ fontStyle: 'italic', color: '#9ba3ae' }}>
                              Showing first 10. Type to search...
                            </div>
                          )}
                        </div>
                      )}
                      {/* Current Balance Display */}
                      {selectedEmployee && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#495057'
                        }}>
                          <strong>💰 Current Balance:</strong> ₹{EmployeeService.formatMoney(selectedEmployee.currentBalance || 0).toLocaleString()}
                          {selectedEmployee.accountName && (
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                              <strong>📊 Account:</strong> {selectedEmployee.accountName}
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
                        onChange={(value) => setSelectedVendor(value)}
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

          {/* Payment Type for Employee */}
          {expenseType === "EMPLOYEE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SelectField
                      label="💳 Payment Type"
                      value={paymentType}
                      onChange={(value) => setPaymentType(value)}
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
                      onChange={(value) => setToAccount(value)}
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

          {/* Description for Employee */}
          {expenseType === "EMPLOYEE" && (
            <div className="grid grid-cols-1 gap-6">
                    <Input
                      label="📝 Description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Wage payment for [Employee Name]"
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

          {/* Receipt Image for Non-Employee */}
          {expenseType !== "EMPLOYEE" && (
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

          {/* Image Upload for Employee */}
          {expenseType === "EMPLOYEE" && (
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

          {/* Employee Information Display */}
          {expenseType === "EMPLOYEE" && selectedEmployee && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="employee-info-grid">
                      <div className="employee-info-item">
                        <span className="info-label">Current Balance:</span>
                        <span className="info-value">{currency(EmployeeService.formatMoney(selectedEmployee.currentBalance || 0))}</span>
                      </div>
                      <div className="employee-info-item">
                        <span className="info-label">ID:</span>
                        <span className="info-value">{selectedEmployee.labourID}</span>
                      </div>
                      {selectedEmployee.isAccount ? (
                        <div className="employee-info-item">
                          <span className="info-label">Type:</span>
                          <span className="info-value">🏢 Combined Account ({selectedEmployee.memberIds?.length || 0} members)</span>
                        </div>
                      ) : selectedEmployee.accountName ? (
                        <div className="employee-info-item">
                          <span className="info-label">Account:</span>
                          <span className="info-value">{selectedEmployee.accountName}</span>
                        </div>
                      ) : (
                        <div className="employee-info-item">
                          <span className="info-label">Type:</span>
                          <span className="info-value">👤 Individual Employee</span>
                        </div>
                      )}
                      {selectedEmployee.employeeTags && selectedEmployee.employeeTags.length > 0 && (
                        <div className="employee-info-item">
                          <span className="info-label">Tags:</span>
                          <div className="employee-tags-list">
                            {selectedEmployee.employeeTags.map((tag, index) => (
                              <span key={index} className="employee-tag">
                                {tag}
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

      {/* EDIT EXPENSE MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="✏️ Edit Expense"
        size="lg"
      >
        <form onSubmit={handleUpdateExpense} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SelectField
              label="📝 Category"
              value={expenseType}
              onChange={(value) => setExpenseType(value)}
              options={[
                { value: "EMPLOYEE", label: "Employee Payment" },
                { value: "RAW_MATERIAL_1", label: "Raw Material 1" },
                { value: "RAW_MATERIAL_2", label: "Raw Material 2" },
                { value: "CEMENT", label: "Cement" },
                { value: "CONSUMABLES", label: "Consumables" },
                { value: "OTHER", label: "Other" }
              ]}
            />
            
            {/* Employee Selection (same as add modal) */}
            {expenseType === "EMPLOYEE" && (
              <div className="form-group">
                <div className="form-label">
                  👤 Employee Name
                </div>
                <div className="employee-search-container">
                  <Input
                    type="text"
                    value={employeeSearch}
                    onChange={handleEmployeeSearch}
                    placeholder="Start typing to search employee..."
                    className="employee-search-input"
                  />
                  
                  {/* Employee Dropdown */}
                  {filteredEmployees.length > 0 && (
                    <div className="employee-dropdown">
                      {filteredEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="employee-option"
                          onClick={() => handleEmployeeSelect(employee)}
                        >
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-id">{employee.labourID || employee.id}</div>
                          <div className="account-indicator">
                            {employee.isAccount ? "🏢 Combined Account" : "👤 Individual Employee"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Current Balance Display */}
                {selectedEmployee && (
                  <div className="employee-info-grid">
                    <div className="employee-info-item">
                      <span className="employee-info-label">Current Balance:</span>
                      <span className="employee-info-value">
                        ₹{EmployeeService.formatMoney(selectedEmployee.currentBalance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="employee-info-item">
                      <span className="employee-info-label">ID:</span>
                      <span className="employee-info-value">{selectedEmployee.labourID || selectedEmployee.id}</span>
                    </div>
                    <div className="employee-info-item">
                      <span className="employee-info-label">Type:</span>
                      <span className="employee-info-value">
                        {selectedEmployee.isAccount ? "Combined Account" : "Individual Employee"}
                      </span>
                    </div>
                    {selectedEmployee.employeeTags && selectedEmployee.employeeTags.length > 0 && (
                      <div className="employee-info-item">
                        <span className="employee-info-label">Tags:</span>
                        <div className="employee-tags">
                          {selectedEmployee.employeeTags.map((tag, index) => (
                            <span key={index} className="employee-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Raw Material Fields (same as add modal) */}
            {(expenseType === "RAW_MATERIAL_1" || expenseType === "RAW_MATERIAL_2" || expenseType === "CEMENT" || expenseType === "CONSUMABLES") && (
              <>
                <SelectField
                  label="🏢 Vendor"
                  value={selectedVendor}
                  onChange={(value) => setSelectedVendor(value)}
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
                  label="📏 Unit"
                  value={unit}
                  onChange={(value) => setUnit(value)}
                  options={[
                    { value: "kg", label: "Kilograms (kg)" },
                    { value: "tons", label: "Tons" },
                    { value: "pieces", label: "Pieces" },
                    { value: "bags", label: "Bags" },
                    { value: "liters", label: "Liters" }
                  ]}
                />
              </>
            )}

            {/* Payment Type for Employee */}
            {expenseType === "EMPLOYEE" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SelectField
                  label="💳 Payment Type"
                  value={paymentType}
                  onChange={(value) => setPaymentType(value)}
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
                  onChange={(value) => setToAccount(value)}
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

            <Input
              label="💰 Amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <Input
              label="📝 Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter expense description..."
              required
            />

            <Input
              label="📷 Receipt Image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (e) => setImagePreview(e.target.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Receipt preview" className="preview-image" />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading}
              className="button-primary"
            >
              {isUploading ? "⏳ Updating..." : "✅ Update Expense"}
            </Button>
            <Button
              type="button"
              variant="secondary" 
              onClick={() => setShowEditModal(false)}
            >
              ❌ Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Expense"
          message={`Are you sure you want to delete this expense: "${expenseToDelete.description}"? This action cannot be undone and will permanently remove the expense record.`}
          onConfirm={confirmDeleteExpense}
          onCancel={() => setShowDeleteModal(false)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}
    </DieselPage>
  );
};

export default ExpensesManagement;
