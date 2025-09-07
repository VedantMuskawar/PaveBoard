import React, { useEffect, useState, Suspense, lazy } from "react";
import { db } from "../../config/firebase";
import { useOrganization } from "../../contexts/OrganizationContext";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
// Temporary fallback for charts due to React compatibility issues
const ChartFallback = ({ data, title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700/30 rounded-lg p-4">
    <div className="text-2xl mb-2">📊</div>
    <div className="text-sm font-medium mb-2">{title}</div>
    <div className="text-xs text-gray-400 text-center">
      {data.map((item, index) => (
        <div key={index} className="flex justify-between items-center mb-1">
          <span>{item.name}:</span>
          <span>₹{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  </div>
);

// Import reusable UI components
import { 
  DieselPage,
  PageHeader,
  Card,
  DataTable,
  LoadingState,
  SkeletonLoader,
  DatePicker,
  StatsCard,
  Divider,
  ExportButton,
  SectionCard,
  EmptyState
} from "../../components/ui";

// Import CSS
import "./IncomeLedger.css";

const IncomeLedger = ({ onBack }) => {
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [orderIncomes, setOrderIncomes] = useState([]);
  const [paymentIncomes, setPaymentIncomes] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [deliveryMemos, setDeliveryMemos] = useState([]);
  const [loading, setLoading] = useState(true);


  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  // Loading state for organization
  if (!selectedOrg) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading organization data..." 
          icon="🏢"
        />
      </DieselPage>
    );
  }


  const pieColors = [
    "#00c3ff",
    "#ff7f50",
    "#90ee90",
    "#ffa500",
    "#9370db",
    "#f08080",
    "#20b2aa",
    "#778899",
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      const orderQuery = query(
        collection(db, "SCH_ORDERS"),
        where("deliveryDate", ">=", Timestamp.fromDate(start)),
        where("deliveryDate", "<=", Timestamp.fromDate(end))
      );

      const transactionQuery = query(
        collection(db, "TRANSACTIONS"),
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end))
      );

      const memoQuery = query(
        collection(db, "DELIVERY_MEMOS"),
        where("deliveryDate", ">=", Timestamp.fromDate(start)),
        where("deliveryDate", "<=", Timestamp.fromDate(end))
      );

      const [orderSnap, transactionSnap, memoSnap] = await Promise.all([
        getDocs(orderQuery),
        getDocs(transactionQuery),
        getDocs(memoQuery),
      ]);

      console.log("Read SCH_ORDERS:", orderSnap.size, "docs");
      console.log("Read TRANSACTIONS:", transactionSnap.size, "docs");
      console.log("Read DELIVERY_MEMOS:", memoSnap.size, "docs");

      const memos = memoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDeliveryMemos(memos);

      // Create a map of orderID -> dmNumber
      const dmMap = {};
      memos.forEach((memo) => {
        if (memo.orderID) {
          dmMap[memo.orderID] = memo.dmNumber || "-";
        }
      });

      const orderData = orderSnap.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() };
        data.dmNumber = dmMap[data.id] || "-";
        return data;
      });
      const paymentData = transactionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setOrderIncomes(orderData);
      setPaymentIncomes(paymentData);

      // Totals
      const orderSum = orderData.reduce((acc, order) => {
        const qty = Number(order.productQuant || order.quantity || 0);
        const price = Number(order.productUnitPrice || order.rate || 0);
        return acc + qty * price;
      }, 0);
      const paymentSum = paymentData.reduce((acc, txn) => acc + Number(txn.amount || 0), 0);

      setOrderTotal(orderSum);
      setPaymentTotal(paymentSum);
      setLoading(false);
    };

    fetchData();
  }, [selectedDate]);

  // Prepare data for pie chart
  const paymentModeData = Object.entries(
    orderIncomes.reduce((acc, curr) => {
      const mode = curr.toAccount || "Unspecified";
      const qty = Number(curr.productQuant || curr.quantity || 0);
      const price = Number(curr.productUnitPrice || curr.rate || 0);
      const total = qty * price;
      acc[mode] = (acc[mode] || 0) + total;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));


  return (
    <DieselPage>
      {/* Header */}
      <PageHeader 
        title=""
        onBack={handleBack}
        role={isAdmin ? "admin" : "manager"}
      />

      {/* Main content container with consistent spacing */}
      <div className="w-full" style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="max-w-7xl mx-auto">
          {/* Unified Card Container */}
          <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
            {/* Date Picker */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl"></span>
              <h2 className="text-xl font-bold text-white"></h2>
            </div>
            
            <div className="mb-6">
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                label="Select Date"
                size="lg"
                className="max-w-md"
              />
            </div>

            {/* Loading State */}
            {loading ? (
              <LoadingState 
                variant="inline" 
                message="Loading income data..." 
                icon="📊"
              />
            ) : (
              <>
                {/* Totals Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatsCard
                    icon="🧾"
                    title="Order Total"
                    value={`₹${orderTotal.toLocaleString()}`}
                    variant="primary"
                  />
                  <StatsCard
                    icon="💸"
                    title="Payment Total"
                    value={`₹${paymentTotal.toLocaleString()}`}
                    variant="success"
                  />
                  <StatsCard
                    icon="📊"
                    title="Net Cash Income"
                    value={`₹${(orderTotal - paymentTotal).toLocaleString()}`}
                    variant={orderTotal - paymentTotal >= 0 ? "success" : "danger"}
                  />
                </div>

            <Divider className="my-6" />
            
            {/* Order Payment Modes Distribution */}
            <SectionCard
              title="Payment Modes Distribution"
              icon="📊"
              itemCount={paymentModeData.length}
              variant="primary"
            >
              <div className="col-span-2">
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-200 mb-4">Payment Breakdown</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {paymentModeData.length > 0 ? (
                        paymentModeData.map(({ name, value }) => (
                          <div key={name} className="flex justify-between items-center p-2 bg-gray-700/30 rounded-lg">
                            <span className="text-gray-300">{name}</span>
                            <span className="font-semibold text-blue-300">₹{value.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon="📊"
                          title="No payment data available"
                          subtitle="Select a different date to view payment distribution"
                          compact={true}
                        />
                      )}
                    </div>
                  </div>
                  <div className="w-64 h-64">
                    {paymentModeData.length > 0 ? (
                      <ChartFallback data={paymentModeData} title="Payment Methods" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700/30 rounded-lg">
                        <EmptyState
                          icon="📊"
                          title="No chart data"
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <Divider className="my-6" />
            
            {/* Order Incomes Table */}
            <SectionCard
              title="Order Incomes"
              icon="🧾"
              itemCount={orderIncomes.length}
              variant="success"
            >
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-200">Order Details</h4>
                  <ExportButton
                    onClick={() => {
                      // TODO: Implement export functionality
                      console.log('Exporting order incomes...');
                    }}
                    exportType="excel"
                    size="sm"
                  >
                    Export Orders
                  </ExportButton>
                </div>
                {loading ? (
                  <SkeletonLoader rows={3} />
                ) : orderIncomes.length > 0 ? (
                  <DataTable
                    columns={[
                      { header: "Client", key: "clientName" },
                      { header: "DM No.", key: "dmNumber" },
                      { header: "Mode of Payment", key: "toAccount" },
                      { header: "Quantity", key: "quantity" },
                      { header: "Rate", key: "rate" },
                      { header: "Total", key: "total" }
                    ]}
                    data={orderIncomes.map(order => {
                      const qty = Number(order.productQuant || order.quantity || 0);
                      const price = Number(order.productUnitPrice || order.rate || 0);
                      const total = qty * price;
                      return {
                        ...order,
                        clientName: order.clientName || "N/A",
                        dmNumber: order.dmNumber,
                        toAccount: order.toAccount || "-",
                        quantity: qty,
                        rate: price,
                        total: total.toLocaleString()
                      };
                    })}
                    showSummary={true}
                    summaryData={{
                      label: "Total",
                      value: `₹${orderTotal.toLocaleString()}`
                    }}
                  />
                ) : (
                  <EmptyState
                    icon="🧾"
                    title="No order incomes found"
                    subtitle={`No orders were found for ${new Date(selectedDate).toLocaleDateString()}`}
                  />
                )}
              </div>
            </SectionCard>

            <Divider className="my-6" />
            
            {/* Payment Incomes Table */}
            <SectionCard
              title="Payment Incomes"
              icon="💸"
              itemCount={paymentIncomes.length}
              variant="warning"
            >
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-200">Payment Details</h4>
                  <ExportButton
                    onClick={() => {
                      // TODO: Implement export functionality
                      console.log('Exporting payment incomes...');
                    }}
                    exportType="excel"
                    size="sm"
                  >
                    Export Payments
                  </ExportButton>
                </div>
                {loading ? (
                  <SkeletonLoader rows={3} />
                ) : paymentIncomes.length > 0 ? (
                  <DataTable
                    columns={[
                      { header: "Client", key: "clientName" },
                      { header: "Amount", key: "amount" },
                      { header: "Mode of Payment", key: "toAccount" }
                    ]}
                    data={paymentIncomes.map(txn => ({
                      ...txn,
                      clientName: txn.clientName || "N/A",
                      amount: txn.amount || "-",
                      toAccount: txn.toAccount || "-"
                    }))}
                    showSummary={true}
                    summaryData={{
                      label: "Total",
                      value: `₹${paymentTotal.toLocaleString()}`
                    }}
                  />
                ) : (
                  <EmptyState
                    icon="💸"
                    title="No payment incomes found"
                    subtitle={`No payments were found for ${new Date(selectedDate).toLocaleDateString()}`}
                  />
                )}
              </div>
            </SectionCard>
              </>
            )}
          </Card>
        </div>
      </div>
    </DieselPage>
  );
};

export default IncomeLedger;