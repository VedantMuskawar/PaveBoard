import { EmployeeService } from '../services/employeeService';

export const seedEmployeeData = async (orgID, createdBy) => {
  try {
    console.log('🌱 Starting employee seed data creation...');

    // Sample employees data (Labour IDs will be auto-generated)
    const employeesData = [
      {
        name: 'Rajesh Kumar',
        employeeTags: ['manager', 'supervisor'],
        salaryTags: ['fixed'],
        salaryValue: 25000,
        bonusEligible: true,
        openingBalance: 5000,
        isActive: true,
        dateJoined: new Date('2023-01-15')
      },
      {
        name: 'Suresh Singh',
        employeeTags: ['driver'],
        salaryTags: ['fixed'],
        salaryValue: 18000,
        bonusEligible: true,
        openingBalance: 2000,
        isActive: true,
        dateJoined: new Date('2023-02-01')
      },
      {
        name: 'Amit Sharma',
        employeeTags: ['loader', 'helper'],
        salaryTags: ['fixed'],
        salaryValue: 15000,
        bonusEligible: false,
        openingBalance: 1000,
        isActive: true,
        dateJoined: new Date('2023-02-15')
      },
      {
        name: 'Vikram Patel',
        employeeTags: ['production', 'operator'],
        salaryTags: ['fixed'],
        salaryValue: 20000,
        bonusEligible: true,
        openingBalance: 3000,
        isActive: true,
        dateJoined: new Date('2023-03-01')
      },
      {
        name: 'Deepak Yadav',
        employeeTags: ['driver'],
        salaryTags: ['fixed'],
        salaryValue: 18000,
        bonusEligible: true,
        openingBalance: 1500,
        isActive: true,
        dateJoined: new Date('2023-03-15')
      },
      {
        name: 'Manoj Gupta',
        employeeTags: ['maintenance', 'helper'],
        salaryTags: ['fixed'],
        salaryValue: 16000,
        bonusEligible: false,
        openingBalance: 800,
        isActive: true,
        dateJoined: new Date('2023-04-01')
      },
      {
        name: 'Ravi Verma',
        employeeTags: ['production'],
        salaryTags: ['fixed'],
        salaryValue: 17000,
        bonusEligible: true,
        openingBalance: 1200,
        isActive: false,
        dateJoined: new Date('2023-04-15')
      }
    ];

    // Create employees
    const createdEmployees = [];
    for (const employeeData of employeesData) {
      try {
        // Generate unique Labour ID for each employee
        let labourID = '';
        let attempts = 0;
        
        do {
          const randomNum = Math.floor(Math.random() * 9000) + 1000;
          labourID = `EMP${randomNum}`;
          attempts++;
          
          if (attempts > 10) {
            // Fallback to timestamp-based ID
            labourID = `EMP${Date.now().toString().slice(-6)}`;
            break;
          }
        } while (!(await EmployeeService.validateLabourID(orgID, labourID)));
        
        const employeeWithID = { ...employeeData, labourID };
        const employeeId = await EmployeeService.createEmployee(employeeWithID, orgID, createdBy);
        createdEmployees.push({ id: employeeId, ...employeeWithID });
        console.log(`✅ Created employee: ${employeeData.name} (${labourID})`);
      } catch (error) {
        console.error(`❌ Failed to create employee ${employeeData.name}:`, error);
      }
    }

    // Create a combined account for some employees
    if (createdEmployees.length >= 3) {
      try {
        const accountData = {
          name: 'Production Team',
          memberIds: createdEmployees.slice(1, 4).map(emp => emp.id), // Take 3 employees
          splitRule: {
            type: 'equal'
          }
        };

        const accountId = await EmployeeService.createAccountWithMembers(accountData, orgID, createdBy);
        console.log(`✅ Created combined account: ${accountData.name} with ${accountData.memberIds.length} members`);
      } catch (error) {
        console.error('❌ Failed to create combined account:', error);
      }
    }

    console.log('🌱 Employee seed data creation completed!');
    return createdEmployees;

  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    throw error;
  }
};

export const clearEmployeeData = async (orgID) => {
  try {
    console.log('🧹 Clearing employee data...');
    
    // Note: In a real implementation, you would need to:
    // 1. Delete all wage entries for employees in this org
    // 2. Delete all employee accounts
    // 3. Delete all employees
    
    // For now, we'll just log what would be deleted
    const employees = await EmployeeService.getEmployees(orgID);
    const accounts = await EmployeeService.getAccounts(orgID);
    
    console.log(`Would delete ${employees.length} employees and ${accounts.length} accounts`);
    console.log('🧹 Employee data clearing completed!');
    
  } catch (error) {
    console.error('❌ Error clearing employee data:', error);
    throw error;
  }
};

// Helper function to check if seed data exists
export const checkSeedDataExists = async (orgID) => {
  try {
    const employees = await EmployeeService.getEmployees(orgID);
    const accounts = await EmployeeService.getAccounts(orgID);
    
    return {
      hasEmployees: employees.length > 0,
      hasAccounts: accounts.length > 0,
      employeeCount: employees.length,
      accountCount: accounts.length
    };
  } catch (error) {
    console.error('❌ Error checking seed data:', error);
    return {
      hasEmployees: false,
      hasAccounts: false,
      employeeCount: 0,
      accountCount: 0
    };
  }
};
