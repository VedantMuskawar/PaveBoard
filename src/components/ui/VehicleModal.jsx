import React, { useState, useEffect } from 'react';
import { Button, Input, SelectField, NumberInput } from './index';

const VehicleModal = ({ 
  show, 
  onClose, 
  onSubmit, 
  editingVehicle, 
  vehicleOptions = [],
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    vehicleNo: "",
    type: "",
    meterType: "",
    vehicleQuantity: 0,
    status: "Active",
    weeklyCapacity: {
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0
    }
  });

  const [validation, setValidation] = useState({});

  // Reset form when modal opens/closes or when editing vehicle changes
  useEffect(() => {
    if (show) {
      if (editingVehicle) {
        setFormData({
          vehicleNo: editingVehicle.vehicleNo || "",
          type: editingVehicle.type || "",
          meterType: editingVehicle.meterType || "",
          vehicleQuantity: editingVehicle.vehicleQuantity || 0,
          status: editingVehicle.status || "Active",
          weeklyCapacity: editingVehicle.weeklyCapacity || {
            Thu: 0,
            Fri: 0,
            Sat: 0,
            Sun: 0,
            Mon: 0,
            Tue: 0,
            Wed: 0
          }
        });
      } else {
        setFormData({
          vehicleNo: "",
          type: "",
          meterType: "",
          vehicleQuantity: 0,
          status: "Active",
          weeklyCapacity: {
            Thu: 0,
            Fri: 0,
            Sat: 0,
            Sun: 0,
            Mon: 0,
            Tue: 0,
            Wed: 0
          }
        });
      }
      setValidation({});
    }
  }, [show, editingVehicle]);

  const handleInputChange = (field, value) => {
    if (field.startsWith('weeklyCapacity.')) {
      const day = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        weeklyCapacity: {
          ...prev.weeklyCapacity,
          [day]: parseInt(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear validation error when user starts typing
    if (validation[field]) {
      setValidation(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.vehicleNo.trim()) {
      errors.vehicleNo = "Vehicle number is required";
    }

    if (!formData.type.trim()) {
      errors.type = "Vehicle type is required";
    }

    if (!formData.meterType.trim()) {
      errors.meterType = "Meter type is required";
    }

    if (formData.vehicleQuantity <= 0) {
      errors.vehicleQuantity = "Vehicle quantity must be greater than 0";
    }

    // Check if at least one day has capacity > 0
    const hasCapacity = Object.values(formData.weeklyCapacity).some(cap => cap > 0);
    if (!hasCapacity) {
      errors.weeklyCapacity = "At least one day must have capacity > 0";
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      top: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      zIndex: 9999,
      padding: "1rem",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      width: "100%",
      height: "100vh",
      overflow: "auto"
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)",
        padding: "2rem",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        maxWidth: "600px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        color: "#f3f3f3",
        position: "relative",
        transform: "translateY(0)",
        animation: "modalSlideIn 0.3s ease-out",
        margin: "auto"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>🚜</span>
            <h3 style={{ margin: 0, color: "#00c3ff", fontWeight: "bold", fontSize: "1.25rem" }}>
              {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "26px",
              color: "#ff4444",
              cursor: "pointer",
              marginLeft: "1rem",
              padding: "0.25rem",
              borderRadius: "4px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
            title="Close"
            aria-label="Close vehicle form"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ 
              color: "#00c3ff", 
              marginBottom: "1rem", 
              fontSize: "1rem", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center"
            }}>
              <span style={{ marginRight: "0.5rem" }}>📋</span>
              Basic Information
            </h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ color: "#ccc", display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Vehicle Number *
                </label>
                <Input
                  type="text"
                  value={formData.vehicleNo}
                  onChange={(e) => handleInputChange('vehicleNo', e.target.value)}
                  placeholder="e.g., MH 34 AP 0148"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: validation.vehicleNo ? "1px solid #ff4444" : "1px solid #444",
                    background: "#333",
                    color: "#fff",
                    fontSize: "0.875rem"
                  }}
                  required
                />
                {validation.vehicleNo && (
                  <div style={{ color: "#ff4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {validation.vehicleNo}
                  </div>
                )}
              </div>

              <div>
                <label style={{ color: "#ccc", display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Vehicle Type *
                </label>
                <SelectField
                  value={formData.type}
                  onChange={(value) => handleInputChange('type', value)}
                  options={[
                    { value: "", label: "Select Type" },
                    { value: "Tractor", label: "Tractor" },
                    { value: "Truck", label: "Truck" },
                    { value: "Trailer", label: "Trailer" },
                    { value: "Loader", label: "Loader" },
                    { value: "Excavator", label: "Excavator" },
                    { value: "Other", label: "Other" }
                  ]}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: validation.type ? "1px solid #ff4444" : "1px solid #444",
                    background: "#333",
                    color: "#fff",
                    fontSize: "0.875rem"
                  }}
                  required
                />
                {validation.type && (
                  <div style={{ color: "#ff4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {validation.type}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ color: "#ccc", display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Meter Type *
                </label>
                <SelectField
                  value={formData.meterType}
                  onChange={(value) => handleInputChange('meterType', value)}
                  options={[
                    { value: "", label: "Select Meter Type" },
                    { value: "Hours", label: "Hours" },
                    { value: "Kilometers", label: "Kilometers" },
                    { value: "Miles", label: "Miles" },
                    { value: "Units", label: "Units" }
                  ]}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: validation.meterType ? "1px solid #ff4444" : "1px solid #444",
                    background: "#333",
                    color: "#fff",
                    fontSize: "0.875rem"
                  }}
                  required
                />
                {validation.meterType && (
                  <div style={{ color: "#ff4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {validation.meterType}
                  </div>
                )}
              </div>

              <div>
                <label style={{ color: "#ccc", display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Vehicle Capacity *
                </label>
                <NumberInput
                  value={formData.vehicleQuantity}
                  onChange={(e) => handleInputChange('vehicleQuantity', e.target.value)}
                  placeholder="e.g., 2000"
                  min="1"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: validation.vehicleQuantity ? "1px solid #ff4444" : "1px solid #444",
                    background: "#333",
                    color: "#fff",
                    fontSize: "0.875rem"
                  }}
                  required
                />
                {validation.vehicleQuantity && (
                  <div style={{ color: "#ff4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {validation.vehicleQuantity}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ color: "#ccc", display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Status
                </label>
                <SelectField
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Maintenance", label: "Maintenance" }
                  ]}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #444",
                    background: "#333",
                    color: "#fff",
                    fontSize: "0.875rem"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Weekly Capacity Section */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ 
              color: "#00c3ff", 
              marginBottom: "1rem", 
              fontSize: "1rem", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center"
            }}>
              <span style={{ marginRight: "0.5rem" }}>📅</span>
              Weekly Capacity (Thu → Wed)
            </h4>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
              gap: "1rem",
              marginBottom: "0.5rem"
            }}>
              {['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map(day => (
                <div key={day} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={{ 
                    color: "#ccc", 
                    marginBottom: "0.5rem", 
                    fontSize: "0.75rem",
                    textAlign: "center",
                    fontWeight: "500"
                  }}>
                    {day}
                  </label>
                  <NumberInput
                    value={formData.weeklyCapacity[day]}
                    onChange={(e) => handleInputChange(`weeklyCapacity.${day}`, e.target.value)}
                    min="0"
                    placeholder="0"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #444",
                      background: "#333",
                      color: "#fff",
                      fontSize: "0.75rem",
                      textAlign: "center"
                    }}
                  />
                </div>
              ))}
            </div>
            
            {validation.weeklyCapacity && (
              <div style={{ color: "#ff4444", fontSize: "0.75rem", textAlign: "center", marginTop: "0.5rem" }}>
                {validation.weeklyCapacity}
              </div>
            )}
            
            <div style={{ 
              fontSize: "0.75rem", 
              color: "#9ca3af", 
              textAlign: "center", 
              marginTop: "0.5rem",
              fontStyle: "italic"
            }}>
              Set the number of orders this vehicle can handle each day
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            justifyContent: "flex-end",
            paddingTop: "1rem",
            borderTop: "1px solid rgba(255,255,255,0.1)"
          }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                background: isLoading ? "#666" : "linear-gradient(135deg, #0A84FF, #0066CC)",
                cursor: isLoading ? "not-allowed" : "pointer"
              }}
            >
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid #fff",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  {editingVehicle ? "Updating..." : "Adding..."}
                </div>
              ) : (
                editingVehicle ? "Update Vehicle" : "Add Vehicle"
              )}
            </Button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VehicleModal;

