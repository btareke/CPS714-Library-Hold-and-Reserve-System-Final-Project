// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_r8H-QPDaa0gRTWaj8p6i287iLGLr-Dg",
  authDomain: "cps714sub3.firebaseapp.com",
  projectId: "cps714sub3",
  storageBucket: "cps714sub3.firebasestorage.app",
  messagingSenderId: "360758052196",
  appId: "1:360758052196:web:cf10fc3523a3bca3b12671",
  measurementId: "G-85SS2LD5VM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };