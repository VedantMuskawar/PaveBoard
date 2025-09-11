import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

/**
 * Custom hook for handling Excel export functionality
 * Manages export state and provides export functions
 */
export const useExport = () => {
  const [exporting, setExporting] = useState(false);

  // Format date for display
  const formatDate = useCallback((date) => {
    if (!date) return "N/A";
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  }, []);

  // Format currency for display
  const formatINR = useCallback((amount) => {
    if (!amount || isNaN(amount)) return "₹0";
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }, []);

  // Validate DM range
  const validateDMRange = useCallback((dmFrom, dmTo) => {
    if (!dmFrom || !dmTo) return true;
    const from = parseInt(dmFrom);
    const to = parseInt(dmTo);
    return !isNaN(from) && !isNaN(to) && from <= to;
  }, []);

  // Export orders to Excel
  const exportOrdersToExcel = useCallback(async (orgID, filters, dmFilter, sortOrder) => {
    const { dmFrom, dmTo } = filters;
    
    setExporting(true);
    
    try {
      // Validate inputs
      if (!dmFrom || !dmTo) {
        toast.warning("Please specify DM range (From and To) to export orders.");
        return false;
      }

      if (!validateDMRange(dmFrom, dmTo)) {
        toast.error("Invalid DM range. Please check your From and To values.");
        return false;
      }

      const fromNum = parseInt(dmFrom);
      const toNum = parseInt(dmTo);
      
      if (isNaN(fromNum) || isNaN(toNum)) {
        toast.error("DM numbers must be valid integers.");
        return false;
      }

      // Check for reasonable range to prevent memory issues
      if (toNum - fromNum > 10000) {
        toast.error("DM range too large. Please limit to 10,000 orders or less.");
        return false;
      }

      // Fetch data within the DM range from Firestore with limit
      const exportQuery = query(
        collection(db, "DELIVERY_MEMOS"),
        where("orgID", "==", orgID),
        where("dmNumber", ">=", fromNum),
        where("dmNumber", "<=", toNum),
        limit(10000) // Safety limit to prevent memory issues
      );

      // Get all matching documents
      const exportSnapshot = await getDocs(exportQuery);
      const allExportData = exportSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || (doc.data().dmNumber === "Cancelled" ? "cancelled" : "active")
      }));

      if (allExportData.length === 0) {
        toast.warning("No orders found for the specified DM range. Please check your DM range.");
        return false;
      }

      // Show progress toast
      toast(`Found ${allExportData.length} orders in DM range ${dmFrom}-${dmTo}. Processing for export...`);

      // Apply text search filter in memory (for performance)
      let finalExportData = allExportData;
      if (dmFilter) {
        finalExportData = finalExportData.filter(order => 
          order.dmNumber?.toString().includes(dmFilter) ||
          order.clientName?.toLowerCase().includes(dmFilter.toLowerCase())
        );
      }

      if (finalExportData.length === 0) {
        toast.warning("No orders match the search filter. Please check your search terms.");
        return false;
      }

      // Sort data if needed
      if (sortOrder === "asc") {
        finalExportData.sort((a, b) => (a.dmNumber || 0) - (b.dmNumber || 0));
      } else {
        finalExportData.sort((a, b) => (b.dmNumber || 0) - (a.dmNumber || 0));
      }

      // Prepare data for export
      const excelData = finalExportData.map(order => ({
        'DM Number': order.dmNumber || '-',
        'Client Name': order.clientName || '-',
        'Product Name': order.productName || '-',
        'Quantity': order.productQuant || 0,
        'Unit Price': order.productUnitPrice || 0,
        'Total Amount': (order.productQuant || 0) * (order.productUnitPrice || 0),
        'Delivery Date': formatDate(order.deliveryDate),
        'Location/Region': order.regionName || '-',
        'Vehicle Number': order.vehicleNumber || '-',
        'Client Phone': order.clientPhoneNumber || '-',
        'Payment Schedule': order.paySchedule || '-',
        'Status': order.status || '-',
        'Payment Status': order.paymentStatus ? 'Paid' : 'Unpaid',
        'Created Date': order.createdAt ? formatDate(order.createdAt) : '-',
        'Updated Date': order.updatedAt ? formatDate(order.updatedAt) : '-'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = [
        { wch: 12 }, // DM Number
        { wch: 25 }, // Client Name
        { wch: 20 }, // Product Name
        { wch: 12 }, // Quantity
        { wch: 15 }, // Unit Price
        { wch: 15 }, // Total Amount
        { wch: 15 }, // Delivery Date
        { wch: 20 }, // Location/Region
        { wch: 15 }, // Vehicle Number
        { wch: 15 }, // Client Phone
        { wch: 20 }, // Payment Schedule
        { wch: 12 }, // Status
        { wch: 12 }, // Payment Status
        { wch: 15 }, // Created Date
        { wch: 15 }  // Updated Date
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      // Generate filename with DM range
      let filename = "Orders_Export";
      if (dmFrom && dmTo) {
        filename += `_DM${dmFrom}_to_DM${dmTo}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Exported ${finalExportData.length} orders to Excel successfully!`);
      return true;
      
    } catch (error) {
      toast.error('Failed to export orders to Excel. Please try again.');
      return false;
    } finally {
      setExporting(false);
    }
  }, [formatDate, formatINR, validateDMRange]);

  return {
    exporting,
    exportOrdersToExcel
  };
};
