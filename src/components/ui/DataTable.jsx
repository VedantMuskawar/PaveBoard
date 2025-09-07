import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = "No data available",
  onRowClick,
  stickyHeader = true,
  className = "",
  rowClassName = "",
  headerClassName = "",
  cellClassName = "",
  showSummary = false,
  summaryData = null
}) => {
  // Exact Diesel Ledger styling constants
  const styles = {
    tableContainer: {
      background: "transparent",
      padding: "1rem",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.30)",
      overflowX: "auto",
      marginTop: "1rem",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
    th: {
      padding: "12px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
      fontWeight: 700,
      color: "#E5E7EB",
      fontSize: "0.98rem",
      background: "transparent"
    },
    td: {
      padding: "12px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
      color: "#EDEEF0",
      fontSize: "0.95rem"
    },
    tableRow: {
      background: "rgba(28,28,30,0.42)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      transition: "background-color 160ms ease, transform 120ms ease",
      cursor: "pointer",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)"
    },
    tableRowHover: {
      backgroundColor: "rgba(255,255,255,0.04)"
    },
    summaryCard: {
      fontWeight: "bold",
      color: "#00ffcc",
      fontSize: "1.15rem",
      marginBottom: "0.6rem",
      letterSpacing: "0.5px"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse"
    },
    thead: {
      background: "#1f1f1f"
    }
  };

  if (loading) {
    return (
      <div style={styles.tableContainer}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "3rem",
          color: "#f5f5f7",
          fontSize: "1.2rem",
          fontWeight: 600,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "#8e8e93" }}>Loading data...</div>
          <div style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Please wait while we fetch your information
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      {/* Summary Card */}
      {showSummary && summaryData && (
        <div style={styles.summaryCard}>
          {summaryData.label}: {summaryData.value}
        </div>
      )}
      
      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index}
                style={styles.th}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "3rem", color: "#666" }}>📊</div>
                  <p style={{ color: "#9ba3ae", fontWeight: 600, fontSize: "1.1rem" }}>{emptyMessage}</p>
                  <p style={{ color: "#666", fontSize: "0.9rem" }}>No data available to display</p>
                </div>
              </td>
            </tr>
          )}
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={styles.tableRow}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
              onClick={() => onRowClick && onRowClick(row, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td 
                  key={colIndex}
                  style={styles.td}
                >
                  {column.render ? column.render(row, rowIndex) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
