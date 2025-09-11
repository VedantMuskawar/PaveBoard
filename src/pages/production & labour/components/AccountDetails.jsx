import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { EmployeeService } from '../../../services/employeeService';
import { 
  Modal, 
  Button, 
  Card,
  LoadingState,
  ConfirmationModal,
  Badge
} from '../../../components/ui';

const AccountDetails = ({ accountId, onClose, onUpdate, orgID }) => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [members, setMembers] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails();
    }
  }, [accountId]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch account details
      const accountData = await EmployeeService.getAccount(accountId);
      if (!accountData) {
        toast.error('Account not found');
        onClose();
        return;
      }
      setAccount(accountData);

      // Fetch member details
      const memberPromises = accountData.memberIds.map(memberId => 
        EmployeeService.getEmployee(memberId)
      );
      const memberResults = await Promise.all(memberPromises);
      const validMembers = memberResults.filter(member => member !== null);
      setMembers(validMembers);

    } catch (error) {
      console.error('Error fetching account details:', error);
      toast.error('Failed to fetch account details');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (member) => {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const confirmRemoveMember = async () => {
    try {
      setRemoving(true);
      await EmployeeService.removeMemberFromAccount(accountId, memberToRemove.id);
      toast.success('Member removed from account');
      await fetchAccountDetails();
      onUpdate(); // Refresh the main employee list
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const calculateCombinedBalance = () => {
    return EmployeeService.calculateCombinedBalance(members);
  };

  const calculateSplitAmounts = () => {
    const combinedBalance = calculateCombinedBalance();
    
    if (account?.splitRule.type === 'equal') {
      const amountPerMember = combinedBalance / members.length;
      return members.map(member => ({
        ...member,
        splitAmount: amountPerMember
      }));
    } else if (account?.splitRule.type === 'proportional') {
      return members.map(member => ({
        ...member,
        splitAmount: (member.currentBalance / combinedBalance) * combinedBalance
      }));
    } else if (account?.splitRule.type === 'manual') {
      return members.map(member => ({
        ...member,
        splitAmount: (account.splitRule.manualSplits[member.id] || 0) / 100 * combinedBalance
      }));
    }
    
    return members;
  };

  const handleExportStatement = () => {
    // Create CSV content
    const splitAmounts = calculateSplitAmounts();
    const csvContent = [
      ['Account Name', account?.name || ''],
      ['Account Type', account?.accountType || ''],
      ['Split Rule', account?.splitRule.type || ''],
      ['Combined Balance', `₹${EmployeeService.formatMoney(calculateCombinedBalance())}`],
      [''],
      ['Member Name', 'Labour ID', 'Current Balance', 'Split Amount', 'Split %'],
      ...splitAmounts.map(member => [
        member.name,
        member.labourID,
        `₹${EmployeeService.formatMoney(member.currentBalance)}`,
        `₹${EmployeeService.formatMoney(member.splitAmount)}`,
        account?.splitRule.type === 'manual' 
          ? `${account.splitRule.manualSplits[member.id] || 0}%`
          : account?.splitRule.type === 'proportional'
            ? `${((member.currentBalance / calculateCombinedBalance()) * 100).toFixed(2)}%`
            : `${(100 / members.length).toFixed(2)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name || 'account'}-statement.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Statement exported successfully');
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Account Details" size="xl">
        <LoadingState message="Loading account details..." />
      </Modal>
    );
  }

  if (!account) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Account Details" size="xl">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600 mb-4">Account not found</div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  const splitAmounts = calculateSplitAmounts();

  return (
    <Modal isOpen={true} onClose={onClose} title="Account Details" size="xl">
      <div className="space-y-6">
        {/* Account Header */}
        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="primary">{account.accountType}</Badge>
                <Badge variant="secondary">{account.splitRule.type} split</Badge>
                <span className="text-sm text-gray-500">
                  Created: {account.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                ₹{EmployeeService.formatMoney(account.currentBalance || calculateCombinedBalance())}
              </div>
              <div className="text-sm text-gray-500">Combined Balance</div>
              {account.currentBalance !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  (Stored: ₹{EmployeeService.formatMoney(account.currentBalance)})
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Split Rule Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Split Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <div className="mt-1 capitalize">{account.splitRule.type}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Members</label>
              <div className="mt-1">{members.length} employees</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Balance</label>
              <div className="mt-1 font-medium">
                ₹{EmployeeService.formatMoney(account.currentBalance || calculateCombinedBalance())}
              </div>
            </div>
          </div>
        </Card>

        {/* Members List */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Members</h3>
            <Button onClick={handleExportStatement} variant="outline" size="sm">
              Export Statement
            </Button>
          </div>
          
          <div className="space-y-4">
            {splitAmounts.map((member, index) => (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">ID: {member.labourID}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.employeeTags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    ₹{EmployeeService.formatMoney(member.splitAmount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {account.splitRule.type === 'manual' 
                      ? `${account.splitRule.manualSplits[member.id] || 0}%`
                      : account.splitRule.type === 'proportional'
                        ? `${((member.currentBalance / calculateCombinedBalance()) * 100).toFixed(2)}%`
                        : `${(100 / members.length).toFixed(2)}%`
                    } split
                  </div>
                  <div className="text-xs text-gray-400">
                    Balance: ₹{EmployeeService.formatMoney(member.currentBalance)}
                  </div>
                </div>
                
                <div className="ml-4">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveMember(member)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
          <div className="flex space-x-4">
            <Button onClick={handleExportStatement} variant="outline">
              Export Statement
            </Button>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </Card>
      </div>

      {/* Remove Member Confirmation Modal */}
      {showRemoveModal && memberToRemove && (
        <ConfirmationModal
          title="Remove Member"
          message={`Are you sure you want to remove ${memberToRemove.name} from this account? This action cannot be undone.`}
          onConfirm={confirmRemoveMember}
          onCancel={() => setShowRemoveModal(false)}
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
          loading={removing}
        />
      )}
    </Modal>
  );
};

export default AccountDetails;
