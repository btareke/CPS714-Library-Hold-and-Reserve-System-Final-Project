// src/services/remoteSyncService.js
// Syncs data from Project 2 (catalog) and Project 4 (users) into your local Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db as localDb } from '../firebase-config';

// ============================================
// REMOTE FIREBASE CONFIGURATIONS
// ============================================

// Project 4 - User Dashboard Firebase
const project4Config = {
  apiKey: "AIzaSyA5Q_MVI7W1F58N9cKyDuSmFVsW3QlSTt8",
  authDomain: "cps714-group-3-subproject-4.firebaseapp.com",
  databaseURL: "https://cps714-group-3-subproject-4-default-rtdb.firebaseio.com",
  projectId: "cps714-group-3-subproject-4",
  storageBucket: "cps714-group-3-subproject-4.firebasestorage.app",
  messagingSenderId: "989632490584",
  appId: "1:989632490584:web:4f79336c85fd314d272e2d"
};

// Project 2 - Catalog System Firebase
// TODO: Get this from Project 2 team
const project2Config = {
  apiKey: "YOUR_PROJECT2_API_KEY",
  authDomain: "your-project2.firebaseapp.com",
  projectId: "your-project2",
  storageBucket: "your-project2.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

// Initialize remote Firebase apps
const project4App = initializeApp(project4Config, 'project4');
const project4Db = getFirestore(project4App);

// Uncomment when you get Project 2 credentials
// const project2App = initializeApp(project2Config, 'project2');
// const project2Db = getFirestore(project2App);

// Temporary: Use mock data until Project 2 is ready
const project2Db = null;

// ============================================
// USER DATA SYNC (from Project 4)
// ============================================

export async function syncUserProfile(userId) {
  try {
    const userRef = doc(project4Db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('User not found in Project 4');
      return { success: false, error: 'User not found' };
    }
    
    const userData = userSnap.data();
    
    await setDoc(doc(localDb, 'cached_users', userId), {
      ...userData,
      lastSynced: new Date(),
      source: 'project4'
    });
    
    console.log('User profile synced:', userId);
    return { success: true, data: userData };
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserProfile(userId) {
  try {
    const cachedRef = doc(localDb, 'cached_users', userId);
    const cachedSnap = await getDoc(cachedRef);
    
    if (cachedSnap.exists()) {
      const cached = cachedSnap.data();
      const hoursSinceSync = (new Date() - cached.lastSynced.toDate()) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 1) {
        return { success: true, data: cached, fromCache: true };
      }
    }
    
    return await syncUserProfile(userId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
}

export async function syncUserLoans(userId) {
  try {
    const loansQuery = query(
      collection(project4Db, 'loans'), 
      where('userId', '==', userId)
    );
    const loansSnap = await getDocs(loansQuery);
    
    const loans = loansSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    await setDoc(doc(localDb, 'cached_loans', userId), {
      loans,
      lastSynced: new Date(),
      source: 'project4'
    });
    
    console.log('User loans synced:', userId, loans.length);
    return { success: true, data: loans };
  } catch (error) {
    console.error('Error syncing user loans:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CATALOG DATA SYNC (from Project 2)
// ============================================

export async function syncCatalogItem(itemId) {
  try {
    // TODO: Enable when Project 2 credentials are available
    if (!project2Db) {
      console.warn('Project 2 not configured, using mock data');
      return { success: false, error: 'Project 2 catalog not configured yet' };
    }
    
    const itemRef = doc(project2Db, 'catalog_items', itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      console.error('Item not found in Project 2 catalog');
      return { success: false, error: 'Item not found' };
    }
    
    const itemData = itemSnap.data();
    
    await setDoc(doc(localDb, 'cached_catalog', itemId), {
      ...itemData,
      lastSynced: new Date(),
      source: 'project2'
    });
    
    console.log('Catalog item synced:', itemId);
    return { success: true, data: itemData };
  } catch (error) {
    console.error('Error syncing catalog item:', error);
    return { success: false, error: error.message };
  }
}

export async function checkItemAvailability(itemId) {
  try {
    const cachedRef = doc(localDb, 'cached_catalog', itemId);
    const cachedSnap = await getDoc(cachedRef);
    
    if (cachedSnap.exists()) {
      const cached = cachedSnap.data();
      const minutesSinceSync = (new Date() - cached.lastSynced.toDate()) / (1000 * 60);
      
      if (minutesSinceSync < 5) {
        return {
          success: true,
          available: cached.status === 'available',
          status: cached.status,
          fromCache: true
        };
      }
    }
    
    const result = await syncCatalogItem(itemId);
    if (result.success) {
      return {
        success: true,
        available: result.data.status === 'available',
        status: result.data.status,
        fromCache: false
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error checking item availability:', error);
    return { success: false, error: error.message };
  }
}

export async function syncEntireCatalog() {
  try {
    if (!project2Db) {
      console.warn('Project 2 not configured yet');
      return { success: false, error: 'Project 2 catalog not configured yet' };
    }
    
    const catalogSnap = await getDocs(collection(project2Db, 'catalog_items'));
    
    const items = [];
    for (const docSnap of catalogSnap.docs) {
      const itemData = {
        ...docSnap.data(),
        lastSynced: new Date(),
        source: 'project2'
      };
      
      await setDoc(doc(localDb, 'cached_catalog', docSnap.id), itemData);
      items.push({ id: docSnap.id, ...itemData });
    }
    
    console.log('Entire catalog synced:', items.length, 'items');
    return { success: true, count: items.length };
  } catch (error) {
    console.error('Error syncing entire catalog:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VALIDATION & BUSINESS LOGIC
// ============================================

export async function validateHoldRequest(userId, itemId) {
  try {
    // Check item availability
    const availability = await checkItemAvailability(itemId);
    if (!availability.success) {
      // If Project 2 not configured, allow hold for testing
      console.warn('Could not validate availability, allowing for testing');
    } else if (availability.available) {
      return { valid: false, reason: 'Item is available - use reservation instead' };
    }
    
    // Check if user already has a hold
    const existingHoldsQuery = query(
      collection(localDb, 'holds'),
      where('userId', '==', userId),
      where('itemId', '==', itemId)
    );
    const existingHolds = await getDocs(existingHoldsQuery);
    
    if (!existingHolds.empty) {
      return { valid: false, reason: 'You already have a hold on this item' };
    }
    
    // Check if user has borrowed this item
    const userLoans = await syncUserLoans(userId);
    if (userLoans.success) {
      const hasBorrowed = userLoans.data.some(
        loan => loan.itemId === itemId && loan.status === 'BORROWED'
      );
      if (hasBorrowed) {
        return { valid: false, reason: 'You currently have this item checked out' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating hold request:', error);
    return { valid: false, reason: error.message };
  }
}

export async function validateReservationRequest(userId, itemId) {
  try {
    // Check item availability
    const availability = await checkItemAvailability(itemId);
    if (!availability.success) {
      console.warn('Could not validate availability, allowing for testing');
    } else if (!availability.available) {
      return { valid: false, reason: 'Item is checked out - use hold instead' };
    }
    
    // Check if user already has a reservation
    const existingResQuery = query(
      collection(localDb, 'reservations'),
      where('userId', '==', userId),
      where('itemId', '==', itemId),
      where('status', '==', 'active')
    );
    const existingRes = await getDocs(existingResQuery);
    
    if (!existingRes.empty) {
      return { valid: false, reason: 'You already have a reservation for this item' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating reservation request:', error);
    return { valid: false, reason: error.message };
  }
}

// ============================================
// PERIODIC SYNC
// ============================================

export async function syncActiveHolds() {
  try {
    const holdsSnap = await getDocs(collection(localDb, 'holds'));
    const uniqueItemIds = [...new Set(holdsSnap.docs.map(d => d.data().itemId))];
    
    console.log('Syncing availability for', uniqueItemIds.length, 'items with holds');
    
    for (const itemId of uniqueItemIds) {
      await syncCatalogItem(itemId);
    }
    
    return { success: true, itemCount: uniqueItemIds.length };
  } catch (error) {
    console.error('Error syncing active holds:', error);
    return { success: false, error: error.message };
  }
}