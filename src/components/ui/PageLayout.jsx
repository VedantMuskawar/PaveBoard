import React from 'react';
import { DieselPage, PageHeader, FilterBar, SummaryCard } from './index';

/**
 * PageLayout Component
 * 
 * A standardized page layout component that enforces Diesel Ledger UI guidelines.
 * Provides consistent structure, spacing, and styling across all pages.
 * 
 * Features:
 * - Enforces Diesel Ledger design system
 * - Consistent spacing and layout
 * - Responsive design
 * - Accessibility compliance
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {Function} props.onBack - Back navigation handler
 * @param {string} props.role - User role (admin/manager/member)
 * @param {string} props.roleDisplay - Display text for role
 * @param {React.ReactNode} props.headerActions - Actions to display in header
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {Array} props.summaryData - Array of summary card data
 * @param {React.ReactNode} props.children - Main page content
 * @param {string} props.className - Additional CSS classes
 */
const PageLayout = ({
  title,
  onBack,
  role,
  roleDisplay,
  headerActions,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  summaryData = [],
  children,
  className = ""
}) => {
  return (
    <DieselPage className={className}>
      {/* Page Header */}
      <PageHeader
        title={title}
        onBack={onBack}
        role={role}
        roleDisplay={roleDisplay}
      >
        {headerActions}
      </PageHeader>

      {/* Filter Bar */}
      {(searchValue !== undefined || onSearchChange) && (
        <FilterBar style={{ justifyContent: "center" }}>
          <FilterBar.Search
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
            style={{ width: "300px" }}
          />
        </FilterBar>
      )}

      {/* Summary Cards */}
      {summaryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {summaryData.map((summary, index) => (
            <SummaryCard
              key={index}
              title={summary.title}
              value={summary.value}
              valueColor={summary.valueColor}
              icon={summary.icon}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="w-full">
        {children}
      </div>
    </DieselPage>
  );
};

export default PageLayout;
