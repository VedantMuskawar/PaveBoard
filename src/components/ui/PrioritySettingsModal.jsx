import React, { useState, useEffect } from "react";
import { Modal, Button, InputField, SelectField, Card } from "./index";
import { savePriorityConfig, getPriorityConfig, validatePriorityConfig } from "../../services/priorityConfigService";
import { toast } from "react-hot-toast";

const PrioritySettingsModal = ({ isOpen, onClose, orgId, userId }) => {
  const [config, setConfig] = useState({
    configName: "Priority Configuration",
    timeBased: {
      enabled: true,
      urgentDays: 1,
      normalDays: 3,
      lowDays: 7,
      maxPoints: 30
    },
    valueBased: {
      enabled: true,
      highValue: 10000,
      mediumValue: 5000,
      lowValue: 1000,
      maxPoints: 25
    },
    vehicleBased: {
      enabled: true,
      maxPoints: 20,
      vehicleEfficiency: {
        "TRACTOR": { tripsPerDay: 4, capacity: 1000, priorityMultiplier: 1.2 },
        "TRUCK": { tripsPerDay: 2, capacity: 2000, priorityMultiplier: 1.0 },
        "MINI_TRUCK": { tripsPerDay: 6, capacity: 500, priorityMultiplier: 0.8 }
      }
    },
    orderCountBased: {
      enabled: true,
      highCount: 100,
      mediumCount: 50,
      lowCount: 10,
      maxPoints: 15
    },
    regionBased: {
      enabled: true,
      maxPoints: 10,
      highPriorityRegions: ["Mumbai", "Delhi", "Bangalore"],
      mediumPriorityRegions: ["Pune", "Chennai", "Hyderabad"],
      lowPriorityRegions: ["Other"]
    },
    clientBased: {
      enabled: true,
      maxPoints: 15,
      vipClients: [],
      regularClients: [],
      newClients: []
    }
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("time");

  // Load existing config when modal opens
  useEffect(() => {
    if (isOpen && orgId) {
      loadExistingConfig();
    }
  }, [isOpen, orgId]);

  const loadExistingConfig = async () => {
    try {
      const existingConfig = await getPriorityConfig(orgId);
      if (existingConfig && existingConfig.configName) {
        setConfig(existingConfig);
      }
    } catch (error) {
      console.error("Error loading existing config:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate configuration
      const validation = validatePriorityConfig(config);
      if (!validation.isValid) {
        toast.error(`Configuration errors: ${validation.errors.join(", ")}`);
        return;
      }

      await savePriorityConfig(orgId, config, userId);
      toast.success("Priority configuration saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save priority configuration");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateArrayField = (section, field, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    updateConfig(section, field, arrayValue);
  };

  const tabs = [
    { id: "time", label: "⏰ Time", icon: "⏰" },
    { id: "value", label: "💰 Value", icon: "💰" },
    { id: "vehicle", label: "🚛 Vehicle", icon: "🚛" },
    { id: "count", label: "📊 Count", icon: "📊" },
    { id: "region", label: "📍 Region", icon: "📍" },
    { id: "client", label: "👥 Client", icon: "👥" }
  ];

  const renderTimeBasedSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.timeBased.enabled}
          onChange={(e) => updateConfig("timeBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Time-based Priority</label>
      </div>
      
      {config.timeBased.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Urgent Days (≤)"
            type="number"
            value={config.timeBased.urgentDays}
            onChange={(e) => updateConfig("timeBased", "urgentDays", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Normal Days (≤)"
            type="number"
            value={config.timeBased.normalDays}
            onChange={(e) => updateConfig("timeBased", "normalDays", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Low Days (≤)"
            type="number"
            value={config.timeBased.lowDays}
            onChange={(e) => updateConfig("timeBased", "lowDays", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Max Points"
            type="number"
            value={config.timeBased.maxPoints}
            onChange={(e) => updateConfig("timeBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
      )}
    </div>
  );

  const renderValueBasedSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.valueBased.enabled}
          onChange={(e) => updateConfig("valueBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Value-based Priority</label>
      </div>
      
      {config.valueBased.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="High Value (₹)"
            type="number"
            value={config.valueBased.highValue}
            onChange={(e) => updateConfig("valueBased", "highValue", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Medium Value (₹)"
            type="number"
            value={config.valueBased.mediumValue}
            onChange={(e) => updateConfig("valueBased", "mediumValue", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Low Value (₹)"
            type="number"
            value={config.valueBased.lowValue}
            onChange={(e) => updateConfig("valueBased", "lowValue", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Max Points"
            type="number"
            value={config.valueBased.maxPoints}
            onChange={(e) => updateConfig("valueBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
      )}
    </div>
  );

  const renderVehicleBasedSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.vehicleBased.enabled}
          onChange={(e) => updateConfig("vehicleBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Vehicle-based Priority</label>
      </div>
      
      {config.vehicleBased.enabled && (
        <div className="space-y-4">
          <InputField
            label="Max Points"
            type="number"
            value={config.vehicleBased.maxPoints}
            onChange={(e) => updateConfig("vehicleBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
          
          <div className="space-y-3">
            <h4 className="text-white font-medium">Vehicle Efficiency Settings</h4>
            {Object.entries(config.vehicleBased.vehicleEfficiency).map(([vehicle, settings]) => (
              <Card key={vehicle} className="p-4">
                <h5 className="text-white font-medium mb-2">{vehicle}</h5>
                <div className="grid grid-cols-3 gap-2">
                  <InputField
                    label="Trips/Day"
                    type="number"
                    value={settings.tripsPerDay}
                    onChange={(e) => {
                      const newEfficiency = {
                        ...config.vehicleBased.vehicleEfficiency,
                        [vehicle]: {
                          ...settings,
                          tripsPerDay: parseInt(e.target.value)
                        }
                      };
                      updateConfig("vehicleBased", "vehicleEfficiency", newEfficiency);
                    }}
                    min="1"
                  />
                  <InputField
                    label="Capacity"
                    type="number"
                    value={settings.capacity}
                    onChange={(e) => {
                      const newEfficiency = {
                        ...config.vehicleBased.vehicleEfficiency,
                        [vehicle]: {
                          ...settings,
                          capacity: parseInt(e.target.value)
                        }
                      };
                      updateConfig("vehicleBased", "vehicleEfficiency", newEfficiency);
                    }}
                    min="1"
                  />
                  <InputField
                    label="Priority Multiplier"
                    type="number"
                    step="0.1"
                    value={settings.priorityMultiplier}
                    onChange={(e) => {
                      const newEfficiency = {
                        ...config.vehicleBased.vehicleEfficiency,
                        [vehicle]: {
                          ...settings,
                          priorityMultiplier: parseFloat(e.target.value)
                        }
                      };
                      updateConfig("vehicleBased", "vehicleEfficiency", newEfficiency);
                    }}
                    min="0.1"
                    max="2.0"
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrderCountSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.orderCountBased.enabled}
          onChange={(e) => updateConfig("orderCountBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Order Count Priority</label>
      </div>
      
      {config.orderCountBased.enabled && (
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="High Count (≥)"
            type="number"
            value={config.orderCountBased.highCount}
            onChange={(e) => updateConfig("orderCountBased", "highCount", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Medium Count (≥)"
            type="number"
            value={config.orderCountBased.mediumCount}
            onChange={(e) => updateConfig("orderCountBased", "mediumCount", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Low Count (≥)"
            type="number"
            value={config.orderCountBased.lowCount}
            onChange={(e) => updateConfig("orderCountBased", "lowCount", parseInt(e.target.value))}
            min="0"
          />
          <InputField
            label="Max Points"
            type="number"
            value={config.orderCountBased.maxPoints}
            onChange={(e) => updateConfig("orderCountBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
      )}
    </div>
  );

  const renderRegionSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.regionBased.enabled}
          onChange={(e) => updateConfig("regionBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Region Priority</label>
      </div>
      
      {config.regionBased.enabled && (
        <div className="space-y-4">
          <InputField
            label="Max Points"
            type="number"
            value={config.regionBased.maxPoints}
            onChange={(e) => updateConfig("regionBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">High Priority Regions</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.regionBased.highPriorityRegions.join(', ')}
                onChange={(e) => updateArrayField("regionBased", "highPriorityRegions", e.target.value)}
                placeholder="Mumbai, Delhi, Bangalore"
                rows="2"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Medium Priority Regions</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.regionBased.mediumPriorityRegions.join(', ')}
                onChange={(e) => updateArrayField("regionBased", "mediumPriorityRegions", e.target.value)}
                placeholder="Pune, Chennai, Hyderabad"
                rows="2"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Low Priority Regions</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.regionBased.lowPriorityRegions.join(', ')}
                onChange={(e) => updateArrayField("regionBased", "lowPriorityRegions", e.target.value)}
                placeholder="Other"
                rows="2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderClientSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={config.clientBased.enabled}
          onChange={(e) => updateConfig("clientBased", "enabled", e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-white font-medium">Enable Client Priority</label>
      </div>
      
      {config.clientBased.enabled && (
        <div className="space-y-4">
          <InputField
            label="Max Points"
            type="number"
            value={config.clientBased.maxPoints}
            onChange={(e) => updateConfig("clientBased", "maxPoints", parseInt(e.target.value))}
            min="1"
            max="100"
          />
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">VIP Client IDs</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.clientBased.vipClients.join(', ')}
                onChange={(e) => updateArrayField("clientBased", "vipClients", e.target.value)}
                placeholder="client1, client2, client3"
                rows="2"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Regular Client IDs</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.clientBased.regularClients.join(', ')}
                onChange={(e) => updateArrayField("clientBased", "regularClients", e.target.value)}
                placeholder="client4, client5, client6"
                rows="2"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">New Client IDs</label>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                value={config.clientBased.newClients.join(', ')}
                onChange={(e) => updateArrayField("clientBased", "newClients", e.target.value)}
                placeholder="client7, client8, client9"
                rows="2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "time": return renderTimeBasedSettings();
      case "value": return renderValueBasedSettings();
      case "vehicle": return renderVehicleBasedSettings();
      case "count": return renderOrderCountSettings();
      case "region": return renderRegionSettings();
      case "client": return renderClientSettings();
      default: return renderTimeBasedSettings();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">⚙️</span>
          <h2 className="text-2xl font-bold text-white">Priority Configuration</h2>
        </div>

        {/* Config Name */}
        <div className="mb-6">
          <InputField
            label="Configuration Name"
            value={config.configName}
            onChange={(e) => setConfig(prev => ({ ...prev, configName: e.target.value }))}
            placeholder="Enter configuration name"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <Card className="mb-6">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave} 
            loading={loading}
            disabled={loading}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrioritySettingsModal;
