import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// This component expects a prop: dmNumber
const PrintDM = forwardRef(({ dmNumber, isOpen = true, onClose }, ref) => {
  const [dmData, setDMData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (!dmNumber) return;
    setDMData(null);
    setNotFound(false);
    const fetchDM = async () => {
      try {
        const q = query(
          collection(db, "DELIVERY_MEMOS"),
          where("dmNumber", "==", Number(dmNumber))
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const dmDoc = snap.docs[0];
          const data = dmDoc.data();
          // Fetch related scheduled order for phone and driver
          const schQuery = query(
            collection(db, "SCH_ORDERS"),
            where("orderID", "==", data.orderID),
            where("orgID", "==", data.orgID)
          );
          const schSnap = await getDocs(schQuery);
          if (!schSnap.empty) {
            const schData = schSnap.docs[0].data();
            setDMData({
              ...data,
              clientPhone: schData.clientPhoneNumber || data.clientPhone || "N/A",
              driverName: schData.driverName || data.driverName || "N/A"
            });
          } else {
            setDMData(data);
          }
        } else {
          setNotFound(true);
        }
      } catch (e) {
        setNotFound(true);
      }
    };
    fetchDM();
  }, [dmNumber]);

  // Print function with proper print window handling
  const handlePrint = () => {
    window.print();
  };

  useImperativeHandle(ref, () => ({
    handlePrint
  }));

  if (notFound) {
    return (
      <div style={{ color: "black", padding: "2rem", textAlign: "center", fontWeight: 600 }}>
        DM not found
      </div>
    );
  }

  if (!dmData) {
    return null;
  }

  return (
    <>
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                background: white !important;
                overflow: visible !important;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .print-preview-container {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                overflow: visible !important;
              }
              .page-shadow {
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 5mm auto !important;
                padding: 0 !important;
                width: 200mm !important;
                height: 287mm !important;
                display: block !important;
                overflow: visible !important;
              }
              .page {
                box-shadow: none !important;
                border-radius: 0 !important;
                width: 200mm !important;
                height: 287mm !important;
                margin: 0 !important;
                padding: 5mm !important;
                display: block !important;
                overflow: visible !important;
              }
              .wrapper {
                width: 190mm !important;
                height: 277mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
                overflow: visible !important;
              }
              .ticket {
                width: 190mm !important;
                height: 138mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 auto !important;
                overflow: visible !important;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
          <div ref={printRef} className="print-preview-container">
            <div style={styles.page} className="page-shadow page">
              <div style={styles.wrapper} className="wrapper">
                <div style={styles.printPage}>
                  <div style={styles.ticket} className="ticket">
                    <img src="/watermark.png" alt="Watermark" style={styles.watermark} />
                    <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#b22222" }}>🚩 जय श्री राम 🚩</div>
                    <div style={styles.branding}>
                      <div style={styles.companyName}>LAKSHMEE INTELLIGENT TECHNOLOGIES</div>
                      <div style={styles.contactDetails}>B-24/2, M.I.D.C., CHANDRAPUR - 442406</div>
                      <div style={styles.contactDetails}>Ph: +91 8149448822 | +91 9420448822</div>
                    </div>
                    <hr style={{ borderTop: "2px solid #000", margin: "6px 0" }} />
                    <div style={styles.titleRow}>
                      <div style={styles.memoTitle}>🚚 Delivery Memo</div>
                      <div style={styles.metaRight}>DM No. #{dmData.dmNumber}</div>
                    </div>
                    <div style={styles.mainContent}>
                      <div style={styles.leftColumn}>
                        <div style={styles.qrSectionLarge}>
                          <div style={styles.qrCodeLarge}>
                            <img 
                              src="/Payment QR.jpeg" 
                              alt="Payment QR Code" 
                              style={styles.qrImageLarge}
                            />
                          </div>
                          <div style={styles.qrLabelLarge}>Lakshmee Intelligent Technologies</div>
                          <div style={styles.qrAmountLarge}>Scan to pay ₹{(dmData.productQuaulent * dmData.productUnitPrice).toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={styles.rightColumn}>
                        <div style={styles.infoBox}>
                          <div style={styles.infoCol}>
                            <div><strong>Client:</strong> <strong>{dmData.clientName}</strong></div>
                            <div><strong>Address:</strong> {`${dmData.address || "—"}, ${dmData.regionName}`}</div>
                            <div><strong>Phone:</strong> <strong>{dmData.clientPhoneNumber || "N/A"}</strong></div>
                          </div>
                          <div style={styles.infoCol}>
                            <div><strong>Date:</strong> {(() => {
                              try {
                                // Handle both Firestore timestamps and ISO strings
                                if (dmData.deliveryDate?.seconds) {
                                  return new Date(dmData.deliveryDate.seconds * 1000).toLocaleDateString("en-GB");
                                } else if (dmData.deliveryDate) {
                                  return new Date(dmData.deliveryDate).toLocaleDateString("en-GB");
                                }
                                return "N/A";
                              } catch (error) {
                                console.error("Date formatting error:", error);
                                return "N/A";
                              }
                            })()}</div>
                            <div><strong>Vehicle:</strong> {dmData.vehicleNumber}</div>
                            <div><strong>Driver:</strong> {dmData.driverName || "N/A"}</div>
                          </div>
                        </div>
                        <div style={styles.table}>
                          <div style={styles.tableRow}><span>📦 Product</span><span>{dmData.productName}</span></div>
                          <div style={styles.tableRow}><span>🔢 Quantity</span><span>{dmData.productQuant}</span></div>
                          <div style={styles.tableRow}><span>💰 Unit Price</span><span>₹{dmData.productUnitPrice}</span></div>
                          <div style={styles.tableRowTotal}><span>🧾 Total</span><span>₹{(dmData.productQuant * dmData.productUnitPrice).toLocaleString()}</span></div>
                          <div style={styles.tableRow}><span>💳 Payment Mode</span><span>{dmData.paymentStatus ? dmData.toAccount : dmData.paySchedule === "POD" ? "Cash" : dmData.paySchedule === "PL" ? "Credit" : dmData.paySchedule}</span></div>
                        </div>
                      </div>
                    </div>
                    <div style={styles.jurisdictionNote}>
                      Note: Subject to Chandrapur Jurisdiction
                    </div>
                    <div style={styles.footer}>
                      <div style={styles.signature}>
                        <div>Received By</div>
                        <div style={styles.line}></div>
                      </div>
                      <div style={styles.signature}>
                        <div>Authorized Signature</div>
                        <div style={styles.line}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ width: "100%", textAlign: "center", margin: "0.5mm 0" }}>
                  <hr style={{ borderTop: "1px dashed #555", margin: "0px 0" }} />
                  <div style={{ fontSize: "5px", color: "#888" }}>✂️ Cut Here</div>
                </div>
                <div style={styles.printPage}>
                  <div style={{ ...styles.ticket, backgroundColor: "#e0e0e0" }} className="ticket">
                    <img src="/watermark.png" alt="Watermark" style={styles.watermark} />
                    <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#b22222" }}>🚩 जय श्री राम 🚩</div>
                    <div style={styles.branding}>
                      <div style={styles.companyName}>LAKSHMEE INTELLIGENT TECHNOLOGIES</div>
                      <div style={styles.contactDetails}>B-24/2, M.I.D.C., CHANDRAPUR - 442406</div>
                      <div style={styles.contactDetails}>Ph: +91 8149448822 | +91 9420448822</div>
                    </div>
                    <hr style={{ borderTop: "2px solid #000", margin: "6px 0" }} />
                    <div style={styles.titleRow}>
                      <div style={styles.memoTitle}>🚚 Delivery Memo (Duplicate)</div>
                      <div style={styles.metaRight}>DM No. #{dmData.dmNumber}</div>
                    </div>
                    <div style={styles.mainContent}>
                      <div style={styles.leftColumn}>
                        <div style={styles.qrSectionLarge}>
                          <div style={styles.qrCodeLarge}>
                            <img 
                              src="/Payment QR.jpeg" 
                              alt="Payment QR Code" 
                              style={styles.qrImageLarge}
                            />
                          </div>
                          <div style={styles.qrLabelLarge}>Lakshmee Intelligent Technologies</div>
                          <div style={styles.qrAmountLarge}>Scan to pay ₹{(dmData.productQuant * dmData.productUnitPrice).toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={styles.rightColumn}>
                        <div style={styles.infoBox}>
                          <div style={styles.infoCol}>
                            <div><strong>Client:</strong> <strong>{dmData.clientName}</strong></div>
                            <div><strong>Address:</strong> {`${dmData.address || "—"}, ${dmData.regionName}`}</div>
                            <div><strong>Phone:</strong> <strong>{dmData.clientPhoneNumber || "N/A"}</strong></div>
                          </div>
                          <div style={styles.infoCol}>
                            <div><strong>Date:</strong> {(() => {
                              try {
                                // Handle both Firestore timestamps and ISO strings
                                if (dmData.deliveryDate?.seconds) {
                                  return new Date(dmData.deliveryDate.seconds * 1000).toLocaleDateString("en-GB");
                                } else if (dmData.deliveryDate) {
                                  return new Date(dmData.deliveryDate).toLocaleDateString("en-GB");
                                }
                                return "N/A";
                              } catch (error) {
                                console.error("Date formatting error:", error);
                                return "N/A";
                              }
                            })()}</div>
                            <div><strong>Vehicle:</strong> {dmData.vehicleNumber}</div>
                            <div><strong>Driver:</strong> {dmData.driverName || "N/A"}</div>
                          </div>
                        </div>
                        <div style={styles.table}>
                          <div style={styles.tableRow}><span>📦 Product</span><span>{dmData.productName}</span></div>
                          <div style={styles.tableRow}><span>🔢 Quantity</span><span>{dmData.productQuant}</span></div>
                          <div style={styles.tableRow}><span>💰 Unit Price</span><span>₹{dmData.productUnitPrice}</span></div>
                          <div style={styles.tableRowTotal}><span>🧾 Total</span><span>₹{(dmData.productQuant * dmData.productUnitPrice).toLocaleString()}</span></div>
                          <div style={styles.tableRow}><span>💳 Payment Mode</span><span>{dmData.paymentStatus ? dmData.toAccount : dmData.paySchedule === "POD" ? "Cash" : dmData.paySchedule === "PL" ? "Credit" : dmData.paySchedule}</span></div>
                        </div>
                      </div>
                    </div>
                    <div style={styles.jurisdictionNote}>
                      Note: Subject to Chandrapur Jurisdiction
                    </div>
                    <div style={styles.footer}>
                      <div style={styles.signature}>
                        <div>Received By</div>
                        <div style={styles.line}></div>
                      </div>
                      <div style={styles.signature}>
                        <div>Authorized Signature</div>
                        <div style={styles.line}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </>
  );
});

