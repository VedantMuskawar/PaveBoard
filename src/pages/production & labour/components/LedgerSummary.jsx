import React, { useState } from 'react';
import { LedgerService } from '../../../services/ledgerService';
import { Card, Badge } from '../../../components/ui';

const LedgerSummary = ({ summary, entityType, showMemberBreakdown }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatAmount = (amount) => {
    const formatted = LedgerService.formatMoney(amount);
    return `₹${formatted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBalanceIcon = (balance) => {
    if (balance > 0) return '📈';
    if (balance < 0) return '📉';
    return '➖';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Opening Balance */}
      <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Opening Balance</h3>
          <span className="text-2xl">💰</span>
        </div>
        <div className="text-3xl font-bold font-mono">
          {formatAmount(summary.openingBalance)}
        </div>
        <div className="text-blue-100 text-sm mt-1">
          Initial balance
        </div>
      </Card>

      {/* Total Credits */}
      <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Total Credits</h3>
          <span className="text-2xl">⬆️</span>
        </div>
        <div className="text-3xl font-bold font-mono">
          {formatAmount(summary.totalCredits)}
        </div>
        <div className="text-green-100 text-sm mt-1">
          Wages & earnings
        </div>
      </Card>

      {/* Total Debits */}
      <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Total Debits</h3>
          <span className="text-2xl">⬇️</span>
        </div>
        <div className="text-3xl font-bold font-mono">
          {formatAmount(summary.totalDebits)}
        </div>
        <div className="text-red-100 text-sm mt-1">
          Payments made
        </div>
      </Card>

      {/* Closing Balance */}
      <Card className={`p-6 bg-gradient-to-br ${
        summary.closingBalance > 0 
          ? 'from-emerald-500 to-emerald-600' 
          : summary.closingBalance < 0 
            ? 'from-orange-500 to-orange-600'
            : 'from-gray-500 to-gray-600'
      } text-white`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Closing Balance</h3>
          <span className="text-2xl">{getBalanceIcon(summary.closingBalance)}</span>
        </div>
        <div className="text-3xl font-bold font-mono">
          {formatAmount(summary.closingBalance)}
        </div>
        <div className="text-white text-sm mt-1 opacity-90">
          Current balance
        </div>
      </Card>

      {/* Member Breakdown for Accounts */}
      {entityType === 'account' && summary.memberBreakdown && summary.memberBreakdown.length > 0 && (
        <div className="col-span-full">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Member Breakdown
              </h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span className="text-sm font-medium">
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </span>
                <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.memberBreakdown.map((member) => (
                    <div key={member.employeeId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{member.employeeName}</h4>
                          <div className="text-xs text-gray-500">Employee</div>
                        </div>
                        <Badge variant="secondary">Member</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Opening:</span>
                          <span className="font-mono">{formatAmount(member.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Credits:</span>
                          <span className="font-mono text-green-600">
                            +{formatAmount(member.totalCredits)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Debits:</span>
                          <span className="font-mono text-red-600">
                            -{formatAmount(member.totalDebits)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-700">Balance:</span>
                            <span className={`font-mono ${getBalanceColor(member.closingBalance)}`}>
                              {formatAmount(member.closingBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {summary.memberBreakdown.length}
                      </div>
                      <div className="text-sm text-blue-800">Members</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatAmount(summary.memberBreakdown.reduce((sum, m) => sum + m.totalCredits, 0))}
                      </div>
                      <div className="text-sm text-green-800">Total Credits</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatAmount(summary.memberBreakdown.reduce((sum, m) => sum + m.totalDebits, 0))}
                      </div>
                      <div className="text-sm text-red-800">Total Debits</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${getBalanceColor(summary.closingBalance)}`}>
                        {formatAmount(summary.closingBalance)}
                      </div>
                      <div className="text-sm text-gray-700">Combined Balance</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default LedgerSummary;
