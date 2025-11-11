import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyD_-Nq-oSQ2Qw0dLlNbYQlZ2FMQ1tsDud0",
  authDomain: "shoppos-44bd6.firebaseapp.com",
  databaseURL: "https://shoppos-44bd6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shoppos-44bd6",
  storageBucket: "shoppos-44bd6.firebasestorage.app",
  messagingSenderId: "965750361867",
  appId: "1:965750361867:web:b657fedbce24dc4b001c0e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const database = getDatabase(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

// Connect to emulator in development (optional)
// if (import.meta.env.DEV) {
//   connectFunctionsEmulator(functions, 'localhost', 5001)
// }

export default app
