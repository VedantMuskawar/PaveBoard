# 🗄️ Database Setup Guide

## Current Database Configuration

### Firebase Firestore Collections
The application uses the following Firebase collections:

1. **VEHICLE_VOUCHERS** - Diesel voucher records
2. **VEHICLES** - Vehicle information
3. **EXPENSE** - Expense tracking
4. **DELIVERY_MEMOS** - Delivery orders
5. **SCH_ORDERS** - Scheduled orders
6. **CANCELLATION_REQUESTS** - Order cancellation requests
7. **MEMBERSHIP** - User membership data

### Firebase Configuration
- **Project ID**: `apex-21cd0`
- **Auth Domain**: `apex-21cd0.firebaseapp.com`
- **Storage Bucket**: `apex-21cd0.appspot.com`

## 🔧 Database Linking Steps

### 1. Verify Firebase Project Access
```bash
# Check if you have access to the Firebase project
firebase projects:list
```

### 2. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 3. Login to Firebase
```bash
firebase login
```

### 4. Initialize Firebase in your project
```bash
firebase init firestore
```

### 5. Set up Firestore Security Rules
Create or update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Organization-based access control
    match /VEHICLE_VOUCHERS/{document} {
      allow read, write: if request.auth != null && 
        resource.data.orgID == request.auth.token.orgID;
    }
    
    match /VEHICLES/{document} {
      allow read, write: if request.auth != null && 
        resource.data.orgID == request.auth.token.orgID;
    }
    
    match /EXPENSE/{document} {
      allow read, write: if request.auth != null && 
        resource.data.orgID == request.auth.token.orgID;
    }
  }
}
```

### 6. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## 🧪 Testing Database Connection

### Manual Test
1. Open the DieselLedger page
2. Click the "🔗 Test DB" button
3. Check browser console for connection status

### Console Test
```javascript
// Run this in browser console
import { testDatabaseConnection } from './src/utils/databaseTest';
testDatabaseConnection();
```

## 📊 Database Structure

### VEHICLE_VOUCHERS Collection
```javascript
{
  voucherNo: number,
  date: Timestamp,
  vehicleNo: string,
  amount: number,
  paid: boolean,
  verified: boolean,
  chequeNo: string,
  orgID: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### VEHICLES Collection
```javascript
{
  vehicleNumber: string,
  status: string, // "Active" | "Inactive"
  orgID: string,
  createdAt: Timestamp
}
```

### EXPENSE Collection
```javascript
{
  amount: number,
  description: string,
  category: string,
  date: Timestamp,
  orgID: string,
  createdAt: Timestamp
}
```

## 🔐 Authentication Setup

### 1. Enable Authentication Methods
In Firebase Console:
1. Go to Authentication > Sign-in method
2. Enable Email/Password
3. Enable Phone authentication (if needed)

### 2. Set up Organization-based Access
```javascript
// In your authentication flow
const user = await createUserWithEmailAndPassword(auth, email, password);
await updateProfile(user, {
  displayName: userName
});

// Set custom claims for organization access
await setCustomUserClaims(user.uid, {
  orgID: organizationId,
  role: userRole // 0 = Admin, 1 = Manager
});
```

## 🚀 Deployment

### 1. Deploy to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firestore security rules
   - Verify user authentication
   - Ensure orgID matches

2. **Collection Not Found**
   - Verify collection names in code
   - Check Firebase project ID
   - Ensure collections exist in Firestore

3. **Network Issues**
   - Check internet connection
   - Verify Firebase project is active
   - Check browser console for errors

### Debug Commands
```bash
# Check Firebase project status
firebase projects:list

# View Firestore data
firebase firestore:get

# Check authentication
firebase auth:export users.json
```

## 📝 Next Steps

1. **Test Connection**: Use the "Test DB" button in DieselLedger
2. **Create Sample Data**: Add test vouchers and vehicles
3. **Verify Security**: Test with different user roles
4. **Monitor Usage**: Check Firebase console for activity

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/project/apex-21cd0)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
