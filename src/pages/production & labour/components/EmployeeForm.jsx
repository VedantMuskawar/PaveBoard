import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { EmployeeService } from '../../../services/employeeService';
import { EMPLOYEE_TAGS, SALARY_TAGS } from '../../../types/employee';
import { 
  Modal, 
  Input, 
  SelectField, 
  Button, 
  Card,
  LoadingState
} from '../../../components/ui';

const EmployeeForm = ({ employee, onClose, onSave, orgID, createdBy }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    labourID: '',
    employeeTags: [],
    salaryTags: ['fixed'],
    salaryValue: 0,
    bonusEligible: false,
    openingBalance: 0,
    isActive: true,
    dateJoined: new Date().toISOString().split('T')[0]
  });
  const [isGeneratingID, setIsGeneratingID] = useState(false);
  const [errors, setErrors] = useState({});
  const [labourIDValidating, setLabourIDValidating] = useState(false);

  // Generate unique Labour ID
  const generateLabourID = async () => {
    setIsGeneratingID(true);
    try {
      let attempts = 0;
      let newID = '';
      
      do {
        // Generate ID with format: EMP + 4-digit random number
        const randomNum = Math.floor(Math.random() * 9000) + 1000;
        newID = `EMP${randomNum}`;
        attempts++;
        
        if (attempts > 10) {
          // Fallback to timestamp-based ID
          newID = `EMP${Date.now().toString().slice(-6)}`;
          break;
        }
        
        // Small delay to avoid rapid-fire requests
        if (attempts > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (!(await EmployeeService.validateLabourID(orgID, newID)));
      
      setFormData(prev => ({ ...prev, labourID: newID }));
      
      // Clear any existing labourID error
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.labourID;
        return newErrors;
      });
      
    } catch (error) {
      console.error('Error generating Labour ID:', error);
      toast.error('Failed to generate Labour ID');
    } finally {
      setIsGeneratingID(false);
    }
  };

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        labourID: employee.labourID || '',
        employeeTags: employee.employeeTags || [],
        salaryTags: employee.salaryTags || ['fixed'],
        salaryValue: EmployeeService.formatMoney(employee.salaryValue || 0),
        bonusEligible: employee.bonusEligible || false,
        openingBalance: EmployeeService.formatMoney(employee.openingBalance || 0),
        isActive: employee.isActive !== undefined ? employee.isActive : true,
        dateJoined: employee.dateJoined ? employee.dateJoined.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    } else {
      // Auto-generate Labour ID for new employees
      generateLabourID();
    }
  }, [employee]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.labourID.trim()) {
      newErrors.labourID = 'Labour ID is required';
    }

    if (formData.employeeTags.length === 0) {
      newErrors.employeeTags = 'At least one employee tag is required';
    }

    if (formData.salaryTags.length === 0) {
      newErrors.salaryTags = 'At least one salary tag is required';
    }

    if (formData.salaryValue < 0) {
      newErrors.salaryValue = 'Salary value cannot be negative';
    }

    // Opening balance can be negative (debt/advance)

    if (!formData.dateJoined) {
      newErrors.dateJoined = 'Date joined is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLabourID = async (labourID) => {
    if (!labourID.trim()) return true;
    
    setLabourIDValidating(true);
    try {
      const isValid = await EmployeeService.validateLabourID(orgID, labourID, employee?.id);
      if (!isValid) {
        setErrors(prev => ({ ...prev, labourID: 'Labour ID already exists' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.labourID;
          return newErrors;
        });
      }
      return isValid;
    } catch (error) {
      console.error('Error validating labour ID:', error);
      setErrors(prev => ({ ...prev, labourID: 'Error validating labour ID' }));
      return false;
    } finally {
      setLabourIDValidating(false);
    }
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

    // Validate labour ID as user types
    if (field === 'labourID') {
      const timeoutId = setTimeout(() => {
        validateLabourID(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleTagToggle = (tagType, tag) => {
    setFormData(prev => ({
      ...prev,
      [tagType]: prev[tagType].includes(tag)
        ? prev[tagType].filter(t => t !== tag)
        : [...prev[tagType], tag]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    // For new employees, Labour ID is auto-generated and guaranteed to be unique
    // For existing employees, Labour ID cannot be changed
    if (!employee) {
      // Ensure Labour ID is generated
      if (!formData.labourID) {
        toast.error('Labour ID is required');
        return;
      }
    }

    setLoading(true);
    try {
      const employeeData = {
        ...formData,
        dateJoined: new Date(formData.dateJoined)
      };

      if (employee) {
        await EmployeeService.updateEmployee(employee.id, employeeData);
        toast.success('Employee updated successfully');
      } else {
        await EmployeeService.createEmployee(employeeData, orgID, createdBy);
        toast.success('Employee created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const isOpeningBalanceEditable = !employee || employee.currentBalance === employee.openingBalance;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add New Employee'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                error={errors.name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labour ID *
                {isGeneratingID && (
                  <span className="ml-2 text-blue-500 text-xs">Generating...</span>
                )}
              </label>
              <div className="flex space-x-2">
                <Input
                  value={formData.labourID}
                  readOnly
                  placeholder="Auto-generated Labour ID"
                  error={errors.labourID}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateLabourID}
                  disabled={isGeneratingID || !!employee}
                  className="px-3"
                >
                  {isGeneratingID ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    '🔄'
                  )}
                </Button>
              </div>
              {employee && (
                <p className="mt-1 text-xs text-gray-500">
                  Labour ID cannot be changed for existing employees
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Joined *
              </label>
              <Input
                type="date"
                value={formData.dateJoined}
                onChange={(e) => handleInputChange('dateJoined', e.target.value)}
                error={errors.dateJoined}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active Employee
              </label>
            </div>
          </div>
        </Card>

        {/* Employee Tags */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Tags *</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EMPLOYEE_TAGS.map(tag => (
              <label key={tag} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.employeeTags.includes(tag)}
                  onChange={() => handleTagToggle('employeeTags', tag)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{tag}</span>
              </label>
            ))}
          </div>
          {errors.employeeTags && (
            <p className="mt-2 text-sm text-red-600">{errors.employeeTags}</p>
          )}
        </Card>

        {/* Salary Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Tags *
              </label>
              <div className="space-y-2">
                {SALARY_TAGS.map(tag => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.salaryTags.includes(tag)}
                      onChange={() => handleTagToggle('salaryTags', tag)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{tag}</span>
                  </label>
                ))}
              </div>
              {errors.salaryTags && (
                <p className="mt-2 text-sm text-red-600">{errors.salaryTags}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Value (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.salaryValue}
                onChange={(e) => handleInputChange('salaryValue', parseFloat(e.target.value) || 0)}
                placeholder="Enter salary amount"
                error={errors.salaryValue}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.bonusEligible}
                onChange={(e) => handleInputChange('bonusEligible', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Bonus Eligible</span>
            </label>
          </div>
        </Card>

        {/* Opening Balance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Opening Balance</h3>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Balance (₹) *
              {!isOpeningBalanceEditable && (
                <span className="ml-2 text-xs text-gray-500">
                  (Cannot edit - wages/payments exist)
                </span>
              )}
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.openingBalance}
              onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
              placeholder="Enter opening balance (can be negative)"
              error={errors.openingBalance}
              disabled={!isOpeningBalanceEditable}
            />
            <p className="mt-2 text-sm text-gray-500">
              This is the initial balance assigned to the employee. Can be negative for advance payments or debt. 
              Current balance will be calculated as: Opening Balance + Wages - Payments
            </p>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || labourIDValidating}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {employee ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              employee ? 'Update Employee' : 'Create Employee'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeForm;
