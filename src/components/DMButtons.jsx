import { useEffect, useState, useRef } from "react";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { generateDeliveryMemo } from "./DeliveryMemo";

export default function DMButtons({ order }) {
  const [dmInfo, setDmInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const mounted = useRef(true);

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
      if (snap.size > 1) {
        console.warn(`Multiple orders found for ${order.clientName} on ${order.deliveryDate}`);
      }
    };
    detectClientDuplicates();
  }, [order]);

  useEffect(() => {
    const fetchDM = async () => {
      const q = query(
        collection(db, "DELIVERY_MEMOS"),
        where("orderID", "==", order.docID || order.id),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      if (!mounted.current) return;
      if (!snap.empty) {
        const activeDoc = snap.docs.find(doc => doc.data().status === "active");
        if (activeDoc) {
          setDmInfo({ id: activeDoc.id, ...activeDoc.data() });
        }
      }
    };
    fetchDM();
    return () => {
      mounted.current = false;
    };
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
    setLoading(true);

    // Check if a DM already exists for this exact order
    const checkQ = query(
      collection(db, "DELIVERY_MEMOS"),
      where("orderID", "==", order.docID || order.id),
      where("status", "==", "active")
    );
    const existingSnap = await getDocs(checkQ);
    if (!existingSnap.empty) {
      const existingDM = existingSnap.docs[0];
      alert(`A Delivery Memo (#${existingDM.data().dmNumber}) already exists for this order.`);
      setDmInfo({ id: existingDM.id, ...existingDM.data() });
      setLoading(false);
      return;
    }


    // Otherwise generate a new DM
    await generateDeliveryMemo(order);

    // Fetch newly generated DM
    const q = query(
      collection(db, "DELIVERY_MEMOS"),
      where("orderID", "==", order.docID || order.id),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    if (!mounted.current) return;
    if (!snap.empty) {
      setDmInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
      const docData = snap.docs[0].data();
      const docId = order.docID || order.id;
      console.log("🛠 Updating SCH_ORDERS document:", docId, "with DM number:", docData.dmNumber);
      await updateDoc(doc(db, "SCH_ORDERS", docId), {
        dmNumber: docData.dmNumber,
        clientPhoneNumber: order.clientPhoneNumber || "",
        address: order.address || "",
        driverName: order.driverName || "",
      });
      setJustGenerated(true);
      setTimeout(() => setJustGenerated(false), 3000);
    }

    setLoading(false);
  };

  const handleCancel = async () => {
    if (!dmInfo) return;
    const confirmed = window.confirm("Are you sure you want to cancel this Delivery Memo?");
    if (!confirmed) return;

    await updateDoc(doc(db, "DELIVERY_MEMOS", dmInfo.id), {
      status: "cancelled",
      cancelledAt: new Date(),
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

    const docId = order.docID || order.id;
    await updateDoc(doc(db, "SCH_ORDERS", docId), {
      dmNumber: "Cancelled", // ✅ LINK: Mark as "Cancelled" not null
    });

    // Clear DM info and refresh the component state
    setDmInfo(null);
    
    // Force a re-fetch of DM status to ensure UI updates correctly
    setTimeout(async () => {
      const q = query(
        collection(db, "DELIVERY_MEMOS"),
        where("orderID", "==", order.docID || order.id),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      if (!mounted.current) return;
      if (snap.empty) {
        setDmInfo(null); // Confirm no active DM exists
      } else {
        const activeDoc = snap.docs.find(doc => doc.data().status === "active");
        if (activeDoc) {
          setDmInfo({ id: activeDoc.id, ...activeDoc.data() });
        }
      }
    }, 500); // Small delay to ensure database updates are processed
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
