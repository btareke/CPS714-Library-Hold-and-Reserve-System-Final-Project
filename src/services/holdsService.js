// src/services/holdsService.js
// Core holds and reservations management

import { db } from '../firebase-config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  runTransaction 
} from 'firebase/firestore';
import { 
  validateHoldRequest, 
  validateReservationRequest,
  getUserProfile 
} from './remoteSyncService';

// ============================================
// HOLDS MANAGEMENT
// ============================================

export async function placeHold(userId, itemId) {
  try {
    // Input validation
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return { success: false, error: userIdValidation.error };
    }
    
    const itemIdValidation = validateItemId(itemId);
    if (!itemIdValidation.valid) {
      return { success: false, error: itemIdValidation.error };
    }
    
    const validation = await validateHoldRequest(userId, itemId);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }
    
    // Read current holds to determine next position
    const holds = await getItemHolds(itemId);
    const nextPosition = holds.length + 1;
    
    const holdData = {
      userId,
      itemId,
      status: 'waiting',
      position: nextPosition,
      createdAt: Timestamp.now(),
      notified: false
    };

    // Double-check for duplicate before creating (validation already checked, but this is extra safety)
    const existingHoldQuery = query(
      collection(db, 'holds'),
      where('userId', '==', userId),
      where('itemId', '==', itemId)
    );
    const existingSnapshot = await getDocs(existingHoldQuery);
    if (!existingSnapshot.empty) {
      return { success: false, error: 'You already have a hold on this item' };
    }
    
    // Create the hold (validation already ensures no duplicate, so safe to create)
    const newHoldRef = await addDoc(collection(db, 'holds'), holdData);
    
    console.log('Hold placed:', newHoldRef.id);
    return { success: true, holdId: newHoldRef.id, ...holdData };
  } catch (error) {
    console.error('Error placing hold:', error);
    return { success: false, error: error.message };
  }
}

