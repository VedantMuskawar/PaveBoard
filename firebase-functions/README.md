# PaveBoard Firebase Cloud Functions

This directory contains Firebase Cloud Functions for processing orders and managing vehicle assignments in the PaveBoard system.

## Functions Overview

### 1. `processOrders` (Firestore Trigger)
- **Trigger**: `DEF_ORDERS` collection changes (create, update, delete)
- **Purpose**: Automatically processes orders into the `PENDING_SIMULATION` collection
- **Logic**:
  - On order creation/update with `orderCount > 0`: Creates simulation entries
  - Splits orders into multiple documents if `orderCount > 1`
  - Assigns vehicles based on capacity and availability
  - Calculates delivery dates using weekly capacity schedules
  - On order deletion or `orderCount = 0`: Removes related simulation entries

### 2. `updateVehicleCapacity` (HTTPS Callable)
- **Purpose**: Allows admins to update vehicle weekly capacity
- **Authentication**: Required
- **Parameters**: `vehicleId`, `weeklyCapacity`, `orgID`

### 3. `getSimulationStats` (HTTPS Callable)
- **Purpose**: Returns simulation statistics for dashboard
- **Authentication**: Required
- **Parameters**: `orgID`
- **Returns**: Pending orders count, vehicle utilization data

## Setup Instructions

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project configured
3. Node.js 18+ installed

### Installation
```bash
cd firebase-functions
npm install
```

### Local Development
```bash
# Start Firebase emulators
npm run serve

# Or use Firebase CLI directly
firebase emulators:start --only functions
```

### Deployment
```bash
# Deploy all functions
npm run deploy

# Or use Firebase CLI directly
firebase deploy --only functions
```

## Configuration

### Firestore Security Rules
Ensure your Firestore security rules allow the functions to read/write:

```javascript
// Allow functions to read/write PENDING_SIMULATION
match /PENDING_SIMULATION/{simulationId} {
  allow read, write: if request.auth != null;
}

// Allow functions to read/write VEHICLES
match /VEHICLES/{vehicleId} {
  allow read, write: if request.auth != null;
}

// Allow functions to read DEF_ORDERS
match /DEF_ORDERS/{orderId} {
  allow read: if request.auth != null;
}
```

### Environment Variables
No environment variables are required for basic functionality. The functions use Firebase Admin SDK with default credentials.

## Data Flow

1. **Order Creation**: User creates order in `DEF_ORDERS` collection
2. **Trigger Activation**: `processOrders` function is triggered
3. **Vehicle Assignment**: Function finds suitable vehicle based on capacity
4. **Date Calculation**: Calculates delivery date using weekly capacity
5. **Simulation Entry**: Creates document in `PENDING_SIMULATION` collection
6. **Frontend Update**: Pending Orders page shows real-time updates

## Vehicle Assignment Logic

The system uses the following criteria for vehicle assignment:

1. **Status Check**: Only vehicles with `status = "Active"` are considered
2. **Capacity Check**: Vehicle's `vehicleQuantity` must be >= order's `productQuant`
3. **Round-Robin**: Currently uses random selection from suitable vehicles
4. **Future Enhancement**: Could include workload balancing, distance optimization

## Weekly Capacity System

- **Week Structure**: Thursday → Wednesday (Thu, Fri, Sat, Sun, Mon, Tue, Wed)
- **Capacity Values**: Numbers represent daily delivery capacity
- **Date Calculation**: Finds next available slot with capacity > 0
- **Fallback**: If no capacity found, schedules 4 weeks in advance

## Error Handling

- Functions include comprehensive error logging
- Failed operations are logged but don't crash the function
- In production, consider implementing retry logic and notifications

## Monitoring

Use Firebase Console or CLI to monitor function execution:

```bash
# View function logs
npm run logs

# Or use Firebase CLI
firebase functions:log
```

## Testing

Test functions locally using the Firebase emulator:

```bash
# Start emulators
firebase emulators:start --only functions,firestore

# Test with sample data
# Create test order in Firestore emulator
# Verify function triggers and creates simulation entry
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check Firestore security rules
2. **Function Timeout**: Increase timeout in function configuration
3. **Memory Issues**: Optimize function code or increase memory allocation
4. **Cold Starts**: Consider keeping functions warm with scheduled triggers

### Debug Mode

Enable debug logging by setting environment variable:
```bash
firebase functions:config:set debug.enabled=true
```

## Future Enhancements

1. **Advanced Vehicle Assignment**: Consider distance, driver availability, fuel efficiency
2. **Load Balancing**: Distribute orders evenly across vehicles
3. **Priority System**: Handle urgent orders differently
4. **Notification System**: Alert drivers and managers of assignments
5. **Analytics**: Track vehicle utilization and delivery performance
6. **Machine Learning**: Predict optimal delivery routes and times
