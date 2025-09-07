# PaveBoard Web

A modern, offline-first web application for user management built with React, Vite, Firebase Auth, and IndexedDB.

## Features

- **Firebase Phone Authentication**: Secure phone number login with OTP verification
- **Organization Selection**: Multi-organization support with role-based access
- **Membership Verification**: Validates users against existing MEMBERSHIP collection
- **Offline-First**: All data is stored locally in IndexedDB using Dexie.js
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **CRUD Operations**: Add, edit, delete, and view user data (requires authentication)
- **Fast Performance**: Built with Vite for optimal development and build times
- **Future-Ready**: Designed for easy Firebase Firestore integration and PWA capabilities

## Tech Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth (Phone Number)
- **Cloud Database**: Firebase Firestore (Membership verification)
- **Local Database**: IndexedDB with Dexie.js
- **Data Export**: Excel file support (xlsx)
- **Future**: Full Firestore sync planned

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Firebase project with Phone Authentication enabled

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Set up Firebase Authentication:**
   
   **Option A: Use the provided config (for testing)**
   - The app comes with a test Firebase configuration
   - You can use it for development, but it's limited to specific phone numbers
   
   **Option B: Use your own Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Phone Authentication:
     - Go to Authentication > Sign-in method
     - Enable "Phone" provider
     - Add your test phone numbers if needed
   - Get your configuration:
     - Go to Project Settings > General
     - Scroll down to "Your apps"
     - Click "Add app" if you haven't already
     - Select "Web" platform
     - Copy the configuration object
   - Replace the values in `src/config/firebase.js` with your actual config

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Authentication Flow

1. **Phone Number Input**: User enters their phone number
2. **OTP Verification**: Firebase sends a 6-digit code via SMS
3. **Authentication**: User enters the code to complete sign-in
4. **Organization Selection**: User manually selects from available organizations
5. **Home Dashboard**: User accesses organization-specific features
6. **Data Access**: User can now manage their user data

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   │   ├── Button.jsx, Card.jsx, Modal.jsx, etc.
│   │   └── index.js    # Component exports
│   ├── AppContent.jsx  # Main app content wrapper
│   ├── OrganizationSelector.jsx # Organization selection component
│   ├── PhoneAuth.jsx   # Phone authentication component
│   ├── UserForm.jsx    # Form for adding/editing users
│   ├── UserList.jsx    # List display component
│   └── UserProfile.jsx # User profile display
├── config/
│   ├── firebase.js     # Firebase configuration
│   └── firebase.template.js # Template for Firebase setup
├── contexts/
│   └── OrganizationContext.jsx # Organization context provider
├── db/
│   └── database.js     # Dexie.js database configuration
├── hooks/
│   ├── useUserData.js  # Custom hook for user data management
│   └── useAuth.js      # Custom hook for Firebase authentication
├── pages/              # Page components
│   ├── order/
│   │   ├── OrdersDashboard.jsx
│   │   └── OrdersDashboard.css
│   ├── Home.jsx        # Home page component
│   └── Home.css        # Home page styles
├── services/
│   └── membershipService.js # Membership service functions
├── App.jsx             # Main application component
├── main.jsx           # Application entry point
└── index.css          # Tailwind CSS styles
```

## Database Schema

The application uses IndexedDB with the following schema:

- **Table**: `userData`
- **Fields**:
  - `id` (auto-increment)
  - `name` (string)
  - `email` (string)
  - `lastUpdated` (Date)

## Firebase Configuration

The app includes a test Firebase configuration for development. For production:

1. Create your own Firebase project
2. Enable Phone Authentication
3. Replace the config values in `src/config/firebase.js`
4. Add your domain to authorized domains in Firebase Console

## Security Notes

- The Firebase `apiKey` in the config is safe to expose in client-side code
- Firebase handles security through server-side rules
- Never expose your Firebase service account keys in client code
- Phone authentication requires reCAPTCHA verification

## Future Enhancements

- Firebase Firestore integration for cloud sync
- Progressive Web App (PWA) capabilities
- Real-time collaboration features
- Advanced search and filtering
- Data export/import functionality
- Email authentication option
- Social login providers
