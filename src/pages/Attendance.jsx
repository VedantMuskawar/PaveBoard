import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, httpsCallable, functions } from '../config/firebase';

// Import UI components
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Badge,
  LoadingState,
  EmptyState
} from '../components/ui';
import './Attendance.css';

const Attendance = ({ onBack }) => {
  const navigate = useNavigate();
  const { selectedOrganization: selectedOrg } = useOrganization();
  const { user } = useAuth();
  
  // Role-based access control
  const userRole = selectedOrg?.role !== undefined ? Number(selectedOrg.role) : 1;
  const isAdmin = userRole === 0;
  const isManager = userRole === 1;
  
  // Get organization ID
  const orgID = selectedOrg?.orgID || "K4Q6vPOuTcLPtlcEwdw0";
  
  // State management
  const [activeTab, setActiveTab] = useState('staff');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  
  // Employee data state
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Fetch employees from Firebase
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      
      // Query employees collection for active employees in the current organization
      const employeesRef = collection(db, 'employees');
      const q = query(
        employeesRef,
        where('orgID', '==', orgID),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const employeesData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employeesData.push({
          id: doc.id,
          labourID: data.labourID || '',
          name: data.name || '',
          employeeTags: data.employeeTags || [],
          salaryTags: data.salaryTags || [],
          accountId: data.accountId || null,
          isActive: data.isActive || false,
          ...data
        });
      });
      
      console.log('✅ Fetched employees:', employeesData.length);
      setEmployees(employeesData);
      
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Categorize employees by their tags
  const categorizedEmployees = useMemo(() => {
    const categories = {
      staff: [],
      drivers: [],
      loaders: [],
      production: []
    };

    employees.forEach(employee => {
      const tags = employee.employeeTags || [];
      
      // Priority: Driver takes precedence over Loader
      if (tags.includes('driver')) {
        categories.drivers.push(employee);
      } else if (tags.includes('loader')) {
        categories.loaders.push(employee);
      } else if (tags.includes('production')) {
        categories.production.push(employee);
      } else if (tags.includes('staff')) {
        categories.staff.push(employee);
      }
    });

    console.log('📊 Categorized employees:', categories);
    return categories;
  }, [employees]);

  // Mock attendance data
  const mockAttendanceData = {
    staff: {
      'EMP001': { totalPresent: 22, totalDays: 31, isAutoCalculated: false },
      'EMP002': { totalPresent: 25, totalDays: 31, isAutoCalculated: false },
      'EMP003': { totalPresent: 20, totalDays: 31, isAutoCalculated: false },
      'EMP004': { totalPresent: 28, totalDays: 31, isAutoCalculated: false },
      'EMP005': { totalPresent: 24, totalDays: 31, isAutoCalculated: false }
    },
    drivers: {
      'EMP101': { totalPresent: 26, totalDays: 31, isAutoCalculated: true },
      'EMP102': { totalPresent: 24, totalDays: 31, isAutoCalculated: true },
      'EMP103': { totalPresent: 29, totalDays: 31, isAutoCalculated: true }
    },
    loaders: {
      'EMP201': { totalPresent: 27, totalDays: 31, isAutoCalculated: true },
      'EMP202': { totalPresent: 25, totalDays: 31, isAutoCalculated: true },
      'EMP203': { totalPresent: 23, totalDays: 31, isAutoCalculated: true }
    },
    production: {
      'EMP301': { totalPresent: 28, totalDays: 31, isAutoCalculated: true },
      'EMP302': { totalPresent: 26, totalDays: 31, isAutoCalculated: true },
      'EMP303': { totalPresent: 30, totalDays: 31, isAutoCalculated: true }
    }
  };

  // Mock individual attendance data (checkbox grid)
  const mockIndividualAttendance = {
    'EMP001': {
      '1': true, '2': true, '3': false, '4': true, '5': true,
      '6': false, '7': true, '8': true, '9': true, '10': true,
      '11': false, '12': true, '13': true, '14': true, '15': true,
      '16': false, '17': true, '18': true, '19': true, '20': true,
      '21': false, '22': true, '23': true, '24': true, '25': true,
      '26': false, '27': true, '28': true, '29': true, '30': true,
      '31': false
    }
  };

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    const employees = categorizedEmployees[activeTab] || [];
    if (!searchQuery) return employees;
    
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.labourID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, searchQuery, categorizedEmployees]);

  // Get current month details
  const currentMonthDetails = useMemo(() => {
    const date = new Date(selectedMonth + '-01');
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return { daysInMonth, monthName };
  }, [selectedMonth]);

  // Fetch attendance data from ATTENDANCE collection
  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      
      // Query ATTENDANCE collection for the current month and employee type
      const attendanceRef = collection(db, 'ATTENDANCE');
      let q;
      
      if (activeTab === 'staff') {
        // For staff, we don't have auto-calculated data, so fetch empty
        setAttendanceData({});
        return;
      } else {
        // For auto-calculated tabs, filter by employeeType
        const employeeType = activeTab === 'production' ? 'production' : 
                           activeTab === 'loaders' ? 'loader' : 
                           activeTab === 'drivers' ? 'driver' : 'production';
        
        q = query(
          attendanceRef,
          where('orgID', '==', orgID),
          where('month', '==', selectedMonth),
          where('employeeType', '==', employeeType)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const attendance = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendance[data.employeeId] = data;
      });
      
      console.log(`✅ Fetched ${activeTab} attendance data:`, attendance);
      setAttendanceData(attendance);
      
    } catch (error) {
      console.error('❌ Error fetching attendance data:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch employees on component mount and when orgID changes
  useEffect(() => {
    if (orgID) {
      fetchEmployees();
    }
  }, [orgID]);

  // Fetch attendance data when month or tab changes
  useEffect(() => {
    if (orgID && selectedMonth) {
      fetchAttendanceData();
    }
  }, [orgID, selectedMonth, activeTab]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedEmployee(null);
  };

  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  // Handle calculate attendance
  const handleCalculateAttendance = async () => {
    setCalculating(true);
    
    try {
      if (activeTab === 'production') {
        // Call Cloud Function for Production attendance calculation
        const calculateProductionAttendance = httpsCallable(functions, 'calculateProductionAttendance');
        
        const result = await calculateProductionAttendance({
          orgID: orgID,
          month: selectedMonth,
          employeeIds: categorizedEmployees.production.map(emp => emp.id)
        });
        
        const data = result.data;
        
        if (data.success) {
          toast.success(data.message);
          console.log('Production attendance calculation results:', data.results);
          
          // Refresh attendance data to show updated results
          await fetchAttendanceData();
        } else {
          throw new Error(data.message || 'Failed to calculate attendance');
        }
        
      } else if (activeTab === 'drivers') {
        // TODO: Implement drivers calculation
        toast.info('Drivers attendance calculation will be implemented next');
        
      } else if (activeTab === 'loaders') {
        // Call Cloud Function for Loaders attendance calculation
        const calculateLoadersAttendance = httpsCallable(functions, 'calculateLoadersAttendance');
        
        const result = await calculateLoadersAttendance({
          orgID: orgID,
          month: selectedMonth,
          employeeIds: categorizedEmployees.loaders.map(emp => emp.id)
        });
        
        const data = result.data;
        
        if (data.success) {
          toast.success(data.message);
          console.log('Loaders attendance calculation results:', data.results);
          
          // Refresh attendance data to show updated results
          await fetchAttendanceData();
        } else {
          throw new Error(data.message || 'Failed to calculate attendance');
        }
        
      } else {
        toast.error('Invalid tab for calculation');
      }
      
    } catch (error) {
      console.error('Error calculating attendance:', error);
      toast.error(`Failed to calculate attendance: ${error.message}`);
    } finally {
      setCalculating(false);
    }
  };

  // Handle individual employee selection
  const handleIndividualEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setShowIndividualModal(true);
  };

  // Handle staff attendance toggle
  const handleStaffAttendanceToggle = (employeeId, day) => {
    // Mock implementation - in real app, this would update Firebase
    console.log(`Toggle attendance for ${employeeId} on day ${day}`);
  };

  // Handle bulk actions
  const handleBulkMarkPresent = () => {
    toast.success('All employees marked as present for today');
  };

  const handleBulkMarkAbsent = () => {
    toast.success('All employees marked as absent for today');
  };

  // Render staff attendance grid
  const renderStaffAttendanceGrid = () => {
    const { daysInMonth } = currentMonthDetails;
    
    return (
      <div className="overflow-x-auto" style={{ padding: '1rem 0' }}>
        <table className="min-w-full attendance-grid">
          <thead>
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider border-r" style={{ color: '#f5f5f7', borderColor: 'rgba(255,255,255,0.08)' }}>
                Date
              </th>
              {filteredEmployees.map(employee => (
                <th key={employee.id} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider border-r" style={{ color: '#f5f5f7', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="font-semibold" style={{ color: '#f5f5f7' }}>{employee.name}</div>
                    <div className="text-xs" style={{ color: '#f5f5f7' }}>{employee.labourID || employee.id}</div>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#f5f5f7' }}>
                Total Present
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayAttendance = filteredEmployees.reduce((acc, emp) => {
                acc[emp.id] = mockIndividualAttendance[emp.id]?.[day] || false;
                return acc;
              }, {});
              const dayPresentCount = Object.values(dayAttendance).filter(Boolean).length;
              
              return (
                <tr key={day} className="hover:bg-opacity-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <td className="px-4 py-3 text-center text-sm font-medium border-r" style={{ color: '#f5f5f7', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="font-semibold">{day}</div>
                  </td>
                  {filteredEmployees.map(employee => (
                    <td key={employee.id} className="px-4 py-3 text-center border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <input
                        type="checkbox"
                        checked={dayAttendance[employee.id] || false}
                        onChange={() => handleStaffAttendanceToggle(employee.id, day)}
                        className="w-4 h-4 rounded focus:ring-2"
                        style={{
                          color: '#0A84FF',
                          backgroundColor: 'rgba(44,44,46,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm font-medium">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(10,132,255,0.2)', color: '#0A84FF' }}>
                      {dayPresentCount}/{filteredEmployees.length}
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* Summary row showing total present days per employee */}
            <tr className="border-t-2" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
              <td className="px-4 py-3 text-center text-sm font-bold border-r" style={{ color: '#f5f5f7', borderColor: 'rgba(255,255,255,0.08)' }}>
                Total
              </td>
              {filteredEmployees.map(employee => {
                const attendance = mockIndividualAttendance[employee.id] || {};
                const presentCount = Object.values(attendance).filter(Boolean).length;
                
                return (
                  <td key={employee.id} className="px-4 py-3 text-center text-sm font-medium border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(10,132,255,0.2)', color: '#0A84FF' }}>
                      {presentCount}/{daysInMonth}
                    </span>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: '#f5f5f7' }}>
                -/
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render auto-calculated attendance
  const renderAutoCalculatedAttendance = () => {
    return (
      <div className="space-y-4">
        {filteredEmployees.map((employee) => {
          // Get real attendance data from ATTENDANCE collection
          const attendanceRecord = attendanceData[employee.id];
          const attendance = attendanceRecord ? {
            totalPresent: attendanceRecord.summary?.totalPresent || 0,
            totalDays: attendanceRecord.summary?.totalDays || 31,
            percentage: attendanceRecord.summary?.percentage || 0,
            isAutoCalculated: attendanceRecord.calculationMethod !== 'manual',
            calculatedAt: attendanceRecord.calculatedAt,
            sourceData: attendanceRecord.sourceData
          } : {
            totalPresent: 0,
            totalDays: currentMonthDetails.daysInMonth,
            percentage: 0,
            isAutoCalculated: true,
            calculatedAt: null,
            sourceData: null
          };
          
          return (
            <Card key={employee.id} className="p-4" style={{ backgroundColor: 'rgba(28,28,30,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ color: '#f5f5f7' }}>{employee.name}</h3>
                  <p className="text-sm" style={{ color: '#9ba3ae' }}>{employee.labourID || employee.id}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#0A84FF' }}>{attendance.totalPresent}</div>
                    <div className="text-xs" style={{ color: '#9ba3ae' }}>Days Present</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#f5f5f7' }}>{attendance.totalDays}</div>
                    <div className="text-xs" style={{ color: '#9ba3ae' }}>Total Days</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#30D158' }}>{attendance.percentage}%</div>
                    <div className="text-xs" style={{ color: '#9ba3ae' }}>Attendance</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                      backgroundColor: attendance.isAutoCalculated ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.1)',
                      color: attendance.isAutoCalculated ? '#0A84FF' : '#f5f5f7'
                    }}>
                      {attendance.calculatedAt ? 'Calculated' : 'Not Calculated'}
                    </span>
                    
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIndividualEmployeeSelect(employee)}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1" style={{ color: '#9ba3ae' }}>
                  <span>Attendance Progress</span>
                  <span>{attendance.percentage}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${attendance.percentage}%`, backgroundColor: '#0A84FF' }}
                  ></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  // Render individual employee modal
  const renderIndividualEmployeeModal = () => {
    if (!selectedEmployee) return null;
    
    const { daysInMonth } = currentMonthDetails;
    const attendance = mockIndividualAttendance[selectedEmployee.id] || {};
    
    return (
      <Modal
        isOpen={showIndividualModal}
        onClose={() => setShowIndividualModal(false)}
        title={`${selectedEmployee.name} - ${currentMonthDetails.monthName}`}
        className="max-w-6xl"
        draggable={false}
      >
        <div className="space-y-4">
          {/* Employee Info */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: '#f5f5f7' }}>{selectedEmployee.name}</h3>
                <p className="text-sm" style={{ color: '#9ba3ae' }}>{selectedEmployee.id}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: '#0A84FF' }}>
                  {Object.values(attendance).filter(Boolean).length}/{daysInMonth}
                </div>
                <div className="text-sm" style={{ color: '#9ba3ae' }}>Days Present</div>
              </div>
            </div>
          </div>
          
          {/* Attendance Grid */}
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-lg" style={{ backgroundColor: 'rgba(28,28,30,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <thead style={{ backgroundColor: 'rgba(44,44,46,0.8)' }}>
                <tr>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider border-r" style={{ color: '#f5f5f7', borderColor: 'rgba(255,255,255,0.08)' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <td key={day} className="px-3 py-2 text-center border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <input
                        type="checkbox"
                        checked={attendance[day] || false}
                        onChange={() => handleStaffAttendanceToggle(selectedEmployee.id, day)}
                        className="w-4 h-4 rounded focus:ring-2"
                        style={{
                          color: '#0A84FF',
                          backgroundColor: 'rgba(44,44,46,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm" style={{ color: '#9ba3ae' }}>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(48,209,88,0.2)', border: '1px solid rgba(48,209,88,0.3)' }}></div>
              <span style={{ color: '#f5f5f7' }}>Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(255,59,48,0.2)', border: '1px solid rgba(255,59,48,0.3)' }}></div>
              <span style={{ color: '#f5f5f7' }}>Absent</span>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'staff') {
      return renderStaffAttendanceGrid();
    } else {
      return renderAutoCalculatedAttendance();
    }
  };

  return (
    <DieselPage>
      <PageHeader
        title="Attendance Management"
        onBack={onBack}
      />

      {/* Filters */}
      <Card className="card-surface" style={{ padding: '1.5rem 2rem', marginTop: '2rem', marginBottom: '1.5rem', marginLeft: '2rem', marginRight: '2rem' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Month Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium" style={{ color: '#f5f5f7' }}>Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: 'rgba(44,44,46,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f5f7'
                }}
              />
            </div>
            
            {/* Search */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium" style={{ color: '#f5f5f7' }}>Search:</label>
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                style={{
                  background: 'rgba(44,44,46,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f5f7'
                }}
              />
            </div>
          </div>
          
          {/* Current Month Display */}
          <div className="text-right">
            <div className="text-lg font-semibold" style={{ color: '#f5f5f7' }}>
              {currentMonthDetails.monthName}
            </div>
            <div className="text-sm" style={{ color: '#9ba3ae' }}>
              {currentMonthDetails.daysInMonth} days
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex p-1 rounded-lg" style={{ backgroundColor: 'rgba(44,44,46,0.8)' }}>
          {[
            { id: 'staff', label: 'Staff', icon: '👥' },
            { id: 'drivers', label: 'Drivers', icon: '🚛' },
            { id: 'loaders', label: 'Loaders', icon: '📦' },
            { id: 'production', label: 'Production', icon: '🏭' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'shadow-sm'
                  : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(10,132,255,0.2)' : 'transparent',
                color: activeTab === tab.id ? '#f5f5f7' : '#f5f5f7',
                border: activeTab === tab.id ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.target.style.color = '#f5f5f7';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#9ba3ae';
                }
              }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`} style={{
                backgroundColor: activeTab === tab.id ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.1)',
                color: activeTab === tab.id ? '#0A84FF' : '#9ba3ae'
              }}>
                {categorizedEmployees[tab.id]?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Card className="card-surface" style={{ padding: '1.5rem', marginLeft: '2rem', marginRight: '2rem' }}>
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {activeTab === 'staff' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkMarkPresent}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkMarkAbsent}
                >
                  Mark All Absent
                </Button>
              </>
            )}
            {(activeTab === 'drivers' || activeTab === 'loaders' || activeTab === 'production') && (
              <Button
                onClick={handleCalculateAttendance}
                disabled={calculating}
                loading={calculating}
              >
                {calculating ? 'Calculating...' : 'Calculate Attendance'}
              </Button>
            )}
          </div>
          
          {/* Last Calculated Date */}
          {(activeTab === 'drivers' || activeTab === 'loaders' || activeTab === 'production') && (() => {
            const lastCalculated = Object.values(attendanceData)
              .map(att => att.calculatedAt)
              .filter(Boolean)
              .sort((a, b) => b.toMillis() - a.toMillis())[0];
            
            if (lastCalculated) {
              const date = lastCalculated.toDate();
              const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return (
                <div className="text-sm" style={{ color: '#9ba3ae' }}>
                  Last calculated: {formattedDate}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {loading || employeesLoading || attendanceLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
            <span className="ml-3" style={{ color: '#f5f5f7' }}>
              {employeesLoading ? 'Loading employees...' : 
               attendanceLoading ? 'Loading attendance...' : 'Loading...'}
            </span>
          </div>
        ) : (
          renderTabContent()
        )}
      </Card>

      {/* Individual Employee Modal */}
      {renderIndividualEmployeeModal()}
    </DieselPage>
  );
};

export default Attendance;
