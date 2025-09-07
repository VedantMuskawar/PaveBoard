import React, { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  doc
} from "firebase/firestore";
import { useOrganization } from "../../contexts/OrganizationContext";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-hot-toast";
import { 
  Button,
  Card,
  Modal,
  Input,
  DataTable,
  LoadingState,
  EmptyState,
  PageHeader,
  SectionCard,
  Badge,
  ConfirmationModal
} from "../../components/ui";
import './VehicleManagement.css';

const ManageVehicle = ({ onBack }) => {
  const { selectedOrganization: selectedOrg } = useOrganization();
  const { user } = useAuth();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  
  const [vehicles, setVehicles] = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "VEHICLES")));
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
  }, [selectedOrg]);

  const handleDelete = async (vehicleId) => {
    try {
      await deleteDoc(doc(db, "VEHICLES", vehicleId));
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
      toast.success("Vehicle deleted successfully");
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const confirmDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  };


  const handleAddVehicle = async (formData) => {
    try {
      const data = {
        ...formData,
        createdAt: Timestamp.now(),
        status: "Active"
      };
      await addDoc(collection(db, "VEHICLES"), data);
      toast.success("Vehicle added successfully");
      fetchData();
      setActiveForm(null);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle");
    }
  };

  const tableColumns = [
    { key: 'vehicleNo', header: 'Vehicle No' },
    { key: 'type', header: 'Type' },
    { key: 'meterType', header: 'Meter Type' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (vehicle) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => confirmDelete(vehicle)}
          className="px-2 py-1"
        >
          🗑️
        </Button>
      )
    }
  ];

  return (
    <div className="vehicle-management-container">
      <PageHeader
        title="🚜 Manage Vehicles"
        onBack={handleBack}
        role={isAdmin ? "admin" : "manager"}
      />

      <div className="main-content">
        <div className="content-panel">
          {/* Add Vehicle Button */}
          <div className="form-buttons-container">
            <Button
              variant="primary"
              onClick={() => setActiveForm("Vehicles")}
              className="add-vehicle-btn"
            >
              Add Vehicle
            </Button>
          </div>

          {/* Modal for Form */}
          <Modal
            isOpen={activeForm === "Vehicles"}
            onClose={() => setActiveForm(null)}
            title="Add Vehicle"
            className="modal-content"
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = {
                  vehicleNo: e.target.vehicleNo.value,
                  type: e.target.type.value,
                  meterType: e.target.meterType.value
                };
                await handleAddVehicle(formData);
                e.target.reset();
              }}
              className="form-section"
            >
              <Input
                name="vehicleNo"
                placeholder="Vehicle No"
                required
                className="vehicle-input"
              />
              <Input
                name="type"
                placeholder="Type"
                required
                className="vehicle-input"
              />
              <Input
                name="meterType"
                placeholder="Meter Type"
                required
                className="vehicle-input"
              />
              <Button type="submit" variant="primary" className="submit-btn">
                Add Vehicle
              </Button>
            </form>
          </Modal>

          {/* Table Section */}
          <SectionCard title="Vehicles" className="table-section">
            {loading ? (
              <LoadingState />
            ) : vehicles.length === 0 ? (
              <EmptyState
                title="No Vehicles Found"
                description="Add your first vehicle to get started"
                action={
                  <Button
                    variant="primary"
                    onClick={() => setActiveForm("Vehicles")}
                  >
                    Add Vehicle
                  </Button>
                }
              />
            ) : (
              <div className="scrollable-container">
                <DataTable
                  data={vehicles}
                  columns={tableColumns}
                  className="vehicle-table"
                />
              </div>
            )}
          </SectionCard>

          {/* Delete Confirmation Modal */}
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setVehicleToDelete(null);
            }}
            onConfirm={() => handleDelete(vehicleToDelete?.id)}
            title="Delete Vehicle"
            message={`Are you sure you want to delete vehicle "${vehicleToDelete?.vehicleNo}"?`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        </div>
      </div>
    </div>
  );
};

export default ManageVehicle;