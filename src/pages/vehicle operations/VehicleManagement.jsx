import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  doc,
  onSnapshot,
  where
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
  ConfirmationModal,
  SelectField,
  NumberInput,
  DieselPage,
  FilterBar
} from "../../components/ui";
import VehicleModal from "../../components/ui/VehicleModal";
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
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicles with real-time updates
  useEffect(() => {
    if (!selectedOrg?.orgID) return;

    const q = query(
      collection(db, "VEHICLES"),
      where("orgID", "==", selectedOrg.orgID)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const vehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort vehicles by vehicleNo for consistent ordering
        const sortedVehicles = vehicles.sort((a, b) => {
          const vehicleNoA = a.vehicleNo || '';
          const vehicleNoB = b.vehicleNo || '';
          return vehicleNoA.localeCompare(vehicleNoB);
        });
        
        setVehicles(sortedVehicles);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to fetch vehicles");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedOrg?.orgID]);

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



  // Add or update vehicle
  const handleSubmitVehicle = async (formData) => {
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        orgID: selectedOrg.orgID,
        createdAt: editingVehicle ? editingVehicle.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingVehicle) {
        await updateDoc(doc(db, "VEHICLES", editingVehicle.id), data);
        toast.success("Vehicle updated successfully");
      } else {
        await addDoc(collection(db, "VEHICLES"), data);
        toast.success("Vehicle added successfully");
      }
      
      setShowVehicleModal(false);
      setEditingVehicle(null);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("Failed to save vehicle");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit vehicle
  const handleEditVehicle = useCallback((vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleModal(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowVehicleModal(false);
    setEditingVehicle(null);
  }, []);

  // Handle add vehicle
  const handleAddVehicle = useCallback(() => {
    setEditingVehicle(null);
    setShowVehicleModal(true);
  }, []);

  // Filter vehicles based on search text
  const filteredVehicles = useMemo(() => {
    if (!searchText) return vehicles;
    
    return vehicles.filter(vehicle => {
      const searchLower = searchText.toLowerCase();
      return (
        vehicle.vehicleNo?.toLowerCase().includes(searchLower) ||
        vehicle.type?.toLowerCase().includes(searchLower) ||
        vehicle.meterType?.toLowerCase().includes(searchLower)
      );
    });
  }, [vehicles, searchText]);

  // Format weekly capacity for display
  const formatWeeklyCapacity = useCallback((weeklyCapacity) => {
    if (!weeklyCapacity) return "N/A";
    const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    return days.map(day => `${day}: ${weeklyCapacity[day] || 0}`).join(', ');
  }, []);

  const tableColumns = useMemo(() => [
    { key: 'vehicleNo', header: 'Vehicle No' },
    { key: 'type', header: 'Type' },
    { key: 'meterType', header: 'Meter Type' },
    { key: 'vehicleQuantity', header: 'Capacity' },
    { 
      key: 'status', 
      header: 'Status',
      render: (vehicle) => (
        <Badge 
          variant={vehicle.status === "Active" ? "success" : "danger"}
        >
          {vehicle.status}
        </Badge>
      )
    },
    { 
      key: 'weeklyCapacity', 
      header: 'Weekly Capacity',
      render: (vehicle) => (
        <div className="text-xs text-gray-400 max-w-xs">
          {formatWeeklyCapacity(vehicle.weeklyCapacity)}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (vehicle) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditVehicle(vehicle)}
            className="px-2 py-1"
          >
            ✏️
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => confirmDelete(vehicle)}
            className="px-2 py-1"
          >
            🗑️
          </Button>
        </div>
      )
    }
  ], [formatWeeklyCapacity, handleEditVehicle]);

  return (
    <DieselPage>
      <PageHeader
        onBack={handleBack}
        role={isAdmin ? "admin" : "manager"}
        roleDisplay={isAdmin ? "👑 Admin" : "👔 Manager"}
      />
      
      {/* Filter Bar */}
      <FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
        <FilterBar.Actions>
          <Button
            variant="primary"
            onClick={handleAddVehicle}
            size="md"
          >
            ➕ Add Vehicle
          </Button>
        </FilterBar.Actions>
        
        <FilterBar.Search
          placeholder="Search vehicles..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: "300px" }}
        />
      </FilterBar>
      
      {/* Main Content Container */}
      <div style={{ marginTop: "1.5rem", padding: "0 2rem", width: "100%", boxSizing: "border-box" }}>
        <div>

          {/* Enhanced Vehicle Modal */}
          <VehicleModal
            show={showVehicleModal}
            onClose={handleCloseModal}
            onSubmit={handleSubmitVehicle}
            editingVehicle={editingVehicle}
            isLoading={isSubmitting}
          />

          {/* Vehicles Table */}
          <div style={{
            background: "rgba(20,20,22,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>🚜</span>
              <h2 style={{ color: "#fff", fontWeight: "600", margin: 0, fontSize: "1.25rem" }}>
                Vehicles
              </h2>
            </div>
            
            {loading ? (
              <LoadingState variant="inline" message="Loading vehicles..." icon="⏳" />
            ) : filteredVehicles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚜</div>
                <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                  {searchText ? "No Vehicles Found" : "No Vehicles Found"}
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
                  {searchText ? "No vehicles match your search criteria" : "Add your first vehicle to get started"}
                </p>
                {searchText ? (
                  <Button
                    variant="outline"
                    onClick={() => setSearchText("")}
                    style={{ background: "rgba(55,65,81,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => setActiveForm("Vehicles")}
                  >
                    Add Vehicle
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <DataTable
                  data={filteredVehicles}
                  columns={tableColumns}
                  className="vehicle-table"
                />
              </div>
            )}
          </div>

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
    </DieselPage>
  );
};

export default ManageVehicle;