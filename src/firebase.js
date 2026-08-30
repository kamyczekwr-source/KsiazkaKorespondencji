import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Te wartości NIE są tajne (to standardowa konfiguracja klienta Firebase),
// ale i tak trzymamy je w zmiennych środowiskowych, żeby łatwo było
// podmieniać projekt bez grzebania w kodzie.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
