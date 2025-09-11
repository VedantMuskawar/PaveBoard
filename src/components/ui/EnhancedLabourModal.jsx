import React from 'react';
import Modal from './Modal';
import Input from './Input';
import SelectField from './SelectField';
import Button from './Button';

const EnhancedLabourModal = ({
  isOpen,
  onClose,
  isEditing,
  isMarried,
  setIsMarried,
  newLabour,
  setNewLabour,
  vehicleList,
  isFormValid,
  onSubmit,
  onCancel
}) => {
  const handleTypeChange = (type) => {
    console.log(`🏷️ Labour type changed to: ${type}`);
    setIsMarried(type === 'linked');
  };

  const handleFieldChange = (field, value) => {
    console.log(`📝 ${field} changed:`, value);
    setNewLabour(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (tag, checked) => {
    const updatedTags = checked
      ? [...newLabour.tags, tag]
      : newLabour.tags.filter(t => t !== tag);
    console.log("🏷️ Tags changed:", updatedTags);
    setNewLabour(prev => ({ ...prev, tags: updatedTags }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Labour' : 'Add New Labour'}
      size="lg"
    >
      <div className="enhanced-modal-body">
        <form onSubmit={onSubmit} className="enhanced-labour-form">
          
          {/* Labour Type Selection - Only show when adding new labour */}
          {!isEditing && (
            <div className="labour-type-section">
              <h3 className="section-title">
                <span className="title-icon">🏷️</span>
                Labour Type
              </h3>
              <div className="type-options-grid">
                <label className={`type-option-card ${!isMarried ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="labourType"
                    value="individual"
                    checked={!isMarried}
                    onChange={() => handleTypeChange('individual')}
                  />
                  <div className="option-card-content">
                    <div className="option-icon">👤</div>
                    <div className="option-details">
                      <h4>Individual Labour</h4>
                      <p>Single person worker</p>
                      <div className="option-features">
                        <span className="feature-tag">Personal Account</span>
                        <span className="feature-tag">Individual Wages</span>
                      </div>
                    </div>
                  </div>
                </label>
                
                <label className={`type-option-card ${isMarried ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="labourType"
                    value="linked"
                    checked={isMarried}
                    onChange={() => handleTypeChange('linked')}
                  />
                  <div className="option-card-content">
                    <div className="option-icon">👫</div>
                    <div className="option-details">
                      <h4>Linked Labour</h4>
                      <p>Married couple / Family</p>
                      <div className="option-features">
                        <span className="feature-tag">Shared Account</span>
                        <span className="feature-tag">Combined Wages</span>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Individual Labour Fields */}
          {(!isMarried || isEditing) && (
            <div className="form-section">
              <h3 className="section-title">
                <span className="title-icon">👤</span>
                Individual Details
              </h3>
              <div className="form-grid">
                <div className="form-field">
                  <Input
                    label="Full Name *"
                    type="text"
                    value={newLabour.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="form-field">
                  <SelectField
                    label="Gender"
                    value={newLabour.gender}
                    onChange={(value) => handleFieldChange('gender', value)}
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Linked Labour Fields */}
          {isMarried && !isEditing && (
            <div className="form-section">
              <h3 className="section-title">
                <span className="title-icon">👫</span>
                Linked Labour Details
              </h3>
              <div className="linked-labour-container">
                <div className="person-card">
                  <h4>First Person</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <Input
                        label="Full Name *"
                        type="text"
                        value={newLabour.name1}
                        onChange={(e) => handleFieldChange('name1', e.target.value)}
                        placeholder="Enter first person name"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <SelectField
                        label="Gender"
                        value={newLabour.gender}
                        onChange={(value) => handleFieldChange('gender', value)}
                        options={[
                          { value: "", label: "Select Gender" },
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" }
                        ]}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="person-card">
                  <h4>Second Person</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <Input
                        label="Full Name *"
                        type="text"
                        value={newLabour.name2}
                        onChange={(e) => handleFieldChange('name2', e.target.value)}
                        placeholder="Enter second person name"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <SelectField
                        label="Gender"
                        value={newLabour.gender === "Male" ? "Female" : "Male"}
                        onChange={() => {}} // Disabled, auto-selected
                        options={[
                          { value: "", label: "Auto-selected" },
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" }
                        ]}
                        disabled={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="title-icon">⚙️</span>
              Labour Configuration
            </h3>
            
            <div className="form-grid">
              <div className="form-field">
                <SelectField
                  label="Assigned Vehicle"
                  value={newLabour.assignedVehicle || ''}
                  onChange={(value) => handleFieldChange('assignedVehicle', value)}
                  options={[
                    { value: "", label: "No Vehicle Assigned" },
                    ...vehicleList.map(vehicle => ({
                      value: vehicle,
                      label: vehicle
                    }))
                  ]}
                />
                <div className="field-hint">
                  <span className="hint-icon">💡</span>
                  <span>Production workers, loaders, and unloaders typically don't need assigned vehicles</span>
                </div>
              </div>
              
              <div className="form-field">
                <SelectField
                  label="Status *"
                  value={newLabour.status || ''}
                  onChange={(value) => handleFieldChange('status', value)}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "On Leave", label: "On Leave" }
                  ]}
                />
              </div>
            </div>
            
            <div className="form-field">
              <Input
                label="Opening Balance (₹)"
                type="number"
                value={newLabour.openingBalance}
                onChange={(e) => handleFieldChange('openingBalance', e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
              <div className="field-hint">
                <span className="hint-icon">💡</span>
                <span>Initial balance for this labour account</span>
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">
                <span className="label-text">Work Categories *</span>
                <span className="required-asterisk">*</span>
              </label>
              <div className="tags-grid">
                {['Driver', 'Loader', 'Unloader', 'Production'].map(tag => (
                  <label key={tag} className={`tag-option ${newLabour.tags.includes(tag) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={newLabour.tags.includes(tag)}
                      onChange={(e) => handleTagsChange(tag, e.target.checked)}
                    />
                    <span className="tag-content">
                      <span className="tag-icon">
                        {tag === 'Driver' ? '🚛' : 
                         tag === 'Loader' ? '📦' : 
                         tag === 'Unloader' ? '📤' : '🏭'}
                      </span>
                      <span className="tag-text">{tag}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="field-hint">
                <span className="hint-icon">💡</span>
                <span>Select all categories that apply to this labour</span>
              </div>
            </div>

            <div className="form-field">
              <Input
                label="Remarks"
                type="text"
                value={newLabour.remarks || ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isFormValid()}
            >
              {isEditing ? 'Update Labour' : (isMarried ? 'Create Linked Labour' : 'Create Labour')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EnhancedLabourModal;
