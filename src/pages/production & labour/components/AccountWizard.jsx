import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { EmployeeService } from '../../../services/employeeService';
import { SPLIT_RULE_TYPES } from '../../../types/employee';
import { 
  Modal, 
  Input, 
  SelectField, 
  Button, 
  Card,
  LoadingState,
  Checkbox
} from '../../../components/ui';

const AccountWizard = ({ employees, onClose, onSave, orgID, createdBy }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    memberIds: [],
    splitRule: {
      type: 'equal',
      manualSplits: {}
    }
  });
  const [errors, setErrors] = useState({});

  const totalSteps = 3;

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Account name is required';
      }
    }

    if (step === 2) {
      if (formData.memberIds.length < 2) {
        newErrors.members = 'At least 2 members are required for a combined account';
      }
    }

    if (step === 3) {
      if (formData.splitRule.type === 'manual') {
        const totalManualSplit = Object.values(formData.splitRule.manualSplits || {}).reduce((sum, val) => sum + val, 0);
        if (Math.abs(totalManualSplit - 100) > 0.01) {
          newErrors.manualSplits = 'Manual splits must total 100%';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error('Please fix the errors before proceeding');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleMemberToggle = (memberId) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId]
    }));
  };

  const handleSplitRuleChange = (type) => {
    setFormData(prev => ({
      ...prev,
      splitRule: {
        type,
        manualSplits: type === 'manual' ? {} : prev.splitRule.manualSplits
      }
    }));
  };

  const handleManualSplitChange = (memberId, value) => {
    setFormData(prev => ({
      ...prev,
      splitRule: {
        ...prev.splitRule,
        manualSplits: {
          ...prev.splitRule.manualSplits,
          [memberId]: parseFloat(value) || 0
        }
      }
    }));
  };

  const getSelectedMembers = () => {
    return employees.filter(emp => formData.memberIds.includes(emp.id));
  };

  const calculateCombinedBalance = () => {
    const selectedMembers = getSelectedMembers();
    return EmployeeService.calculateCombinedBalance(selectedMembers);
  };

  const calculateSplitAmounts = () => {
    const selectedMembers = getSelectedMembers();
    const combinedBalance = calculateCombinedBalance();
    
    if (formData.splitRule.type === 'equal') {
      const amountPerMember = combinedBalance / selectedMembers.length;
      return selectedMembers.map(member => ({
        ...member,
        splitAmount: amountPerMember
      }));
    } else if (formData.splitRule.type === 'proportional') {
      return selectedMembers.map(member => ({
        ...member,
        splitAmount: (member.currentBalance / combinedBalance) * combinedBalance
      }));
    } else if (formData.splitRule.type === 'manual') {
      return selectedMembers.map(member => ({
        ...member,
        splitAmount: (formData.splitRule.manualSplits[member.id] || 0) / 100 * combinedBalance
      }));
    }
    
    return selectedMembers;
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      await EmployeeService.createAccountWithMembers(formData, orgID, createdBy);
      toast.success('Combined account created successfully');
      onSave();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#f3f3f3] mb-2">Account Information</h3>
        <p className="text-[#9ba3ae]">Enter the name for the combined account</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#f3f3f3] mb-2">
          Account Name *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter account name (e.g., 'Production Team', 'Drivers Group')"
          error={errors.name}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#f3f3f3] mb-2">Select Members</h3>
        <p className="text-[#9ba3ae]">Choose employees to include in this combined account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {employees.map(employee => (
          <Card key={employee.id} className="p-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={formData.memberIds.includes(employee.id)}
                onChange={() => handleMemberToggle(employee.id)}
              />
              <div className="flex-1">
                <div className="font-medium text-[#f3f3f3]">{employee.name}</div>
                <div className="text-sm text-[#9ba3ae]">ID: {employee.labourID}</div>
                <div className="text-sm text-[#9ba3ae]">
                  Balance: ₹{EmployeeService.formatMoney(employee.currentBalance)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {employee.employeeTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-[rgba(255,255,255,0.1)] text-[#8e8e93] text-xs rounded border border-[rgba(255,255,255,0.1)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {errors.members && (
        <p className="text-sm text-red-600">{errors.members}</p>
      )}

      {formData.memberIds.length > 0 && (
        <Card className="p-4 bg-[rgba(10,132,255,0.1)] border border-[rgba(10,132,255,0.2)]">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#0A84FF]">
              Selected Members: {formData.memberIds.length}
            </span>
            <span className="font-bold text-[#0A84FF]">
              Combined Balance: ₹{EmployeeService.formatMoney(calculateCombinedBalance())}
            </span>
          </div>
        </Card>
      )}
    </div>
  );

  const renderStep3 = () => {
    const selectedMembers = getSelectedMembers();
    const splitAmounts = calculateSplitAmounts();

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-[#f3f3f3] mb-2">Split Rule</h3>
          <p className="text-[#9ba3ae]">Choose how to split the combined balance among members</p>
        </div>

        <div className="space-y-4">
          {SPLIT_RULE_TYPES.map(type => (
            <label key={type} className="flex items-center">
              <input
                type="radio"
                name="splitRule"
                value={type}
                checked={formData.splitRule.type === type}
                onChange={() => handleSplitRuleChange(type)}
                className="h-4 w-4 text-[#0A84FF] focus:ring-[#0A84FF] border-[rgba(255,255,255,0.2)] bg-[#1f1f1f]"
              />
              <span className="ml-3 text-sm font-medium text-[#f3f3f3] capitalize">
                {type === 'equal' && 'Equal Split - Divide equally among all members'}
                {type === 'proportional' && 'Proportional Split - Split based on individual balances'}
                {type === 'manual' && 'Manual Split - Set custom percentages for each member'}
              </span>
            </label>
          ))}
        </div>

        {formData.splitRule.type === 'manual' && (
          <div className="space-y-4">
            <h4 className="font-medium text-[#f3f3f3]">Manual Split Percentages</h4>
            {selectedMembers.map(member => (
              <div key={member.id} className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#f3f3f3]">
                    {member.name}
                  </label>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.splitRule.manualSplits[member.id] || 0}
                    onChange={(e) => handleManualSplitChange(member.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
                <span className="text-sm text-[#9ba3ae]">%</span>
              </div>
            ))}
            {errors.manualSplits && (
              <p className="text-sm text-red-400">{errors.manualSplits}</p>
            )}
          </div>
        )}

        <Card className="p-4 bg-[rgba(50,215,75,0.1)] border border-[rgba(50,215,75,0.2)]">
          <h4 className="font-medium text-[#32D74B] mb-3">Split Preview</h4>
          <div className="space-y-2">
            {splitAmounts.map(member => (
              <div key={member.id} className="flex justify-between items-center">
                <span className="text-sm text-[#32D74B]">{member.name}</span>
                <span className="font-medium text-[#32D74B]">
                  ₹{EmployeeService.formatMoney(member.splitAmount)}
                </span>
              </div>
            ))}
            <div className="border-t border-[rgba(50,215,75,0.2)] pt-2 mt-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#32D74B]">Total</span>
                <span className="text-[#32D74B]">
                  ₹{EmployeeService.formatMoney(calculateCombinedBalance())}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {isCompleted ? '✓' : stepNumber}
              </div>
              {stepNumber < totalSteps && (
                <div className={`w-16 h-1 mx-2 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Combined Account"
      size="xl"
    >
      <div className="space-y-6">
        {renderProgressBar()}

        <div className="min-h-96">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onClose : handlePrevious}
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>
          
          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={loading}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AccountWizard;
