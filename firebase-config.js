// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDyn8s6NtJqOnN_hvWEqoRYbvYbq7TQqO8",
  authDomain: "dragonhunter-2fdb7.firebaseapp.com",
  databaseURL: "https://dragonhunter-2fdb7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dragonhunter-2fdb7",
  storageBucket: "dragonhunter-2fdb7.firebasestorage.app",
  messagingSenderId: "138293020401",
  appId: "1:138293020401:web:90502b724d0c30aabf4b50"
};

// Inisialisasi Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== UTILITAS KONSISTEN ==========

// Hash password dengan SHA-256 + salt (SATU-SATUNYA IMPLEMENTASI)
const PASSWORD_SALT = 'dragons_hunter_salt_2024';

async function hashPassword(password) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + PASSWORD_SALT);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback jika Web Crypto tidak tersedia
    let hash = 0;
    const saltedPassword = password + PASSWORD_SALT;
    for (let i = 0; i < saltedPassword.length; i++) {
      const char = saltedPassword.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  } catch (error) {
    console.error('Hash error:', error);
    throw error;
  }
}

// Generate ID unik
function generateId(prefix = '') {
  return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Validasi username
function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Validasi nomor HP
function validatePhone(phone) {
  return /^[0-9+]{10,15}$/.test(phone);
}

// Format Rupiah
function formatRupiah(amount) {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}

// Format tanggal + waktu
function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ========== SESSION MANAGEMENT ==========

// Simpan session
function saveSession(sessionData) {
  const session = {
    userId: sessionData.userId,
    username: sessionData.username,
    nama: sessionData.nama,
    balance: sessionData.balance,
    role: sessionData.role || 'user',
    loginTime: Date.now(),
    sessionId: generateId('sess_')
  };
  
  sessionStorage.setItem('dragonsHunterSession', JSON.stringify(session));
  localStorage.setItem('dragonsHunterActiveUser', JSON.stringify(session));
  
  return session;
}

// Ambil session
function getSession() {
  try {
    const session = sessionStorage.getItem('dragonsHunterSession');
    if (session) return JSON.parse(session);
    
    const localSession = localStorage.getItem('dragonsHunterActiveUser');
    return localSession ? JSON.parse(localSession) : null;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

// Hapus session
function clearSession() {
  sessionStorage.removeItem('dragonsHunterSession');
  localStorage.removeItem('dragonsHunterActiveUser');
  localStorage.removeItem('dragonsHunterSession');
  sessionStorage.removeItem('dragonsHunterActiveUser');
}

// Verifikasi session dengan database
async function verifySession() {
  const session = getSession();
  if (!session || !session.userId) return null;
  
  try {
    const snapshot = await db.ref('users/' + session.userId).once('value');
    if (snapshot.exists()) {
      const userData = snapshot.val();
      
      // Cek apakah user masih aktif
      if (userData.status === 'banned' || userData.status === 'deleted') {
        clearSession();
        return null;
      }
      
      // Update balance di session
      session.balance = userData.balance;
      session.role = userData.role || 'user';
      
      sessionStorage.setItem('dragonsHunterSession', JSON.stringify(session));
      localStorage.setItem('dragonsHunterActiveUser', JSON.stringify(session));
      
      return session;
    }
    return null;
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

// ========== VALIDASI & KEAMANAN ==========

// Validasi saldo sebelum transaksi
async function validateBalance(userId, amount) {
  const snapshot = await db.ref('users/' + userId + '/balance').once('value');
  const currentBalance = snapshot.val() || 0;
  return currentBalance >= amount;
}

// Log transaksi
async function logTransaction(userId, type, amount, details = {}) {
  const transactionId = generateId('txn_');
  await db.ref('transactions/' + userId + '/' + transactionId).set({
    id: transactionId,
    type: type,
    amount: amount,
    status: 'pending',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    ...details
  });
  return transactionId;
}

// ========== SETUP DEFAULT CONFIG ==========
async function setupDefaultConfig() {
  try {
    const rtpConfig = {
      global: 50,
      hewan: 50,
      naga: 50,
      harimau: 50,
      mode: 'normal',
      maxWin: 500000
    };
    
    await db.ref('config/rtp').set(rtpConfig);
    
    const serverConfig = {
      maintenance: false,
      announcement: 'Selamat datang di Dragons Hunter!'
    };
    
    await db.ref('config/server').set(serverConfig);
    
    // Setup password admin default jika belum ada
    const adminConfigRef = db.ref('adminConfig');
    const adminSnapshot = await adminConfigRef.once('value');
    
    if (!adminSnapshot.exists() || !adminSnapshot.val().passwordHash) {
      const defaultHash = await hashPassword('admin123');
      await adminConfigRef.child('passwordHash').set(defaultHash);
      console.log('✅ Password admin default dibuat: admin123');
    }
    
    console.log('✅ Konfigurasi default berhasil dibuat!');
    return true;
  } catch (error) {
    console.error('❌ Gagal setup config:', error);
    return false;
  }
}

// Auto setup default config saat pertama kali
db.ref('config').once('value').then(snapshot => {
  if (!snapshot.exists()) {
    setupDefaultConfig();
  }
});
