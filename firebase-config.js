// Konfigurasi Firebase
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

// ========== UTILITAS ==========

// Hash password dengan SHA-256 (TANPA SALT - SAMA DENGAN LOGIN/REGISTER)
async function hashPassword(password) {
  try {
    // Gunakan Web Crypto API jika tersedia
    if (window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    }
    
    // Fallback jika Web Crypto tidak tersedia
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  } catch (error) {
    console.error('Hash error:', error);
    throw error;
  }
}

// Generate ID unik (SAMA DENGAN INDEX.HTML)
function generateId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
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

// Format tanggal
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
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

// Simpan session (SAMA DENGAN LOGIN/REGISTER)
function saveSession(userData) {
  const sessionData = {
    userId: userData.userId,
    username: userData.username,
    nama: userData.nama,
    balance: userData.balance,
    role: userData.role || 'user',
    loginTime: Date.now()
  };
  
  sessionStorage.setItem('dragonsHunterSession', JSON.stringify(sessionData));
  localStorage.setItem('dragonsHunterSession', JSON.stringify(sessionData));
  
  return sessionData;
}

// Ambil session (SAMA DENGAN LOGIN/REGISTER)
function getSession() {
  try {
    const session = sessionStorage.getItem('dragonsHunterSession');
    if (session) return JSON.parse(session);
    
    // Fallback ke localStorage
    const localSession = localStorage.getItem('dragonsHunterSession');
    if (localSession) return JSON.parse(localSession);
    
    return null;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

// Hapus session
function clearSession() {
  sessionStorage.removeItem('dragonsHunterSession');
  localStorage.removeItem('dragonsHunterSession');
}

// Verifikasi session dengan database
async function verifySession() {
  const session = getSession();
  if (!session || !session.userId) return null;
  
  try {
    const snapshot = await db.ref('users/' + session.userId).once('value');
    if (snapshot.exists()) {
      const userData = snapshot.val();
      // Update balance di session
      session.balance = userData.balance;
      sessionStorage.setItem('dragonsHunterSession', JSON.stringify(session));
      localStorage.setItem('dragonsHunterSession', JSON.stringify(session));
      return session;
    }
    return null;
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

// ========== ANTI DOUBLE CLICK ==========

// Debounce utility
function debounce(func, wait = 1000) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
function throttle(func, limit = 1000) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lock/Unlock button
function lockButton(button) {
  button.disabled = true;
  button.dataset.originalText = button.innerHTML;
  button.innerHTML = '⏳ Proses...';
}

function unlockButton(button) {
  button.disabled = false;
  if (button.dataset.originalText) {
    button.innerHTML = button.dataset.originalText;
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

// Update status transaksi
async function updateTransactionStatus(userId, transactionId, status) {
  await db.ref('transactions/' + userId + '/' + transactionId + '/status').set(status);
}
