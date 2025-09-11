import React from 'react';
import { Input, SelectField, Button } from '../../../components/ui';
import { WAGE_CATEGORIES } from '../../../types/ledger';

const LedgerFilters = ({ filters, onFilterChange, entityType }) => {
  const handleInputChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      dateFrom: '',
      dateTo: '',
      category: '',
      type: 'all'
    });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.category || filters.type !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date From */}
      <div className="filter-group">
        <label className="filter-label">From Date</label>
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => handleInputChange('dateFrom', e.target.value)}
          className="w-40"
        />
      </div>

      {/* Date To */}
      <div className="filter-group">
        <label className="filter-label">To Date</label>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => handleInputChange('dateTo', e.target.value)}
          className="w-40"
        />
      </div>

      {/* Category Filter */}
      <div className="filter-group">
        <label className="filter-label">Category</label>
        <SelectField
          value={filters.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className="w-32"
        >
          <option value="">All Categories</option>
          {WAGE_CATEGORIES.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </SelectField>
      </div>

      {/* Type Filter */}
      <div className="filter-group">
        <label className="filter-label">Type</label>
        <SelectField
          value={filters.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          className="w-32"
        >
          <option value="all">All Types</option>
          <option value="credits">Credits Only</option>
          <option value="debits">Debits Only</option>
        </SelectField>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          onClick={handleClearFilters}
          variant="outline"
          size="sm"
          className="mt-6"
        >
          Clear Filters
        </Button>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.dateFrom && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              From: {new Date(filters.dateFrom).toLocaleDateString()}
            </span>
          )}
          {filters.dateTo && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              To: {new Date(filters.dateTo).toLocaleDateString()}
            </span>
          )}
          {filters.category && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {filters.category}
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              {filters.type}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default LedgerFilters;
