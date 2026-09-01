const firebaseConfig = {
  apiKey: "AIzaSyDyn8s6NtJqOnN_hvWEqoRYbvYbq7TQqO8",
  authDomain: "dragonhunter-2fdb7.firebaseapp.com",
  databaseURL: "https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dragonhunter-2fdb7",
  storageBucket: "dragonhunter-2fdb7.firebasestorage.app",
  messagingSenderId: "138293020401",
  appId: "1:138293020401:web:90502b724d0c30aabf4b50"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
