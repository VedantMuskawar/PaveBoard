import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Collection names - try different variations
const MEMBERS_COLLECTION = 'MEMBERSHIP';
const MEMBERS_COLLECTION_ALT = 'membership';
const MEMBERS_COLLECTION_ALT2 = 'member';
const USERS_COLLECTION = 'USERS';

/**
 * Verify if a phone number exists in the membership collection
 * @param {string} phoneNumber - Phone number to verify (with country code)
 * @returns {Promise<Object|null>} Member data if found, null otherwise
 */
export const verifyMembership = async (phoneNumber) => {
  try {
    console.log('Verifying membership for:', phoneNumber);
    
    // Try different collection names
    const collectionNames = [MEMBERS_COLLECTION, MEMBERS_COLLECTION_ALT, MEMBERS_COLLECTION_ALT2];
    
    for (const collectionName of collectionNames) {
      try {
        console.log('Trying collection:', collectionName);
        
        const membersRef = collection(db, collectionName);
        const q = query(membersRef, where('phoneNumber', '==', phoneNumber));
        
        console.log('Executing query...');
        const querySnapshot = await getDocs(q);
        
        console.log('Query result - empty:', querySnapshot.empty);
        console.log('Query result - size:', querySnapshot.size);
        
        if (!querySnapshot.empty) {
          // Get the first matching member
          const memberDoc = querySnapshot.docs[0];
          const memberData = memberDoc.data();
          
          console.log('Member found in collection:', collectionName, memberData);
          return {
            id: memberDoc.id,
            ...memberData
          };
        }
      } catch (collectionError) {
        console.log('Error with collection:', collectionName, collectionError);
        continue;
      }
    }
    
    // If we get here, no member was found in any collection
    console.log('No member found for phone number:', phoneNumber, 'in any collection');
    
    // Let's try to get all documents from the first collection to debug
    try {
      const membersRef = collection(db, MEMBERS_COLLECTION);
      const allDocs = await getDocs(membersRef);
      console.log('Total documents in collection:', allDocs.size);
      
      // Search manually through all documents
      let foundDoc = null;
      allDocs.forEach((doc) => {
        const data = doc.data();
        
        // Check for nested member structure
        if (data.member && data.member.phoneNumber === phoneNumber) {
          foundDoc = { 
            id: doc.id, 
            ...data,
            // Flatten the member data for easier access
            name: data.member.name,
            phoneNumber: data.member.phoneNumber
          };
          console.log('Found document with nested member structure:', foundDoc);
        }
        // Also check for direct phoneNumber field
        else if (data.phoneNumber === phoneNumber) {
          foundDoc = { id: doc.id, ...data };
          console.log('Found document with direct phoneNumber field:', foundDoc);
        }
      });
      
      if (foundDoc) {
        console.log('Returning manually found document');
        return foundDoc;
      }
      
      // Log first few documents to see the structure
      allDocs.forEach((doc, index) => {
        if (index < 3) {
          const data = doc.data();
          console.log(`Document ${index}:`, {
            id: doc.id,
            phoneNumber: data.phoneNumber,
            memberPhoneNumber: data.member?.phoneNumber,
            name: data.name,
            memberName: data.member?.name
          });
        }
      });
    } catch (debugError) {
      console.log('Debug query failed:', debugError);
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying membership:', error);
    throw new Error('Failed to verify membership');
  }
};

/**
 * Get member details by user ID
 * @param {string} userID - User ID to search for
 * @returns {Promise<Object|null>} Member data if found, null otherwise
 */
export const getMemberByUserID = async (userID) => {
  try {
    // Try different collection names
    const collectionNames = [MEMBERS_COLLECTION, MEMBERS_COLLECTION_ALT, MEMBERS_COLLECTION_ALT2];
    
    for (const collectionName of collectionNames) {
      try {
        const membersRef = collection(db, collectionName);
        const q = query(membersRef, where('userID', '==', userID));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const memberDoc = querySnapshot.docs[0];
          return {
            id: memberDoc.id,
            ...memberDoc.data()
          };
        }
      } catch (collectionError) {
        console.log('Error with collection:', collectionName, collectionError);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting member by user ID:', error);
    throw new Error('Failed to get member details');
  }
};

/**
 * Create or update user record in Firestore
 * @param {Object} userData - User data from Firebase Auth
 * @param {Object} memberData - Member data from membership collection
 * @returns {Promise<string>} Document ID
 */
export const createOrUpdateUser = async (userData, memberData) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    
    // Check if user already exists
    const userQuery = query(usersRef, where('uid', '==', userData.uid));
    const userSnapshot = await getDocs(userQuery);
    
    const userRecord = {
      uid: userData.uid,
      phoneNumber: userData.phoneNumber,
      email: userData.email || null,
      displayName: userData.displayName || memberData?.name || null,
      photoURL: userData.photoURL || null,
      memberID: memberData?.id || null,
      memberData: memberData || null,
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (userSnapshot.empty) {
      // Create new user record
      const docRef = await addDoc(usersRef, userRecord);
      console.log('User created with ID:', docRef.id);
      return docRef.id;
    } else {
      // Update existing user record
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
        ...userRecord,
        createdAt: userDoc.data().createdAt, // Preserve original creation time
        updatedAt: serverTimestamp()
      });
      console.log('User updated with ID:', userDoc.id);
      return userDoc.id;
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw new Error('Failed to save user data');
  }
};

/**
 * Get user record from Firestore
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>} User data if found, null otherwise
 */
export const getUserRecord = async (uid) => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user record:', error);
    throw new Error('Failed to get user data');
  }
};


