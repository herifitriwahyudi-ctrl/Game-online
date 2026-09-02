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

// ========== UTILITAS ==========

// Hash password dengan SHA-256 + salt (KONSISTEN di semua file)
async function hashPassword(password) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'dragons_hunter_salt_2024');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback jika Web Crypto tidak tersedia
    let hash = 0;
    const saltedPassword = password + 'dragons_hunter_salt_2024';
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

// Format Rupiah
function formatRupiah(amount) {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}

// ========== SESSION MANAGEMENT ==========

// Simpan session
function saveSession(userData) {
  const sessionData = {
    userId: userData.userId,
    username: userData.username,
    nama: userData.nama,
    balance: userData.balance,
    role: userData.role || 'user',
    loginTime: Date.now(),
    sessionId: generateId('sess_')
  };
  
  sessionStorage.setItem('dragonsHunterSession', JSON.stringify(sessionData));
  localStorage.setItem('dragonsHunterActiveUser', JSON.stringify(sessionData));
  
  return sessionData;
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
}

// Verifikasi session dengan database
async function verifySession() {
  const session = getSession();
  if (!session || !session.userId) return null;
  
  // Cek expired (24 jam)
  if (Date.now() - session.loginTime > 24 * 60 * 60 * 1000) {
    clearSession();
    return null;
  }
  
  try {
    const snapshot = await db.ref('users/' + session.userId).once('value');
    if (snapshot.exists()) {
      const userData = snapshot.val();
      session.balance = userData.balance;
      session.role = userData.role || 'user';
      session.status = userData.status || 'active';
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
    
    console.log('✅ Konfigurasi default berhasil dibuat!');
    return true;
  } catch (error) {
    console.error('❌ Gagal setup config:', error);
    return false;
  }
}

// Setup admin password jika belum ada
async function setupAdminPassword() {
  try {
    const snapshot = await db.ref('adminConfig/passwordHash').once('value');
    if (!snapshot.exists()) {
      const hashedPassword = await hashPassword('admin123');
      await db.ref('adminConfig').set({
        passwordHash: hashedPassword,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      console.log('✅ Admin password berhasil disetup! Password: admin123');
    }
  } catch (error) {
    console.error('❌ Gagal setup admin password:', error);
  }
}

// Auto setup default config saat pertama kali
db.ref('config').once('value').then(snapshot => {
  if (!snapshot.exists()) {
    setupDefaultConfig();
  }
});

// Auto setup admin password saat pertama kali
db.ref('adminConfig/passwordHash').once('value').then(snapshot => {
  if (!snapshot.exists()) {
    setupAdminPassword();
  }
});
