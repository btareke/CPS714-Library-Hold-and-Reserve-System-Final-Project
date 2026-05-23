// Mock data service for development
// This will be replaced with actual API calls when integrating with backend
import { auth, db } from "../firebase-config.js";
import { getFirestore, collection, query, where, setDoc, doc, getDoc, getDocs, limit} from "firebase/firestore/lite";

// Mock catalog items
const realCatalogItems = collection(db, 'items');
await setDoc(doc(realCatalogItems, "1"), 
  {
    
    id: '1',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '978-0262033848',
    type: 'Book',
    status: 'available',
    location: 'Main Library - 3rd Floor'
  });
 await setDoc(doc(realCatalogItems, "2"), {
    id: '2',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    type: 'Book',
    status: 'checked-out',
    location: 'Main Library - 2nd Floor'
  });
  await setDoc(doc(realCatalogItems, "3"), {
    id: '3',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    isbn: '978-0201616224',
    type: 'Book',
    status: 'checked-out',
    location: 'Main Library - 2nd Floor'
  });
  await setDoc(doc(realCatalogItems, "4"), {
    id: '4',
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Gang of Four',
    isbn: '978-0201633610',
    type: 'Book',
    status: 'available',
    location: 'Main Library - 3rd Floor'
  });
  await setDoc(doc(realCatalogItems, "5"), {
    id: '5',
    // eslint-disable-next-line no-script-url
    title: 'JavaScript: The Definitive Guide',
    author: 'David Flanagan',
    isbn: '978-1491952026',
    type: 'Book',
    status: 'checked-out',
    location: 'Main Library - 1st Floor'
  });
  await setDoc(doc(realCatalogItems, "6"), {
    id: '6',
    title: 'React Documentation Video Series',
    author: 'React Team',
    isbn: 'DVD-12345',
    type: 'DVD',
    status: 'available',
    location: 'Media Center - 1st Floor'
  });
  await setDoc(doc(realCatalogItems, "7"), {
    id: '7',
    title: 'System Design Interview',
    author: 'Alex Xu',
    isbn: '978-1736049105',
    type: 'Book',
    status: 'checked-out',
    location: 'Main Library - 3rd Floor'
  });
  await setDoc(doc(realCatalogItems, "8"), {
    id: '8',
    title: 'Cracking the Coding Interview',
    author: 'Gayle Laakmann McDowell',
    isbn: '978-0984782857',
    type: 'Book',
    status: 'available',
    location: 'Main Library - 2nd Floor'
  });

// Mock user holds
const realUserHolds = collection(db, "holds");
await setDoc(doc(realUserHolds, "2") ,
  {
    id: 'hold-1',
    itemId: '2',
    itemTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    itemAuthor: 'Robert C. Martin',
    itemISBN: '978-0132350884',
    datePlaced: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    status: 'Pending',
    queuePosition: 2,
    estimatedAvailableDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  });
  await setDoc(doc(realUserHolds, "5"), {
    id: 'hold-2',
    itemId: '5',
    // eslint-disable-next-line no-script-url
    itemTitle: 'JavaScript: The Definitive Guide',
    itemAuthor: 'David Flanagan',
    itemISBN: '978-1491952026',
    datePlaced: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'Ready for Pickup',
    queuePosition: null,
    estimatedAvailableDate: null
  });

// Mock user reservations
const realUserReservations = collection(db, "reservations");
await setDoc(doc(realUserReservations, "1"),
  {
    id: 'res-1',
    itemId: '1',
    itemTitle: 'Introduction to Algorithms',
    itemAuthor: 'Thomas H. Cormen',
    itemISBN: '978-0262033848',
    dateReserved: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: 'Active',
    pickupLocation: 'Main Library - Front Desk',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  });

// Mock user ID (in real app, this would come from authentication)
// Currently unused but kept for future backend integration
// eslint-disable-next-line no-unused-vars
const MOCK_USER_ID = 'user-123';

// API simulation functions
export const getCatalogItems = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const querySnapshot = await getDocs(realCatalogItems);
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push(doc.data());
  });
  return [...data];
};

export const placeHold = async (itemId) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  const docRef = doc(db, "items", itemId);
  const item = await getDoc(docRef);
  //const item = realCatalogItems.find(i => i.id === itemId);
  if (!item.exists()) {
    return { success: false, message: 'Item not found' };
  }

  if (item.data()?.status === 'available') {
    return { 
      success: false, 
      message: 'Item is currently available. No hold needed - you can check it out directly.' 
    };
  }

  // Check if hold already exists
  //const existingHold = mockUserHolds.find(h => h.itemId === itemId);
  const docRef2 = doc(db, "holds", itemId);
  const hold = await getDoc(docRef2);
  if (hold.exists()) {
    return { 
      success: false, 
      message: 'You already have a hold on this item.' 
    };
  } else {
    await setDoc(docRef2, {
      id: 'hold-' + item.data().id,
      itemId: item.data().id,
      itemTitle: item.data().title,
      itemAuthor: item.data().author,
      itemISBN: item.data().isbn,
      dateReserved: new Date(Date.now()).toISOString(),
      status: 'Ready for Pickup',
      queuePosition: null,
      estimatedAvailableDate: null
    });
    return { 
      success: true, 
      message: `Hold placed successfully! You'll be notified when "${item.data().title}" becomes available.`,
      holdId: `hold-${Date.now()}`
    };
  }

  // In real app, this would make an API call
  // For now, we'll just return success

};

export const placeReservation = async (itemId) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  //const item = realCatalogItems.find(i => i.id === itemId);
  const docRef = doc(db, "items", itemId);
  const item = await getDoc(docRef);
  console.log(item.data().title);
  if (!item.exists()) {
    return { success: false, message: 'Item not found' };
  }

  // Check if reservation already exists
  //const existingReservation = mockUserReservations.find(r => r.itemId === itemId);
  const docRef2 = doc(db, "reservations", itemId);
  const reservation = await getDoc(docRef2);
  if (reservation.exists()) {
    return { 
      success: false, 
      message: 'You already have a reservation on this item.' 
    };
  } else {
    await setDoc(docRef2, {
      id: 'res-' + item.data().id,
      itemId: item.data().id,
      itemTitle: item.data().title,
      itemAuthor: item.data().author,
      itemISBN: item.data().isbn,
      dateReserved: new Date(Date.now()).toISOString(),
      status: 'Active',
      pickupLocation: 'Main Library - Front Desk',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    });
    return { 
      success: true, 
      message: `Reservation placed successfully for "${item.data().title}". You can pick it up at the front desk.`,
      reservationId: `res-${Date.now()}`
    };
  }

  // In real app, this would make an API call

};

export const getUserHolds = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const querySnapshot = await getDocs(realUserHolds);
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push(doc.data());
  });
  return [...data];
};

export const getUserReservations = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const querySnapshot = await getDocs(realUserReservations);
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push(doc.data());
  });
  return [...data];
};

export const getHoldQueuePosition = async (holdId) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  //const hold = mockUserHolds.find(h => h.id === holdId);
  const q = query(realUserHolds, where("id", "==", holdId));
  const hold = await getDoc(q);
  return hold.exists() ? hold.data().queuePosition : null;
};

