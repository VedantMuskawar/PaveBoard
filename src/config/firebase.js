// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC5py4mYQHHU9LcLkqAiqlJTDLABBv2prw",
  authDomain: "apex-21cd0.firebaseapp.com",
  projectId: "apex-21cd0",
  storageBucket: "apex-21cd0.appspot.com",
  messagingSenderId: "721027563365",
  appId: "1:721027563365:web:f9c0f392843210b284ab8c",
  measurementId: "G-97KLM21ES6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);


// Initialize Storage
export const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Firebase offline persistence enabled');
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('⚠️ The current browser does not support all of the features required to enable persistence');
    } else {
      console.error('❌ Failed to enable Firebase persistence:', err);
    }
  });

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
