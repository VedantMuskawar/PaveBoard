import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, updateDoc, serverTimestamp, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing orders data and operations
 * Handles fetching, filtering, pagination, and order cancellation
 */
export const useOrders = (orgID, filters, pagination) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [readCount, setReadCount] = useState(0);
  
  const {
    statusFilter,
    dmFrom,
    dmTo,
    startDate,
    endDate,
    sortOrder
  } = filters;
  
  const { currentPage } = pagination;
  const rowsPerPage = 20;

  // Input validation helpers
  const validateDMRange = useCallback((dmFrom, dmTo) => {
    if (!dmFrom || !dmTo) return true;
    const from = parseInt(dmFrom);
    const to = parseInt(dmTo);
    return !isNaN(from) && !isNaN(to) && from <= to;
  }, []);

  const validateDateRange = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return true;
    return new Date(startDate) <= new Date(endDate);
  }, []);

  // Build optimized Firestore query with database-level filtering and pagination
  const buildOptimizedQuery = useCallback((page = 1, pageSize = 20) => {
    if (!orgID) return null;
    
    const ordersRef = collection(db, "DELIVERY_MEMOS");
    let queryConstraints = [
      where("orgID", "==", orgID)
    ];
    
    // Add status filter to database query
    if (statusFilter !== "all") {
      queryConstraints.push(where("status", "==", statusFilter));
    }
    
    // Add DM number range filter to database query with validation
    if (dmFrom && dmTo && validateDMRange(dmFrom, dmTo)) {
      const fromNum = parseInt(dmFrom);
      const toNum = parseInt(dmTo);
      if (!isNaN(fromNum) && !isNaN(toNum)) {
        queryConstraints.push(
          where("dmNumber", ">=", fromNum),
          where("dmNumber", "<=", toNum)
        );
      }
    }
    
    // Add date range filter to database query with validation
    if (startDate && endDate && validateDateRange(startDate, endDate)) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Validate dates
      if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        endDateObj.setHours(23, 59, 59, 999); // End of day
        
        queryConstraints.push(
          where("deliveryDate", ">=", startDateObj),
          where("deliveryDate", "<=", endDateObj)
        );
      }
    }
    
    // Add ordering
    queryConstraints.push(orderBy("dmNumber", sortOrder === "asc" ? "asc" : "desc"));
    
    // Add pagination
    queryConstraints.push(limit(pageSize));
    
    return query(ordersRef, ...queryConstraints);
  }, [orgID, statusFilter, dmFrom, dmTo, startDate, endDate, sortOrder, validateDMRange, validateDateRange]);

  // Load orders with optimized database queries and pagination
  useEffect(() => {
    if (!orgID) return;
    
    setLoading(true);
    setError(null);
    
    const q = buildOptimizedQuery(currentPage, rowsPerPage);
    if (!q) return;
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure status is properly set
        status: doc.data().status || (doc.data().dmNumber === "Cancelled" ? "cancelled" : "active")
      }));
      
      // Update read count (reset for each query, don't accumulate)
      setReadCount(snapshot.docs.length);
      
      setOrders(ordersData);
      setLoading(false);
      
    }, (error) => {
      setError(error);
      toast.error("Failed to load orders from Firebase");
      setOrders([]);
      setLoading(false);
    });
    
    // Cleanup listener when component unmounts or dependencies change
    return () => {
      unsubscribe();
    };
  }, [orgID, currentPage, statusFilter, dmFrom, dmTo, startDate, endDate, sortOrder, buildOptimizedQuery]);

  // Cancel order function
  const cancelOrder = useCallback(async (selectedDM, wallet, orgID) => {
    if (!selectedDM) {
      toast.error("No order selected for cancellation.");
      return false;
    }

    try {
      // Validate selectedDM has required fields
      if (!selectedDM.id || !selectedDM.dmNumber) {
        toast.error("Invalid order data. Cannot cancel this order.");
        return false;
      }

      // Use transaction to ensure atomic updates
      await runTransaction(db, async (transaction) => {
        // Update DELIVERY_MEMOS document
        const docRef = doc(db, "DELIVERY_MEMOS", selectedDM.id);
        transaction.update(docRef, {
          status: "cancelled",
          clientName: "Cancelled",
          productQuant: "Cancelled",
          productUnitPrice: "Cancelled",
          regionName: "Cancelled",
          vehicleNumber: "Cancelled",
          clientPhoneNumber: "Cancelled",
          paySchedule: "Cancelled",
          dispatchedTime: "Cancelled",
          dispatchStart: selectedDM.dispatchStart || "",
          dispatchEnd: selectedDM.dispatchEnd || "",
          deliveredTime: "Cancelled",
          productName: "Cancelled",
          toAccount: "Cancelled",
          paymentStatus: false,
          cancelledAt: serverTimestamp(),
          cancelledBy: wallet?.uid || 'unknown',
          cancelledByName: wallet?.name || wallet?.displayName || 'Unknown'
        });

        // Update SCH_ORDERS to mark dmNumber as "Cancelled"
        const schQuery = query(
          collection(db, "SCH_ORDERS"),
          where("dmNumber", "==", selectedDM.dmNumber),
          where("orgID", "==", orgID)
        );
        const schSnapshot = await getDocs(schQuery);
        if (!schSnapshot.empty) {
          const schDoc = schSnapshot.docs[0];
          transaction.update(doc(db, "SCH_ORDERS", schDoc.id), {
            dmNumber: "Cancelled"
          });
        }
      });

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedDM.id 
            ? { ...order, status: "cancelled" }
            : order
        )
      );

      toast.success(`DM #${selectedDM.dmNumber} cancelled successfully.`);
      return true;
    } catch (err) {
      // Provide specific error messages based on error type
      if (err.code === 'permission-denied') {
        toast.error("Permission denied. You don't have access to cancel this order.");
      } else if (err.code === 'not-found') {
        toast.error("Order not found. It may have been deleted.");
      } else if (err.code === 'unavailable') {
        toast.error("Service temporarily unavailable. Please try again.");
      } else {
        toast.error("Failed to cancel order. Please try again.");
      }
      return false;
    }
  }, []);

  // Memoize filtered orders for text search
  const filteredOrders = useMemo(() => {
    return orders; // Database filtering handles most cases, this is for text search
  }, [orders]);

  return {
    orders: filteredOrders,
    loading,
    error,
    cancelOrder,
    readCount
  };
};
