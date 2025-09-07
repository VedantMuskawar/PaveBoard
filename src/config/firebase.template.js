// Firebase Configuration Template
// Copy this file to firebase.js and replace the placeholder values with your actual Firebase project configuration

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Replace these values with your Firebase project configuration
// You can find these in your Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Analytics (optional - only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics not available:', error);
  }
}

export { analytics };
export default app;

/*
INSTRUCTIONS TO SET UP FIREBASE:

1. Go to Firebase Console (https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Phone" provider
   - Add your test phone numbers if needed
4. Get your configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click "Add app" if you haven't already
   - Select "Web" platform
   - Copy the configuration object
5. Replace the placeholder values in firebase.js with your actual config
6. Make sure Phone Authentication is enabled in your Firebase project

SECURITY NOTES:
- The apiKey in the config is safe to expose in client-side code
- Firebase handles security through server-side rules
- Never expose your Firebase service account keys in client code
*/
