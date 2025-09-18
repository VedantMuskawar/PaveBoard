import React from 'react';

export default function DebugInfo({ orders }) {
  React.useEffect(() => {
    console.log("🔍 DEBUG: All orders in dashboard:");
    orders.forEach((order, index) => {
      console.log(`Order ${index}:`, {
        docID: order.docID,
        dmNumber: order.dmNumber,
        dmNumberType: typeof order.dmNumber,
        deliveryStatus: order.deliveryStatus,
        dispatchStatus: order.dispatchStatus,
        canCancel: !order.deliveryStatus && 
                   !order.dispatchStatus && 
                   order.dmNumber && 
                   order.dmNumber !== "Cancelled" && 
                   typeof order.dmNumber === "number"
      });
    });
  }, [orders]);

  return null; // This component doesn't render anything
}