export async function placeReservation(userId, itemId) {
  try {
    // Input validation
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return { success: false, error: userIdValidation.error };
    }
    
    const itemIdValidation = validateItemId(itemId);
    if (!itemIdValidation.valid) {
      return { success: false, error: itemIdValidation.error };
    }
    
    const validation = await validateReservationRequest(userId, itemId);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }
    
    const reservationData = {
      userId,
      itemId,
      status: 'active',
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      createdAt: Timestamp.now()
    };

    const resRef = await addDoc(collection(db, 'reservations'), reservationData);
    
    console.log('Reservation placed:', resRef.id);
    return { success: true, reservationId: resRef.id, ...reservationData };
  } catch (error) {
    console.error('Error placing reservation:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserHolds(userId) {
  try {
    // Input validation
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return { success: false, error: userIdValidation.error };
    }
    
    const holdsCol = collection(db, 'holds');
    const q = query(holdsCol, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const holds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const userProfile = await getUserProfile(userId);
    
    return {
      success: true,
      holds,
      userInfo: userProfile.success ? userProfile.data : null
    };
  } catch (error) {
    console.error('Error fetching user holds:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserReservations(userId) {
  try {
    // Input validation
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.valid) {
      return { success: false, error: userIdValidation.error };
    }
    
    const resCol = collection(db, 'reservations');
    const q = query(resCol, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, reservations };
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    return { success: false, error: error.message };
  }
}

export async function getItemHolds(itemId) {
  try {
    const holdsCol = collection(db, 'holds');
    const q = query(
      holdsCol, 
      where('itemId', '==', itemId),
      orderBy('position', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching item holds:', error);
    return [];
  }
}

export async function cancelHold(holdId) {
  try {
    // Input validation for holdId
    if (!holdId || typeof holdId !== 'string' || holdId.trim().length === 0) {
      return { success: false, error: 'Hold ID must be a non-empty string' };
    }
    
    const holdRef = doc(db, 'holds', holdId);
    
    // Read hold data first to get itemId for reordering
    const holdSnap = await getDoc(holdRef);
    if (!holdSnap.exists()) {
      return { success: false, error: 'Hold not found' };
    }
    
    const itemId = holdSnap.data().itemId;
    
    // Use transaction to atomically delete and verify
    await runTransaction(db, async (transaction) => {
      const holdSnapInTx = await transaction.get(holdRef);
      if (!holdSnapInTx.exists()) {
        throw new Error('Hold not found');
      }
      transaction.delete(holdRef);
    });
    
    // Reorder queue after successful deletion
    await reorderHoldQueue(itemId);
    
    console.log('Hold cancelled:', holdId);
    return { success: true };
  } catch (error) {
    console.error('Error cancelling hold:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelReservation(reservationId) {
  try {
    // Input validation for reservationId
    if (!reservationId || typeof reservationId !== 'string' || reservationId.trim().length === 0) {
      return { success: false, error: 'Reservation ID must be a non-empty string' };
    }
    
    const resRef = doc(db, 'reservations', reservationId);
    await updateDoc(resRef, { status: 'cancelled' });
    
    console.log('Reservation cancelled:', reservationId);
    return { success: true };
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return { success: false, error: error.message };
  }
}

export async function updateHoldStatus(holdId, status, notified = false) {
  try {
    const holdRef = doc(db, 'holds', holdId);
    await updateDoc(holdRef, { status, notified });
    
    console.log('Hold status updated:', holdId, status);
    return { success: true };
  } catch (error) {
    console.error('Error updating hold status:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// INPUT VALIDATION
// ============================================

function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return { valid: false, error: 'User ID must be a non-empty string' };
  }
  if (userId.trim().length === 0) {
    return { valid: false, error: 'User ID cannot be empty or whitespace' };
  }
  if (userId.length > 100) {
    return { valid: false, error: 'User ID is too long (max 100 characters)' };
  }
  // Basic sanitization - allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return { valid: false, error: 'User ID contains invalid characters (only alphanumeric, hyphens, and underscores allowed)' };
  }
  return { valid: true };
}

function validateItemId(itemId) {
  if (!itemId || typeof itemId !== 'string') {
    return { valid: false, error: 'Item ID must be a non-empty string' };
  }
  if (itemId.trim().length === 0) {
    return { valid: false, error: 'Item ID cannot be empty or whitespace' };
  }
  if (itemId.length > 100) {
    return { valid: false, error: 'Item ID is too long (max 100 characters)' };
  }
  // Basic sanitization - allow alphanumeric, hyphens, underscores, and colons (for formats like BK-1001)
  if (!/^[a-zA-Z0-9_:-]+$/.test(itemId)) {
    return { valid: false, error: 'Item ID contains invalid characters' };
  }
  return { valid: true };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function reorderHoldQueue(itemId) {
  const holds = await getItemHolds(itemId);
  
  // Reorder positions starting from 1
  for (let i = 0; i < holds.length; i++) {
    const holdRef = doc(db, 'holds', holds[i].id);
    await updateDoc(holdRef, { position: i + 1 });
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function getAllHolds() {
  try {
    const snapshot = await getDocs(collection(db, 'holds'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching all holds:', error);
    return [];
  }
}

export async function getAllReservations() {
  try {
    const snapshot = await getDocs(collection(db, 'reservations'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching all reservations:', error);
    return [];
  }
}

export async function expireOldReservations() {
  try {
    const resCol = collection(db, 'reservations');
    const snapshot = await getDocs(resCol);
    const now = Timestamp.now();
    
    const expired = [];
    const batchSize = 500; // Firestore batch write limit
    let currentBatch = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.status === 'active' && data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
        currentBatch.push({ id: docSnap.id, ref: docSnap.ref });
        
        // Process in batches to avoid timeout
        if (currentBatch.length >= batchSize) {
          await processExpirationBatch(currentBatch);
          expired.push(...currentBatch.map(b => b.id));
          currentBatch = [];
        }
      }
    }
    
    // Process remaining items
    if (currentBatch.length > 0) {
      await processExpirationBatch(currentBatch);
      expired.push(...currentBatch.map(b => b.id));
    }
    
    console.log('Expired reservations:', expired.length);
    return { success: true, expiredCount: expired.length, expiredIds: expired };
  } catch (error) {
    console.error('Error expiring reservations:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to process expiration batch using transactions
async function processExpirationBatch(batch) {
  // Use transactions for atomic updates
  for (const item of batch) {
    try {
      await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(item.ref);
        if (resSnap.exists() && resSnap.data().status === 'active') {
          transaction.update(item.ref, { status: 'expired' });
        }
      });
    } catch (error) {
      console.error(`Error expiring reservation ${item.id}:`, error);
      // Continue with other items even if one fails
    }
  }
}

// ============================================
// AUTOMATED EXPIRATION JOB
// ============================================

let expirationJobInterval = null;
let expirationJobRunning = false;

/**
 * Start automated expiration job that runs periodically
 * @param {number} intervalMinutes - How often to check for expired reservations (default: 60 minutes)
 * @returns {boolean} - True if job started successfully
 */
export function startExpirationJob(intervalMinutes = 60) {
  if (expirationJobInterval) {
    console.warn('Expiration job is already running');
    return false;
  }
  
  console.log(`Starting automated expiration job (runs every ${intervalMinutes} minutes)`);
  
  // Run immediately on start
  runExpirationJob();
  
  // Then run on interval
  expirationJobInterval = setInterval(() => {
    runExpirationJob();
  }, intervalMinutes * 60 * 1000);
  
  return true;
}

/**
 * Stop the automated expiration job
 */
export function stopExpirationJob() {
  if (expirationJobInterval) {
    clearInterval(expirationJobInterval);
    expirationJobInterval = null;
    console.log('Automated expiration job stopped');
    return true;
  }
  return false;
}

/**
 * Check if expiration job is running
 */
export function isExpirationJobRunning() {
  return expirationJobInterval !== null;
}

/**
 * Internal function to run expiration check
 */
async function runExpirationJob() {
  if (expirationJobRunning) {
    console.log('Expiration job already running, skipping...');
    return;
  }
  
  expirationJobRunning = true;
  try {
    console.log('Running automated expiration job...');
    const result = await expireOldReservations();
    if (result.success) {
      console.log(`Expiration job completed: ${result.expiredCount} reservations expired`);
    } else {
      console.error('Expiration job failed:', result.error);
    }
  } catch (error) {
    console.error('Error in expiration job:', error);
  } finally {
    expirationJobRunning = false;
  }
}