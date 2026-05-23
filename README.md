# Sub-Project 3: Item Reservation & Hold System

A Firebase-based holds and reservations management system that integrates with the Library Management System catalog (Project 2) and user dashboard (Project 4).

## Project Overview

This sub-project manages:
- **Holds** - Queue system for checked-out items
- **Reservations** - Booking system for available items
- **Data Synchronization** - Pulls catalog and user data from other sub-projects
- **Validation** - Ensures business rules are followed

## Architecture

```
Project 2 (Catalog) → [Sync] → Our System ← [Sync] ← Project 4 (Users)
                                    ↓
                        Holds & Reservations Logic
                                    ↓
                    Firebase (cps714sub3) Storage
```

### Data Flow
1. **Sync catalog data** from Project 2 (item availability)
2. **Sync user data** from Project 4 (profiles, current loans)
3. **Process requests** locally with validation
4. **Store holds/reservations** in our Firebase
5. **Expose data** for other projects to read

## Getting Started

### Prerequisites
- Node.js v14+
- npm or yarn
- Firebase account (already configured)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open http://localhost:3000

## Project Structure

```
src/
├── services/
│   ├── holdsService.js        # Core holds/reservations logic
│   └── remoteSyncService.js   # Sync from Project 2 & 4
├── firebase-config.js         # Our Firebase configuration
├── App.js                     # Testing interface
├── App.css                    # Styling
├── index.js                   # Entry point
└── index.css                  # Global styles
```

## Firebase Collections

Our system manages these collections:

### `holds`
```javascript
{
  userId: "user1",        // From Project 4
  itemId: "BK-1001",     // From Project 2
  status: "waiting",     // waiting | ready | expired
  position: 1,           // Queue position
  createdAt: Timestamp,
  notified: false       // For Project 8 notifications
}
```

### `reservations`
```javascript
{
  userId: "user1",
  itemId: "BK-5003",
  status: "active",      // active | picked_up | cancelled | expired
  expiresAt: Timestamp,  // 7 days from creation
  createdAt: Timestamp
}
```

### `cached_users` (synced from Project 4)
User profiles cached for validation

### `cached_catalog` (synced from Project 2)
Catalog items cached for availability checking

### `cached_loans` (synced from Project 4)
Current user loans cached for validation

## Integration

### For Project 2 (Catalog System)
We need your Firebase credentials to sync catalog data. See `INTEGRATION.md` for details.

### For Project 4 (User Dashboard)
Already integrated! We read your `users` and `loans` collections. You can read our `holds` and `reservations` collections to display in your UI.

### For Project 8 (Notifications)
Monitor our `holds` collection for status changes from `waiting` to `ready` to trigger notifications.

## Testing

### Using the Test Interface

1. Start the app: `npm start`
2. Use mock data from Project 4:
   - **Users:** user1, user2, user3, user4
   - **Books:** BK-1001, BK-2002, BK-3003, etc.

### Example Test Cases

**Place a Hold:**
- User ID: `user1`
- Item ID: `BK-1001`
- Click "Place Hold"
- Should succeed if item is checked out

**Place a Reservation:**
- User ID: `user2`
- Item ID: `BK-5003`
- Click "Place Reservation"
- Should succeed if item is available

**View User Holds:**
- User ID: `user1`
- Click "Get User Holds"
- Should show all holds for user1

## API Functions

### Core Operations

```javascript
import { 
  placeHold, 
  placeReservation,
  getUserHolds,
  getUserReservations,
  cancelHold,
  cancelReservation
} from './services/holdsService';

// Place a hold
const result = await placeHold('user1', 'BK-1001');

// Get user's holds
const { holds } = await getUserHolds('user1');

// Cancel a hold
await cancelHold('holdId');
```

### Validation Functions

```javascript
import { 
  validateHoldRequest,
  validateReservationRequest
} from './services/remoteSyncService';

// Check if hold is valid
const validation = await validateHoldRequest('user1', 'BK-1001');
if (validation.valid) {
  // Proceed with hold
}
```

## Business Rules

### Hold Rules
1. Item must be checked out (not available)
2. User cannot hold an item they currently have borrowed
3. User cannot have multiple holds on same item
4. Users are added to queue in order (FIFO)

### Reservation Rules
1. Item must be available (not checked out)
2. User cannot have multiple active reservations for same item
3. Reservations expire after 7 days
4. Only one reservation per item at a time

## Data Validation

All requests are validated against:
- **Project 2 Catalog** - Item availability status
- **Project 4 Loans** - User's current borrowed items
- **Our Database** - Existing holds/reservations

## Sync Schedule

- **User Profiles:** Cached for 1 hour
- **Catalog Items:** Cached for 5 minutes
- **User Loans:** Fetched on demand

## Troubleshooting

### "Project 2 not configured yet"
- Need Firebase credentials from Project 2 team
- Update `remoteSyncService.js` with their config

### "User not found"
- Make sure Project 4 has seeded their mock data
- Check that user ID matches Project 4's format

### Firebase permission errors
- Verify Firebase rules allow read/write
- Check that API keys are correct

## Documentation

- `INTEGRATION.md` - Integration guide for other teams
- Firebase Console: https://console.firebase.google.com/project/cps714sub3
- Project 4 Mock Users: user1, user2, user3, user4

## Team

Sub-Project 3 Team - Section [Your Section]

## Notes

- This is a **database manipulation layer** - complex UI lives in Project 4
- We **read** from other projects, never write to them
- All hold/reservation logic is self-contained
- System designed for easy integration with other sub-projects

## Assignment Context

CPS714 - Software Project Management  
Assignment #2: Executing, Monitoring, and Closing  
Focus: Integration testing and cross-project collaboration
