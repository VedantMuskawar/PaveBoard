import { useEffect, useState, useRef } from "react";
import { db, auth } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { generateDeliveryMemoSafe } from "./DeliveryMemo";

export default function DMButtons({ order, onActionLoading }) {
  const [dmInfo, setDmInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);

  useEffect(() => {
    const detectClientDuplicates = async () => {
      if (!order?.clientName || !order?.deliveryDate) return;

      const q = query(
        collection(db, "SCH_ORDERS"),
        where("clientName", "==", order.clientName),
        where("deliveryDate", "==", order.deliveryDate),
        where("orgID", "==", order.orgID)
      );
      const snap = await getDocs(q);
      // Multiple orders for same person/vehicle/day are now expected and supported
      // No logging needed
    };
    detectClientDuplicates();
  }, [order]);

  useEffect(() => {
    const fetchDM = async () => {
      // Use docID as primary identifier to ensure each SCH_ORDERS document gets its own DM
      const orderIdentifier = order.docID || order.id;
      
      const q = query(
        collection(db, "DELIVERY_MEMOS"),
        where("orderID", "==", orderIdentifier),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const activeDoc = snap.docs.find(doc => doc.data().status === "active");
        if (activeDoc) {
          setDmInfo({ id: activeDoc.id, ...activeDoc.data() });
        }
      }
    };
    fetchDM();
  }, [order.docID, order.id]);

  const buttonStyleBase = {
    padding: "0.4rem 0.9rem",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  };

  const handleGenerate = async () => {
    const actionId = `generate-${order.docID || order.id}`;
    
    // Prevent multiple rapid clicks
    if (loading) return;
    
    setLoading(true);
    if (onActionLoading) onActionLoading(actionId, true);

    try {
      // Validate order is not already delivered or dispatched
      if (order.deliveryStatus) {
        alert("Cannot generate DM for an already delivered order.");
        return;
      }
      
      if (order.dispatchStatus) {
        alert("Cannot generate DM for an already dispatched order.");
        return;
      }

      // Enhanced deduplication checks with transaction-safe generation
      // 1. Check if current SCH_ORDERS already has a dmNumber
      if (order.dmNumber && typeof order.dmNumber === 'number') {
        alert(`This order already has Delivery Memo #${order.dmNumber}.`);
        // Fetch and set DM info for UI consistency
        const q = query(
          collection(db, "DELIVERY_MEMOS"),
          where("dmNumber", "==", order.dmNumber),
          where("orgID", "==", order.orgID),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const dmDoc = snap.docs[0];
          setDmInfo({ id: dmDoc.id, ...dmDoc.data() });
        }
        return;
      }

      // 2. Validate required order data
      if (!order.clientName || !order.vehicleNumber || !order.productName) {
        alert("Cannot generate DM: Missing required order information (client name, vehicle number, or product name).");
        return;
      }

      if (!order.defOrderID) {
        alert("Cannot generate DM: Missing defOrderID in order data.");
        return;
      }

      if (!order.deliveryDate) {
        alert("Cannot generate DM: Missing deliveryDate in order data.");
        return;
      }

      // 3. Generate new DM using enhanced transaction-safe method
      const result = await generateDeliveryMemoSafe(order);
      
      if (!result.success) {
        console.error("DM generation failed:", result.error);
        return;
      }

      // Set DM info from successful generation result
      if (result.dmNumber) {
        // Query for the DM document by dmNumber (more reliable than orderID after transaction)
        const q = query(
          collection(db, "DELIVERY_MEMOS"),
          where("dmNumber", "==", result.dmNumber),
          where("orgID", "==", order.orgID),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const dmDoc = snap.docs[0];
          setDmInfo({ id: dmDoc.id, ...dmDoc.data() });
          
          // Only show "just generated" animation for new DMs
          if (!result.isExisting) {
            setJustGenerated(true);
            setTimeout(() => setJustGenerated(false), 3000);
          }
        }
      }
    } catch (error) {
      console.error("Error generating DM:", error);
      if (error.code === 'permission-denied') {
        alert("You don't have permission to generate delivery memos.");
      } else if (error.code === 'quota-exceeded') {
        alert("Daily quota exceeded. Please try again tomorrow.");
      } else if (error.message.includes("Missing required")) {
        alert(error.message);
      } else {
        alert("Failed to generate DM. Please try again or contact support.");
      }
    } finally {
      setLoading(false);
      if (onActionLoading) onActionLoading(actionId, false);
    }
  };

  const handleCancel = async () => {
    if (!dmInfo) return;
    
    // Enhanced confirmation with DM details
    const confirmMessage = `Are you sure you want to cancel Delivery Memo #${dmInfo.dmNumber} for ${order.clientName}?\n\nThis action cannot be undone.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    const actionId = `cancel-dm-${order.docID || order.id}`;
    if (onActionLoading) onActionLoading(actionId, true);

    try {
      console.log("🚀 Starting DM cancellation process...");
      console.log("DM Info:", dmInfo);
      console.log("Order Info:", order);
      console.log("Current User:", auth.currentUser?.uid);

      // Validate order is not already delivered or dispatched
      if (order.deliveryStatus) {
        console.log("❌ Order already delivered");
        alert("Cannot cancel DM for an already delivered order.");
        return;
      }
      
      if (order.dispatchStatus) {
        console.log("❌ Order already dispatched");
        alert("Cannot cancel DM for an already dispatched order.");
        return;
      }

      // Verify DM still exists and is active with orgID filter
      const verifyQuery = query(
        collection(db, "DELIVERY_MEMOS"),
        where("dmNumber", "==", dmInfo.dmNumber),
        where("status", "==", "active"),
        where("orgID", "==", order.orgID)
      );
      console.log("🔍 Verifying DM exists with query:", verifyQuery);
      const verifySnap = await getDocs(verifyQuery);
      
      if (verifySnap.empty) {
        console.log("❌ DM not found or already cancelled");
        alert("Delivery Memo not found or has already been cancelled.");
        setDmInfo(null);
        return;
      }

      console.log("✅ DM verification successful, proceeding with cancellation");

      // Update DELIVERY_MEMOS collection
      console.log("📝 Updating DELIVERY_MEMOS document:", dmInfo.id);
      await updateDoc(doc(db, "DELIVERY_MEMOS", dmInfo.id), {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: auth.currentUser?.uid || "unknown",
        clientName: "Cancelled",
        vehicleNumber: "Cancelled",
        productName: "Cancelled",
        regionName: "Cancelled",
        productQuant: "Cancelled",
        productUnitPrice: "Cancelled",
        toAccount: "Cancelled",
        paySchedule: "Cancelled",
        dispatchedTime: "Cancelled",
        deliveredTime: "Cancelled"
      });

      // Update SCH_ORDERS collection
      const docId = order.docID || order.id;
      console.log("📝 Updating SCH_ORDERS document:", docId);
      await updateDoc(doc(db, "SCH_ORDERS", docId), {
        dmNumber: "Cancelled",
        dmCancelledAt: new Date(),
        dmCancelledBy: auth.currentUser?.uid || "unknown"
      });

      console.log("✅ DM cancellation completed successfully");

      // Clear DM info and refresh the component state
      setDmInfo(null);
      alert(`Delivery Memo #${dmInfo.dmNumber} has been successfully cancelled.`);
      
      // Force a re-fetch of DM status to ensure UI updates correctly
      setTimeout(async () => {
        const orderIdentifier = order.docID || order.id;
        const q = query(
          collection(db, "DELIVERY_MEMOS"),
          where("orderID", "==", orderIdentifier),
          where("status", "==", "active"),
          where("orgID", "==", order.orgID)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setDmInfo(null);
        } else {
          const activeDoc = snap.docs.find(doc => doc.data().status === "active");
          if (activeDoc) {
            setDmInfo({ id: activeDoc.id, ...activeDoc.data() });
          }
        }
      }, 500);
    } catch (error) {
      console.error("❌ Error cancelling DM:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.code === 'permission-denied') {
        alert("You don't have permission to cancel this delivery memo. Please check your Firebase security rules.");
      } else if (error.code === 'not-found') {
        alert("Delivery Memo not found. It may have already been cancelled.");
      } else {
        alert(`Failed to cancel delivery memo: ${error.message}. Please try again or contact support.`);
      }
    } finally {
      if (onActionLoading) onActionLoading(actionId, false);
    }
  };

  if (dmInfo) {
    return (
      <>
        <a
          href={`/print-dm/${dmInfo.dmNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn generated"
          style={{
            ...buttonStyleBase,
            marginRight: "8px",
            background: "orange",
            color: "#ccc",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.3s ease-in-out",
            opacity: 1,
          }}
        >
          ✅ DM #{dmInfo.dmNumber} {justGenerated && <span style={{ marginLeft: 6, color: '#00ff99', fontWeight: 'bold' }}>✔️</span>}
        </a>
        <button
          className="action-btn"
          style={{
            ...buttonStyleBase,
            background: "#ff4444",
            color: "white",
            cursor: order.deliveryStatus ? "not-allowed" : "pointer",
            opacity: order.deliveryStatus ? 0.5 : 1,
            transition: "background-color 0.3s ease, transform 0.3s ease",
          }}
          onClick={!order.deliveryStatus ? handleCancel : undefined}
          disabled={order.deliveryStatus}
          onMouseEnter={(e) => {
            if (!order.deliveryStatus) {
              e.currentTarget.style.background = "#aa2222";
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e) => {
            if (!order.deliveryStatus) {
              e.currentTarget.style.background = "#ff4444";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
          onFocus={(e) => {
            if (!order.deliveryStatus) {
              e.currentTarget.style.background = "#aa2222";
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onBlur={(e) => {
            if (!order.deliveryStatus) {
              e.currentTarget.style.background = "#ff4444";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
        >
          Cancel DM
        </button>
      </>
    );
  }

  return (
    <button
      className="action-btn"
      style={{
        ...buttonStyleBase,
        background: "#00c3ff",
        color: "black",
        transition: "all 0.3s ease-in-out",
        opacity: loading ? 0.6 : 1,
      }}
      onClick={handleGenerate}
      disabled={loading}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#00aadd";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#00c3ff";
        e.currentTarget.style.transform = "scale(1)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = "#00aadd";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = "#00c3ff";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <span style={{ transition: "opacity 0.3s ease-in-out" }}>
        {loading ? "⏳ Generating..." : "Generate DM"}
      </span>
    </button>
  );
}
