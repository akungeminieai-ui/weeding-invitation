/**
 * Firebase Firestore & LocalStorage Real-time Sync Engine
 * Handles saving & live listening of guest wishes and RSVP responses.
 */

// LocalStorage Storage Key (Fallback & instant local cache)
const LOCAL_STORAGE_KEY = 'yusron_zia_wedding_wishes';

// Default initial wishes for pristine look (2 dummy wishes to showcase WhatsApp bubbles)
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

// Helper to get local wishes
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

// Helper to save local wishes
function saveLocalWish(newWish) {
  const current = getLocalWishes();
  const updated = [newWish, ...current];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// Global Wishes Service API
window.WishesService = {
  db: null,
  isFirebaseActive: false,
  callbacks: [],

  // Initialize service
  init(firebaseInstance, dbInstance) {
    if (dbInstance) {
      this.db = dbInstance;
      this.isFirebaseActive = true;
      console.log('🔥 Firebase Firestore connected for real-time wishes!');
    } else {
      console.log('💾 LocalStorage fallback active for wishes & RSVP.');
    }
  },

  // Notify all subscribed listeners
  notify(wishes) {
    if (!Array.isArray(wishes) || wishes.length === 0) {
      wishes = getLocalWishes();
    }
    this.callbacks.forEach(cb => {
      try { cb(wishes); } catch (e) { console.error('Wish callback error:', e); }
    });
  },

  // Subscribe to real-time updates
  subscribe(onUpdateCallback) {
    if (!this.callbacks.includes(onUpdateCallback)) {
      this.callbacks.push(onUpdateCallback);
    }

    if (this.isFirebaseActive && this.db && window.firebaseFirestore) {
      const { collection, query, orderBy, onSnapshot } = window.firebaseFirestore;
      const q = query(collection(this.db, 'wishes'), orderBy('timestamp', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const wishes = [];
        snapshot.forEach((doc) => {
          wishes.push({ id: doc.id, ...doc.data() });
        });
        this.notify(wishes);
      }, (error) => {
        console.warn('Firebase sync error, switching to LocalStorage:', error);
        this.notify(getLocalWishes());
      });
    } else {
      // Immediate trigger with current/initial wishes
      const current = getLocalWishes();
      onUpdateCallback(current);
      
      // Cross-tab storage listener
      const listener = () => this.notify(getLocalWishes());
      window.addEventListener('storage', listener);
      return () => {
        this.callbacks = this.callbacks.filter(cb => cb !== onUpdateCallback);
        window.removeEventListener('storage', listener);
      };
    }
  },

  // Add new wish
  async add(wishData) {
    const wishObject = {
      name: wishData.name.trim(),
      message: wishData.message.trim(),
      status: wishData.status || 'Hadir',
      timestamp: new Date().toISOString()
    };

    if (this.isFirebaseActive && this.db && window.firebaseFirestore) {
      const { collection, addDoc } = window.firebaseFirestore;
      await addDoc(collection(this.db, 'wishes'), wishObject);
    } else {
      // Save to LocalStorage and notify all local listeners immediately
      const updated = saveLocalWish({ id: 'local-' + Date.now(), ...wishObject });
      this.notify(updated);
      try { window.dispatchEvent(new Event('storage')); } catch(e) {}
      return updated;
    }
  }
};
