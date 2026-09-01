// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDyn8s6NtJqOnN_hvWEqoRYbvYbq7TQqO8",
  authDomain: "dragonhunter-2fdb7.firebaseapp.com",
  projectId: "dragonhunter-2fdb7",
  storageBucket: "dragonhunter-2fdb7.firebasestorage.app",
  messagingSenderId: "138293020401",
  appId: "1:138293020401:web:90502b724d0c30aabf4b50"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
