import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    increment,
    setDoc,
    updateDoc,
    runTransaction,
    serverTimestamp,
  } from "firebase/firestore";
  import { db } from "../config/firebase";
  
/**
 * Enhanced DM generation with proper deduplication and transaction safety
 * @param {Object} order - The SCH_ORDERS document data
 * @returns {Promise<{success: boolean, dmNumber?: number, error?: string}>}
 */
export async function generateDeliveryMemo(order) {
  try {
    // Validate required order data upfront
    if (!order.docID && !order.id) {
      throw new Error("Order must have a docID or id");
    }
    if (!order.defOrderID) {
      throw new Error("Order must have a defOrderID");
    }
    if (!order.deliveryDate) {
      throw new Error("Order must have a deliveryDate");
    }

    const schOrderDocID = order.docID || order.id;
    
    // Use Firestore transaction for atomic operations
    const result = await runTransaction(db, async (transaction) => {
      // Step 1: Check if current SCH_ORDERS doc already has a dmNumber
      const schOrderRef = doc(db, "SCH_ORDERS", schOrderDocID);
      const schOrderSnap = await transaction.get(schOrderRef);
      
      if (!schOrderSnap.exists()) {
        throw new Error(`SCH_ORDERS document ${schOrderDocID} not found`);
      }
      
      const schOrderData = schOrderSnap.data();
      
      // If this SCH_ORDERS doc already has a dmNumber, return it
      if (schOrderData.dmNumber && typeof schOrderData.dmNumber === 'number') {
        console.log(`SCH_ORDERS ${schOrderDocID} already has DM #${schOrderData.dmNumber}`);
        return {
          success: true,
          dmNumber: schOrderData.dmNumber,
          isExisting: true
        };
      }

      // Step 2: Defensive check - ensure no other SCH_ORDERS doc with same defOrderID + deliveryDate has a DM
      const duplicateCheckQuery = query(
        collection(db, "SCH_ORDERS"),
        where("defOrderID", "==", order.defOrderID),
        where("deliveryDate", "==", order.deliveryDate),
        where("orgID", "==", order.orgID)
      );
      
      // Note: We can't use transaction.get() with queries, so we'll do this check outside transaction
      // This is handled in the calling function before the transaction
      
      // Step 3: Get and increment DM counter atomically
      const dmCounterRef = doc(db, "DM_GENERATOR", `org_${order.orgID}`);
      const dmCounterSnap = await transaction.get(dmCounterRef);
      
      let nextDM = 1000;
      if (dmCounterSnap.exists()) {
        nextDM = (dmCounterSnap.data().lastDMNo || 999) + 1;
        transaction.update(dmCounterRef, { 
          lastDMNo: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        transaction.set(dmCounterRef, { 
          lastDMNo: nextDM,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Step 4: Create DM document
      const memoRef = doc(collection(db, "DELIVERY_MEMOS"));
      const dmData = {
        dmNumber: nextDM,
        orderID: schOrderDocID,        // Links to specific SCH_ORDERS document
        defOrderID: order.defOrderID,  // Also store defOrderID for reference (backwards compatibility)
        clientID: order.clientID,
        clientName: order.clientName,
        vehicleNumber: order.vehicleNumber,
        regionName: order.regionName,
        productName: order.productName,
        productQuant: order.productQuant,
        productUnitPrice: order.productUnitPrice,
        toAccount: order.toAccount,
        paySchedule: order.paySchedule,
        paymentStatus: order.paymentStatus,
        clientPhoneNumber: order.clientPhoneNumber || "",
        address: order.address || "",
        driverName: order.driverName || "",
        orgID: order.orgID,
        status: "active",
        createdAt: serverTimestamp(),
      };

      // Add optional fields
      const optionalFields = [
        "dispatchStart",
        "dispatchEnd",
        "deliveryDate",
        "dispatchedTime",
        "deliveredTime",
      ];
      optionalFields.forEach((field) => {
        if (order[field] !== undefined && order[field] !== null) {
          dmData[field] = order[field];
        }
      });

      transaction.set(memoRef, dmData);

      // Step 5: Update SCH_ORDERS document with dmNumber and metadata
      transaction.update(schOrderRef, {
        dmNumber: nextDM,
        dmGeneratedAt: serverTimestamp(),
        dmDocumentID: memoRef.id, // Store reference to DELIVERY_MEMOS document
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        dmNumber: nextDM,
        dmDocumentID: memoRef.id,
        isExisting: false
      };
    });

    // Success notification
    if (result.isExisting) {
      alert(`✅ Delivery Memo #${result.dmNumber} already exists for ${order.clientName}`);
    } else {
      alert(`✅ Delivery Memo #${result.dmNumber} generated for ${order.clientName}`);
    }
    
    return result;

  } catch (e) {
    console.error("Error generating Delivery Memo:", e);
    const errorMsg = e?.message || e;
    alert("❌ Error generating Delivery Memo: " + errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Enhanced DM generation with pre-transaction duplicate checks
 * This wrapper function handles the defOrderID + deliveryDate + dispatchStart + dispatchEnd duplicate check
 * Orders with same defOrderID + deliveryDate + dispatchStart + dispatchEnd are considered duplicates
 * Orders with same defOrderID + deliveryDate but different dispatch times are considered separate orders
 * @param {Object} order - The SCH_ORDERS document data
 * @returns {Promise<{success: boolean, dmNumber?: number, error?: string}>}
 */
export async function generateDeliveryMemoSafe(order) {
  try {
    // Enhanced deduplication check: defOrderID + deliveryDate + dispatchStart + dispatchEnd
    const duplicateCheckQuery = query(
      collection(db, "SCH_ORDERS"),
      where("defOrderID", "==", order.defOrderID),
      where("deliveryDate", "==", order.deliveryDate),
      where("orgID", "==", order.orgID)
    );
    
    const duplicateSnap = await getDocs(duplicateCheckQuery);
    const currentDocID = order.docID || order.id;
    
    // Helper function to compare dispatch times
    const compareDispatchTimes = (time1, time2) => {
      if (!time1 && !time2) return true; // Both null/undefined
      if (!time1 || !time2) return false; // One is null, other isn't
      
      // Handle Firestore Timestamp objects
      const getTime = (time) => {
        if (time && time.seconds) return time.seconds;
        if (time instanceof Date) return time.getTime() / 1000;
        return time;
      };
      
      return getTime(time1) === getTime(time2);
    };
    
    // Check if any OTHER SCH_ORDERS doc (not the current one) already has a dmNumber
    // AND has the same dispatch times (making them truly duplicate orders)
    const conflictingDocs = duplicateSnap.docs.filter(doc => {
      const data = doc.data();
      const hasDM = data.dmNumber && typeof data.dmNumber === 'number';
      const isDifferentDoc = doc.id !== currentDocID;
      
      if (!hasDM || !isDifferentDoc) return false;
      
      // Check if dispatch times are the same (making them duplicates)
      const sameDispatchStart = compareDispatchTimes(data.dispatchStart, order.dispatchStart);
      const sameDispatchEnd = compareDispatchTimes(data.dispatchEnd, order.dispatchEnd);
      
      return sameDispatchStart && sameDispatchEnd;
    });
    
    if (conflictingDocs.length > 0) {
      const conflictingDoc = conflictingDocs[0];
      const conflictData = conflictingDoc.data();
      
      // Log the dispatch time comparison for debugging
      console.log("Duplicate order detected with same dispatch times:", {
        currentOrder: {
          id: currentDocID,
          defOrderID: order.defOrderID,
          deliveryDate: order.deliveryDate,
          dispatchStart: order.dispatchStart,
          dispatchEnd: order.dispatchEnd
        },
        conflictingOrder: {
          id: conflictingDoc.id,
          defOrderID: conflictData.defOrderID,
          deliveryDate: conflictData.deliveryDate,
          dispatchStart: conflictData.dispatchStart,
          dispatchEnd: conflictData.dispatchEnd,
          dmNumber: conflictData.dmNumber
        }
      });
      
      throw new Error(
        `Duplicate prevention: Another order (${conflictingDoc.id}) with the same defOrderID (${order.defOrderID}), delivery date, and dispatch times already has DM #${conflictData.dmNumber}`
      );
    }

    // If safe, proceed with transaction-based generation
    return await generateDeliveryMemo(order);

  } catch (e) {
    console.error("Error in generateDeliveryMemoSafe:", e);
    const errorMsg = e?.message || e;
    alert("❌ " + errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

export async function cancelDeliveryMemo(dmID) {
  try {
    // First, get DM data outside transaction to find related orders
    const dmRef = doc(db, "DELIVERY_MEMOS", dmID);
    const dmSnap = await getDoc(dmRef);
    
    if (!dmSnap.exists()) {
      throw new Error(`Delivery Memo ${dmID} not found`);
    }
    
    const dmData = dmSnap.data();
    
    // Find all SCH_ORDERS documents that reference this DM
    const relatedOrdersQuery = query(
      collection(db, "SCH_ORDERS"),
      where("dmNumber", "==", dmData.dmNumber),
      where("orgID", "==", dmData.orgID)
    );
    
    const relatedOrdersSnap = await getDocs(relatedOrdersQuery);
    console.log(`Found ${relatedOrdersSnap.docs.length} SCH_ORDERS documents referencing DM #${dmData.dmNumber}`);
    
    const result = await runTransaction(db, async (transaction) => {
      // Update DELIVERY_MEMOS status
      transaction.update(dmRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
      });

      // Update all related SCH_ORDERS documents
      relatedOrdersSnap.docs.forEach(orderDoc => {
        console.log(`Updating SCH_ORDERS ${orderDoc.id} to mark DM as cancelled`);
        transaction.update(doc(db, "SCH_ORDERS", orderDoc.id), {
          dmNumber: "Cancelled",
          dmCancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      return {
        success: true,
        dmNumber: dmData.dmNumber,
        clientName: dmData.clientName,
        affectedOrders: relatedOrdersSnap.docs.length
      };
    });
    
    alert(`🚫 Delivery Memo #${result.dmNumber} has been cancelled. ${result.affectedOrders} order(s) updated.`);
    return result;
    
  } catch (error) {
    console.error("Error cancelling Delivery Memo:", error);
    const errorMsg = error?.message || error;
    alert("❌ Failed to cancel Delivery Memo: " + errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}