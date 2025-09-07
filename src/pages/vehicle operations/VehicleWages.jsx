import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useOrganization } from "../../contexts/OrganizationContext";
import { toast } from "react-hot-toast";

// Import reusable UI components
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
  ConfirmationModal,
  FormModal,
  InputField,
  SelectField,
  DieselPage
} from "../../components/ui";

// Import CSS
import "./VehicleWages.css";

function VehicleWagesManagement({ onBack }) {
  const { selectedOrganization: selectedOrg } = useOrganization();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Default onBack function if not provided
  const handleBack = onBack || (() => window.history.back());
  
  const [vehicleWages, setVehicleWages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleWageToDelete, setVehicleWageToDelete] = useState(null);
  const [newWage, setNewWage] = useState({
    type: "",
    unitCount: "",
    totalWage: "",
    isActive: true
  });

  useEffect(() => {
    if (!selectedOrg) {
      console.error("No organization selected");
      return;
    }
    
    fetchVehicleWages();
  }, [selectedOrg]);

  const fetchVehicleWages = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(collection(db, "VEHICLE_WAGES"), where("orgID", "==", selectedOrg.orgID))
      );
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        editing: false,
      }));
      setVehicleWages(data);
    } catch (error) {
      console.error("Error fetching vehicle wages:", error);
      toast.error("Failed to fetch vehicle wages");
    } finally {
      setLoading(false);
    }
  };

  const handleWageChange = async (id, field, value) => {
    try {
      const updated = vehicleWages.map((wage) =>
        wage.id === id ? { ...wage, [field]: value } : wage
      );
      setVehicleWages(updated);

      const ref = doc(db, "VEHICLE_WAGES", id);
      await updateDoc(ref, { [field]: value });
      toast.success("Vehicle wage updated successfully");
    } catch (error) {
      console.error("Error updating vehicle wage:", error);
      toast.error("Failed to update vehicle wage");
    }
  };

  const handleAddWage = async () => {
    if (
      newWage.type.trim() === "" ||
      newWage.unitCount.trim() === "" ||
      newWage.totalWage.trim() === ""
    ) {
      toast.error("Please fill all fields correctly.");
      return;
    }
    if (!selectedOrg) {
      toast.error("No organization selected. Please select an organization first.");
      return;
    }
    
    try {
      const ref = collection(db, "VEHICLE_WAGES");
      const docRef = await addDoc(ref, {
        type: newWage.type,
        unitCount: parseInt(newWage.unitCount),
        totalWage: parseFloat(newWage.totalWage),
        orgID: selectedOrg.orgID,
        isActive: newWage.isActive,
        updatedAt: new Date()
      });
      
      setVehicleWages([
        ...vehicleWages,
        {
          id: docRef.id,
          type: newWage.type,
          unitCount: parseInt(newWage.unitCount),
          totalWage: parseFloat(newWage.totalWage),
          orgID: selectedOrg.orgID,
          isActive: newWage.isActive,
          updatedAt: new Date()
        }
      ]);
      
      setShowModal(false);
      setNewWage({
        type: "",
        unitCount: "",
        totalWage: "",
        isActive: true
      });
      
      toast.success("Vehicle wage added successfully");
    } catch (error) {
      console.error("Error adding vehicle wage:", error);
      toast.error("Failed to add vehicle wage");
    }
  };

  const handleDeleteWage = async () => {
    if (!vehicleWageToDelete) return;
    
    try {
      await deleteDoc(doc(db, "VEHICLE_WAGES", vehicleWageToDelete.id));
      const updated = vehicleWages.filter(v => v.id !== vehicleWageToDelete.id);
      setVehicleWages(updated);
      setShowDeleteModal(false);
      setVehicleWageToDelete(null);
      toast.success("Vehicle wage deleted successfully");
    } catch (error) {
      console.error("Error deleting vehicle wage:", error);
      toast.error("Failed to delete vehicle wage");
    }
  };

  const handleEditWage = (wageId) => {
    const updated = vehicleWages.map((wage) =>
      wage.id === wageId ? { ...wage, editing: true } : wage
    );
    setVehicleWages(updated);
  };

  const handleSaveEdit = async (wageId, field, value) => {
    try {
      const updatedWage = vehicleWages.find(w => w.id === wageId);
      await updateDoc(doc(db, "VEHICLE_WAGES", wageId), {
        [field]: field === 'totalWage' ? parseFloat(value) : value,
        updatedAt: new Date()
      });
      
      const updated = vehicleWages.map((wage) =>
        wage.id === wageId ? { ...wage, [field]: field === 'totalWage' ? parseFloat(value) : value, editing: false } : wage
      );
      setVehicleWages(updated);
      toast.success("Vehicle wage updated successfully");
    } catch (error) {
      console.error("Error updating vehicle wage:", error);
      toast.error("Failed to update vehicle wage");
    }
  };

  const handleToggleStatus = async (wageId, newStatus) => {
    try {
      const updated = vehicleWages.map((wage) =>
        wage.id === wageId ? { ...wage, isActive: newStatus } : wage
      );
      setVehicleWages(updated);
      
      await updateDoc(doc(db, "VEHICLE_WAGES", wageId), {
        isActive: newStatus,
        updatedAt: new Date()
      });
      toast.success(`Vehicle wage ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error updating vehicle wage status:", error);
      toast.error("Failed to update vehicle wage status");
    }
  };

  // Table columns configuration
  const tableColumns = [
    { key: 'type', header: 'Type' },
    { key: 'unitCount', header: 'Unit Count' },
    { key: 'totalWage', header: 'Total Wage' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (wage) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleEditWage(wage.id)}
            disabled={wage.editing}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setVehicleWageToDelete(wage);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // Check if organization is selected
  if (!selectedOrg) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading organization data..." 
          icon="🏢"
        />
      </DieselPage>
    );
  }

  if (loading) {
    return (
      <DieselPage>
        <LoadingState 
          variant="page" 
          message="Loading vehicle wages..." 
          icon="💰"
        />
      </DieselPage>
    );
  }

  return (
    <DieselPage>
      {/* Header */}
      <PageHeader
        title="💰 Vehicle Wages Management"
        onBack={handleBack}
        role={isAdmin ? "admin" : "manager"}
      />

      {/* Main content container with consistent spacing */}
      <div className="w-full" style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
        <div className="max-w-7xl mx-auto">
          {/* Unified Card Container */}
          <Card className="overflow-x-auto" style={{ marginTop: "1rem" }}>
            {/* Add Button */}
            <div className="flex justify-end mb-6">
              <Button
                variant="primary"
                onClick={() => setShowModal(true)}
                className="px-6 py-3"
              >
                Add Vehicle Wage
              </Button>
            </div>

            {/* Table Section */}
            <SectionCard title="Vehicle Wages" className="table-section">
              {vehicleWages.length === 0 ? (
                <EmptyState
                  title="No Vehicle Wages Found"
                  description="Add your first vehicle wage configuration to get started"
                  action={
                    <Button
                      variant="primary"
                      onClick={() => setShowModal(true)}
                    >
                      Add Vehicle Wage
                    </Button>
                  }
                />
              ) : (
                <div className="scrollable-container">
                  <DataTable
                    data={vehicleWages}
                    columns={tableColumns}
                    className="vehicle-table"
                  />
                </div>
              )}
            </SectionCard>
          </Card>
        </div>
      </div>

      {/* Add Vehicle Wage Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setNewWage({
            type: "",
            unitCount: "",
            totalWage: "",
            isActive: true
          });
        }}
        title="Add Vehicle Wage"
        className="modal-content"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleAddWage();
            e.target.reset();
          }}
          className="form-section"
        >
          <Input
            name="type"
            placeholder="Vehicle Type"
            value={newWage.type}
            onChange={(e) => setNewWage({ ...newWage, type: e.target.value })}
            required
            className="vehicle-input"
          />
          <Input
            name="unitCount"
            type="number"
            placeholder="Unit Count"
            value={newWage.unitCount}
            onChange={(e) => setNewWage({ ...newWage, unitCount: e.target.value })}
            required
            className="vehicle-input"
          />
          <Input
            name="totalWage"
            type="number"
            placeholder="Total Wage"
            value={newWage.totalWage}
            onChange={(e) => setNewWage({ ...newWage, totalWage: e.target.value })}
            required
            className="vehicle-input"
          />
          <Button type="submit" variant="primary" className="submit-btn">
            Add Vehicle Wage
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVehicleWageToDelete(null);
        }}
        onConfirm={handleDeleteWage}
        title="Delete Vehicle Wage"
        message={`Are you sure you want to delete the vehicle wage for "${vehicleWageToDelete?.type}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </DieselPage>
  );
}

export default VehicleWagesManagement;