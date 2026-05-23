// Using the Firebase Compat SDK so the app runs directly from the file system without CORS errors.

const firebaseConfig = {
  apiKey: "AIzaSyDZrO41T6gz9qnsLqN9EqxiFFKFbZzjIPU",
  authDomain: "limstorepk.firebaseapp.com",
  projectId: "limstorepk",
  storageBucket: "limstorepk.firebasestorage.app",
  messagingSenderId: "215094075559",
  appId: "1:215094075559:web:8751d25ef90b7160d0bb82",
  measurementId: "G-W7RT93PM7C"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();

console.log("🔥 Firebase has been successfully connected to your index.html! 🔥");
console.log("App Instance:", app.name);
