# Integration Guide for Sub-Project 3
## Holds & Reservations System

This document explains how other sub-projects can integrate with the Holds & Reservations system.

---

## 🔥 Our Firebase Configuration

**Project ID:** `cps714sub3`

**Collections we manage:**
- `holds` - Hold requests on checked-out items
- `reservations` - Reservations on available items
- `cached_users` - Synced user data from Project 4
- `cached_catalog` - Synced catalog data from Project 2
- `cached_loans` - Synced loan data from Project 4

---

## 📚 For Project 2 (Catalog System)

### ⚠️ Current Integration Status

**Status:** NOT YET INTEGRATED (Pending Project 2 Firebase Credentials)

**Current Behavior:**
- Project 2 Firebase configuration is not yet configured in `remoteSyncService.js`
- The system currently allows holds/reservations to be placed even when Project 2 validation is unavailable (for testing purposes)
- When Project 2 is unavailable, validation warnings are logged but operations proceed
- This is a **temporary workaround** for development/testing until Project 2 credentials are provided

**Impact:**
- Item availability validation from Project 2 catalog is currently bypassed
- System relies on local validation rules (duplicate checks, user loan checks) only
- Once Project 2 is integrated, full validation will be enforced

**Next Steps:**
1. Obtain Firebase credentials from Project 2 team
2. Update `project2Config` in `src/services/remoteSyncService.js` (lines 24-32)
3. Uncomment Project 2 initialization code (lines 38-40)
4. Test integration with Project 2's `catalog_items` collection
5. Remove testing workaround that allows operations when Project 2 is unavailable

### What We Need From You

**Firebase Configuration:**
```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
}
```

**Collection Name:** `catalog_items`

**Required Fields:**
```javascript
{
  id: "BK-1001",           // Unique item ID
  title: "Book Title",
  author: "Author Name",
  status: "available",     // "available" | "checked_out" | "processing"
  dueDate: "2025-12-01",  // (optional) When item is due back
  category: "Fiction",     // (optional)
  // ... other fields
}
```

### How We Use Your Data

We **sync** your catalog items into our `cached_catalog` collection every 5 minutes for items that have active holds. This allows us to:
- Check if an item is available for reservation
- Check if an item is checked out for holds
- Validate hold/reservation requests

**We only READ from your database - we never write to it.**

---

## 👤 For Project 4 (User Dashboard)

### What We're Already Using ✅

We're already syncing data from your Firebase:
- `users` collection - User profiles
- `loans` collection - Current user loans

### How You Can Read Our Data

**Get holds for a user:**
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const project3Config = {
  apiKey: "AIzaSyD_r8H-QPDaa0gRTWaj8p6i287iLGLr-Dg",
  authDomain: "cps714sub3.firebaseapp.com",
  projectId: "cps714sub3",
  storageBucket: "cps714sub3.firebasestorage.app",
  messagingSenderId: "360758052196",
  appId: "1:360758052196:web:cf10fc3523a3bca3b12671"
};

const project3App = initializeApp(project3Config, 'project3');
const project3Db = getFirestore(project3App);

// Get user's holds
async function getUserHolds(userId) {
  const q = query(
    collection(project3Db, 'holds'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get user's reservations
async function getUserReservations(userId) {
  const q = query(
    collection(project3Db, 'reservations'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Display in Your UI

**Holds:**
```javascript
const holds = await getUserHolds(currentUserId);
holds.forEach(hold => {
  console.log(`Item: ${hold.itemId}`);
  console.log(`Status: ${hold.status}`); // waiting | ready | expired
  console.log(`Position in queue: ${hold.position}`);
});
```

**Reservations:**
```javascript
const reservations = await getUserReservations(currentUserId);
reservations.forEach(res => {
  console.log(`Item: ${res.itemId}`);
  console.log(`Status: ${res.status}`); // active | picked_up | cancelled | expired
  console.log(`Expires: ${res.expiresAt.toDate()}`);
});
```

---

## 🔔 For Project 8 (Notification System)

### What We Provide

Monitor our `holds` collection for status changes:

```javascript
import { onSnapshot, collection, query, where } from 'firebase/firestore';

// Listen for holds that become ready
const q = query(
  collection(project3Db, 'holds'),
  where('status', '==', 'ready'),
  where('notified', '==', false)
);

onSnapshot(q, (snapshot) => {
  snapshot.forEach((doc) => {
    const hold = doc.data();
    
    // Send notification to hold.userId
    sendNotification(hold.userId, {
      title: "Your hold is ready!",
      message: `Item ${hold.itemId} is now available for pickup.`
    });
    
    // Mark as notified
    updateDoc(doc.ref, { notified: true });
  });
});
```

### Status Values

**Hold Status:**
- `waiting` - User is in queue, item still checked out
- `ready` - Item returned, user can pick it up (send notification!)
- `expired` - Hold expired, user didn't pick up

**Reservation Status:**
- `active` - Reservation active, item held for user
- `picked_up` - User picked up the item
- `cancelled` - User cancelled
- `expired` - Reservation expired (7 days)

---

## 📊 Data Schema

### Holds Collection

```javascript
{
  userId: "user1",           // From Project 4
  itemId: "BK-1001",        // From Project 2
  status: "waiting",        // waiting | ready | expired
  position: 2,              // Position in queue (1 = first)
  createdAt: Timestamp,     // When hold was placed
  notified: false          // Has user been notified?
}
```

### Reservations Collection

```javascript
{
  userId: "user1",
  itemId: "BK-5003",
  status: "active",         // active | picked_up | cancelled | expired
  expiresAt: Timestamp,     // Expires 7 days from creation
  createdAt: Timestamp
}
```

---

## 🧪 Testing

### Test Data Available

Our system is configured to work with Project 4's mock data:

**Mock Users:** user1, user2, user3, user4
**Mock Books:** BK-1001, BK-2002, BK-3003, BK-4001, BK-5001, etc.

### Testing Workflow

1. Start our app: `npm start`
2. Use the testing interface at `http://localhost:3000`
3. Place holds/reservations using mock user IDs
4. View results in Firebase console or through API calls

---

## 🚀 API Functions Available

If you want to import our service directly (optional):

```javascript
import {
  placeHold,
  placeReservation,
  getUserHolds,
  getUserReservations,
  cancelHold,
  cancelReservation
} from 'path-to-our-project/services/holdsService';

// Example
const result = await placeHold('user1', 'BK-1001');
if (result.success) {
  console.log('Hold placed!', result.holdId);
}
```

---

## 🤝 Contact & Support

For integration issues or questions:
- Check our Firebase console: https://console.firebase.google.com/project/cps714sub3
- Test with our UI first to understand the workflow
- We validate all requests against Project 2 (availability) and Project 4 (user loans)

---

## 📝 Notes

- We **sync** data from your projects - we don't modify your databases
- All validations happen in our system
- Cache refresh: Users (1 hour), Catalog (5 minutes)
- Reservations expire after 7 days automatically