const styles = {
  page: {
    width: "210mm",
    height: "297mm",
    backgroundColor: "white",
    color: "black",
    fontFamily: "'Inter', sans-serif",
    printColorAdjust: "exact",
    overflow: "hidden",
    margin: "auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1)",
    borderRadius: "2px",
    position: "relative",
    padding: "5mm"
  },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "190mm",
    margin: "auto",
    gap: "1mm",
    height: "277mm",
    padding: "0mm"
  },
  ticket: {
    width: "200mm",
    maxWidth: "200mm",
    height: "138mm",
    padding: "4mm 5mm",
    border: "1px solid black",
    boxSizing: "border-box",
    fontSize: "11px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1px",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    zIndex: 1,
    backgroundColor: "#fff",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "500px",
    opacity: 0.1,
    zIndex: 0,
    pointerEvents: "none",
    userSelect: "none"
  },
  branding: {
    textAlign: "center",
    lineHeight: "1.4",
    backgroundColor: "#f1f1f1",
    padding: "6px 0",
    border: "1px solid #bbb",
    borderRadius: "4px"
  },
  companyName: {
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "0.8px",
    color: "#000"
  },
  contactDetails: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333"
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "2px"
  },
  memoTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#000"
  },
  metaRight: {
    fontSize: "15px",
    fontWeight: "600"
  },
  infoBox: {
    display: "flex",
    justifyContent: "space-between",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "4px 6px",
    gap: "6px",
    backgroundColor: "#fafafa"
  },
  infoCol: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    fontSize: "14px"
  },
  table: {
    border: "1px solid black",
    padding: "3px 4px",
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    backgroundColor: "#fff",
    borderRadius: "4px"
  },
  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px dashed #ccc",
    paddingBottom: "1px",
    paddingTop: "2px",
    fontSize: "14px"
  },
  tableRowTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
    borderTop: "1px solid #000",
    paddingTop: "3px",
    marginTop: "2px",
    fontSize: "15px"
  },
  jurisdictionNote: {
    fontSize: "14px",
    textAlign: "center",
    marginTop: "3px",
    color: "#444",
    fontStyle: "italic",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "2px",
    gap: "4px"
  },
  signature: {
    flex: 1,
    fontSize: "13px",
    textAlign: "center",
    lineHeight: "1.2"
  },
  line: {
    marginTop: "2px",
    borderTop: "1px solid black",
    width: "100%"
  },
  qrSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "4px",
    padding: "4px 0",
    borderTop: "1px solid #ccc"
  },
  qrCode: {
    width: "60px",
    height: "60px",
    border: "2px solid #000",
    backgroundColor: "#f8f8f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#666"
  },
  qrText: {
    fontSize: "12px",
    color: "#666"
  },
  qrLabel: {
    fontSize: "9px",
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginTop: "2px"
  },
  qrInfo: {
    alignItems: "flex-end"
  },
  qrAmount: {
    fontSize: "10px",
    fontWeight: "bold",
    color: "#1f2937"
  },
  mainContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginTop: "2px"
  },
  leftColumn: {
    flex: "0 0 190px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  rightColumn: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  qrSectionLarge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px"
  },
  qrCodeLarge: {
    width: "180px",
    height: "180px",
    border: "3px solid #000",
    backgroundColor: "#f8f8f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    color: "#666"
  },
  qrTextLarge: {
    fontSize: "22px",
    color: "#666"
  },
  qrImageLarge: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    border: "none"
  },
  qrLabelLarge: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#000",
    textAlign: "center"
  },
  qrAmountLarge: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    lineHeight: "1.2"
  },
  printPage: {
    pageBreakAfter: "avoid"
  }
};

export default PrintDM;
