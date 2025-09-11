import React from 'react';
import { LedgerService } from '../../../services/ledgerService';
import { Badge } from '../../../components/ui';

const LedgerTable = ({ entries, viewMode, entityType }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">📊</div>
        <div className="text-gray-500">No ledger entries found</div>
      </div>
    );
  }

  const formatAmount = (amount) => {
    const formatted = LedgerService.formatMoney(amount);
    return `₹${formatted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEntryTypeBadge = (type) => {
    const variants = {
      opening: { variant: 'primary', text: 'Opening' },
      credit: { variant: 'success', text: 'Credit' },
      debit: { variant: 'danger', text: 'Debit' }
    };
    
    const config = variants[type] || variants.credit;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    );
  };

  const getAmountClass = (amount) => {
    if (amount > 0) return 'positive';
    if (amount < 0) return 'negative';
    return 'neutral';
  };

  const isCompact = viewMode === 'compact';

  return (
    <div className="overflow-x-auto">
      <table className={`ledger-table ${isCompact ? 'compact' : ''}`}>
        <thead>
          <tr>
            <th className="w-24">Date</th>
            <th className="w-20">Type</th>
            <th className="min-w-48">Description</th>
            {entityType === 'account' && <th className="w-32">Member</th>}
            <th className="w-32 text-right">Amount</th>
            <th className="w-32 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} className="fade-in">
              <td className="text-gray-600">
                {formatDate(entry.date)}
              </td>
              
              <td>
                {getEntryTypeBadge(entry.type)}
              </td>
              
              <td className="max-w-xs">
                <div className="truncate" title={entry.description}>
                  {entry.description}
                </div>
                {entry.category && (
                  <div className="text-xs text-gray-500 mt-1">
                    {entry.category}
                  </div>
                )}
              </td>
              
              {entityType === 'account' && (
                <td className="text-gray-600">
                  {entry.member || '-'}
                </td>
              )}
              
              <td className={`text-right amount ${getAmountClass(entry.amount)}`}>
                {entry.type === 'opening' ? (
                  <span className="font-bold">{formatAmount(entry.amount)}</span>
                ) : (
                  <span className={entry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {entry.amount > 0 ? '+' : ''}{formatAmount(entry.amount)}
                  </span>
                )}
              </td>
              
              <td className="text-right running-balance">
                <span className={getAmountClass(entry.runningBalance)}>
                  {formatAmount(entry.runningBalance)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Summary Row */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="text-gray-600">
            Total Entries: <span className="font-medium">{entries.length}</span>
          </div>
          <div className="text-gray-600">
            Last Updated: <span className="font-medium">
              {new Date().toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerTable;
