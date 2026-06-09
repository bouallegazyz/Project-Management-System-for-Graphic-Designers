// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: "bloomworks-e3803.firebaseapp.com",
  projectId: "bloomworks-e3803",
  storageBucket: "bloomworks-e3803.firebasestorage.app",
  messagingSenderId: "211139906348",
  appId: "1:211139906348:web:c8ac1182feed3ff7cdfa89",
  measurementId: "G-F3Q6XEGF2T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
