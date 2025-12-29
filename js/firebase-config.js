// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD0Sm1QCSD7D9pNqeJt5YqFxy3K4H3ZfFE",
    authDomain: "meubatera-6b617.firebaseapp.com",
    projectId: "meubatera-6b617",
    storageBucket: "meubatera-6b617.firebasestorage.app",
    messagingSenderId: "456695382110",
    appId: "1:456695382110:web:ceb16a570a21fac1a434cf",
    measurementId: "G-SSQ9NQW2XW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Persistence (Optional)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.log('Persistence not supported');
    }
});

console.log("Firebase Modular SDK Initialized (v12.7.0)");

// Export services for other modules
export { app, analytics, auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, onSnapshot };
