/**
 * Cloud Google Sheets & LocalStorage Sync Engine
 * Menghubungkan Google Spreadsheet untuk menyimpan & menyinkronkan seluruh ucapan tamu secara online.
 */

// ==========================================================================
// PENTING: TEMPELKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
// Contoh: "https://script.google.com/macros/s/AKfycbx.../exec"
// ==========================================================================
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzLlL-sbzMhg63AE0ehoJyfMV6oeQ0zwTeQQDbF5d_DdxtK_sTDlKqovvi9Yk1rkQY/exec";

const LOCAL_STORAGE_KEY = 'yusron_zia_wedding_wishes';

const INITIAL_MOCK_WISHES = [
  {
    id: 'mock-1',
    name: 'Budi & Keluarga',
    message: 'Selamat menempuh hidup baru untuk Yusron & Zia! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu sampai kakek nenek! 🤍✨',
    status: 'Hadir',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'mock-2',
    name: 'Siti Rahma',
    message: 'Happy Wedding Yusron & Zia! Ikut terharu dan bahagia banget melihat perjalanan kalian. Lancar-lancar acaranya yaa! 🎉',
    status: 'Hadir',
    timestamp: new Date(Date.now() - 3600000 * 7).toISOString()
  }
];

function getLocalWishes() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_WISHES));
    return INITIAL_MOCK_WISHES;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_WISHES));
      return INITIAL_MOCK_WISHES;
    }
    return parsed;
  } catch (e) {
    return INITIAL_MOCK_WISHES;
  }
}

function saveLocalWish(newWish) {
  const current = getLocalWishes();
  const updated = [newWish, ...current];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

window.WishesService = {
  apiUrl: GOOGLE_SHEETS_API_URL,
  callbacks: [],

  init() {
    this.fetchFromCloud();
  },

  notify(wishes) {
    if (!Array.isArray(wishes) || wishes.length === 0) {
      wishes = getLocalWishes();
    }
    this.callbacks.forEach(cb => {
      try { cb(wishes); } catch (e) { console.error('Wish callback error:', e); }
    });
  },

  subscribe(onUpdateCallback) {
    if (!this.callbacks.includes(onUpdateCallback)) {
      this.callbacks.push(onUpdateCallback);
    }
    onUpdateCallback(getLocalWishes());
    this.fetchFromCloud();

    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== onUpdateCallback);
    };
  },

  async fetchFromCloud() {
    if (!this.apiUrl || this.apiUrl.trim() === '' || this.apiUrl.includes('MASUKKAN_URL')) {
      return;
    }

    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) return;
      const json = await response.json();

      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        const local = getLocalWishes();
        const mergedMap = new Map();

        // Cloud items first
        json.data.forEach(item => {
          const key = `${item.name}_${item.message}`;
          mergedMap.set(key, item);
        });

        // Add any local items
        local.forEach(item => {
          const key = `${item.name}_${item.message}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        });

        const merged = Array.from(mergedMap.values());
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        this.notify(merged);
      }
    } catch (err) {
      console.warn('Gagal memuat dari Google Sheets, menggunakan cache lokal:', err);
    }
  },

  async add(wishData) {
    const wishObject = {
      id: 'wish-' + Date.now(),
      name: wishData.name.trim(),
      message: wishData.message.trim(),
      status: wishData.status || 'Hadir',
      timestamp: new Date().toISOString()
    };

    // 1. Simpan instan ke lokal agar langsung tampil di layar seketika
    const updated = saveLocalWish(wishObject);
    this.notify(updated);

    // 2. Kirim otomatis ke Google Sheets
    if (this.apiUrl && this.apiUrl.trim() !== '' && !this.apiUrl.includes('MASUKKAN_URL')) {
      try {
        await fetch(this.apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wishObject)
        });
      } catch (err) {
        console.warn('Gagal sinkron ke Google Sheets:', err);
      }
    }

    return updated;
  }
};
