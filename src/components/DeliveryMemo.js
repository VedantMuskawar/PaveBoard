import {
    collection,
    doc,
    getDoc,
    getFirestore,
    increment,
    setDoc,
    updateDoc,
  } from "firebase/firestore";
  import { db } from "../config/firebase";
  
  export async function generateDeliveryMemo(order) {
    try {
      const dmCounterRef = doc(db, "DM_GENERATOR", `org_${order.orgID}`);
      const dmSnap = await getDoc(dmCounterRef);
  
      let nextDM = 1000;
      if (dmSnap.exists()) {
        nextDM = (dmSnap.data().lastDMNo || 999) + 1;
        await updateDoc(dmCounterRef, { lastDMNo: increment(1) });
      } else {
        await setDoc(dmCounterRef, { lastDMNo: nextDM });
      }
  
      const memoRef = doc(collection(db, "DELIVERY_MEMOS"));
      const dmData = {
        dmNumber: nextDM,
        orderID: order.docID || order.id,
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
        createdAt: new Date(),
      };
  
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
  
      await setDoc(memoRef, dmData);
      alert(`✅ Delivery Memo #${nextDM} generated for ${order.clientName}`);
    } catch (e) {
      console.error("Error generating Delivery Memo:", e);
      alert("❌ Error generating Delivery Memo: " + (e?.message || e));
    }
  }
  
  export async function cancelDeliveryMemo(dmID) {
    try {
      const dmRef = doc(db, "DELIVERY_MEMOS", dmID);
      
      // First, get the DM data to find the dmNumber and orderID
      const dmSnap = await getDoc(dmRef);
      if (!dmSnap.exists()) {
        alert(`❌ Delivery Memo ${dmID} not found.`);
        return;
      }
      
      const dmData = dmSnap.data();
      
      // Update DELIVERY_MEMOS status
      await updateDoc(dmRef, {
        status: "cancelled",
        cancelledAt: new Date(),
      });
  
      // ✅ LINK: Update SCH_ORDERS to mark dmNumber as "Cancelled"
      if (dmData.orderID) {
        try {
          await updateDoc(doc(db, "SCH_ORDERS", dmData.orderID), {
            dmNumber: "Cancelled"
          });
          console.log(`✅ Updated SCH_ORDERS ${dmData.orderID} dmNumber to "Cancelled"`);
        } catch (schError) {
          console.error("Failed to update SCH_ORDERS:", schError);
          // Don't fail the main cancellation if SCH_ORDERS update fails
        }
      }
      
      alert(`🚫 Delivery Memo ${dmID} has been cancelled.`);
    } catch (error) {
      console.error("Error cancelling Delivery Memo:", error);
      alert("❌ Failed to cancel Delivery Memo: " + (error?.message || error));
    }
  }
  